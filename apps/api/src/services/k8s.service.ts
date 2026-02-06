import { KubeConfig, CoreV1Api, AppsV1Api, V1Pod } from "@kubernetes/client-node";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { logger } from "../logger";
import crypto from "crypto";

const execAsync = promisify(exec);

interface StoreStatus {
  status: "PROVISIONING" | "READY" | "FAILED";
  pods: PodStatus[];
  message?: string;
}

interface PodStatus {
  name: string;
  phase: string;
  ready: boolean;
  restarts: number;
}

class K8sService {
  private k8sApi: CoreV1Api | null = null;
  private appsApi: AppsV1Api | null = null;

  constructor() {
    try {
      const kc = new KubeConfig();
      kc.loadFromDefault();
      this.k8sApi = kc.makeApiClient(CoreV1Api);
      this.appsApi = kc.makeApiClient(AppsV1Api);
    } catch (error) {
      logger.warn("Failed to load Kubernetes config. K8s features will be disabled.", error);
    }
  }

  async createNamespace(name: string) {
    if (!this.k8sApi) {
      logger.warn("Skipping namespace creation: No K8s config");
      return;
    }
    try {
      const existing = await this.k8sApi.readNamespace({ name }).catch(() => null);
      
      if (existing) {
        logger.info(`Namespace ${name} already exists, using existing`);
        return;
      }

      await this.k8sApi.createNamespace({
        body: {
          metadata: {
            name: name,
            labels: {
              "managed-by": "shopflow-provisioner",
              "app": "shopflow-store",
            },
          },
        },
      });
      logger.info(`Namespace ${name} created`);
    } catch (err: any) {
      if (err.response && err.response.statusCode === 409) {
        logger.info(`Namespace ${name} already exists (race condition)`);
      } else {
        logger.error(`Error creating namespace ${name}:`, err);
        throw err;
      }
    }
  }

  async deleteNamespace(name: string) {
    if (!this.k8sApi) {
      logger.warn("Skipping namespace deletion: No K8s config");
      return;
    }
    try {
      await this.k8sApi.deleteNamespace({ name });
      logger.info(`Namespace ${name} deleted`);
      
      let attempts = 0;
      const maxAttempts = 60;
      while (attempts < maxAttempts) {
        try {
          await this.k8sApi.readNamespace({ name });
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        } catch (err: any) {
          if (err.response && err.response.statusCode === 404) {
            logger.info(`Namespace ${name} fully deleted`);
            return;
          }
          throw err;
        }
      }
      logger.warn(`Namespace ${name} deletion timeout after ${maxAttempts * 2}s`);
    } catch (err: any) {
      if (err.response && err.response.statusCode === 404) {
        logger.info(`Namespace ${name} not found, skipping delete`);
      } else {
        logger.error(`Error deleting namespace ${name}:`, err);
        throw err;
      }
    }
  }

  generateSecurePassword(length: number = 16): string {
    return crypto.randomBytes(length).toString('base64').slice(0, length);
  }

  async createSecret(namespace: string, secretName: string, data: Record<string, string>) {
    if (!this.k8sApi) {
      logger.warn("Skipping secret creation: No K8s config");
      return;
    }
    
    try {
      const stringData: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        stringData[key] = value;
      }

      await this.k8sApi.createNamespacedSecret({
        namespace,
        body: {
          metadata: {
            name: secretName,
            labels: {
              "managed-by": "shopflow-provisioner",
            },
          },
          type: "Opaque",
          stringData,
        },
      });
      logger.info(`Secret ${secretName} created in namespace ${namespace}`);
    } catch (err: any) {
      if (err.response && err.response.statusCode === 409) {
        logger.info(`Secret ${secretName} already exists`);
      } else {
        logger.error(`Error creating secret ${secretName}:`, err);
        throw err;
      }
    }
  }

  async getStoreStatus(namespace: string): Promise<StoreStatus> {
    if (!this.k8sApi) {
      return { status: "FAILED", pods: [], message: "K8s API not available" };
    }

    try {
      const podsResponse = await this.k8sApi.listNamespacedPod({ namespace });
      const pods = podsResponse.items;

      if (pods.length === 0) {
        return { status: "PROVISIONING", pods: [], message: "No pods found yet" };
      }

      const podStatuses: PodStatus[] = pods.map((pod: V1Pod) => {
        const containerStatuses = pod.status?.containerStatuses || [];
        const ready = containerStatuses.every(cs => cs.ready);
        const restarts = containerStatuses.reduce((sum, cs) => sum + cs.restartCount, 0);

        return {
          name: pod.metadata?.name || "unknown",
          phase: pod.status?.phase || "Unknown",
          ready,
          restarts,
        };
      });

      const allReady = podStatuses.every(ps => ps.ready && ps.phase === "Running");
      const anyFailed = podStatuses.some(ps => ps.phase === "Failed" || ps.restarts > 5);

      if (anyFailed) {
        return { status: "FAILED", pods: podStatuses, message: "One or more pods failed" };
      }

      if (allReady) {
        return { status: "READY", pods: podStatuses, message: "All pods ready" };
      }

      return { status: "PROVISIONING", pods: podStatuses, message: "Waiting for pods" };
    } catch (err: any) {
      logger.error(`Error getting store status for ${namespace}:`, err);
      return { status: "FAILED", pods: [], message: err.message };
    }
  }

  async getPodLogs(namespace: string, podName: string, tailLines: number = 100): Promise<string> {
    if (!this.k8sApi) {
      return "K8s API not available";
    }

    try {
      const logsResponse = await this.k8sApi.readNamespacedPodLog({
        name: podName,
        namespace,
        tailLines,
      });
      return logsResponse;
    } catch (err: any) {
      logger.error(`Error getting logs for pod ${podName}:`, err);
      return `Error: ${err.message}`;
    }
  }

  async checkHelmRelease(releaseName: string, namespace: string): Promise<boolean> {
    try {
      const command = `helm status ${releaseName} -n ${namespace}`;
      await execAsync(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  async installWooCommerce(
    releaseName: string,
    namespace: string,
    domain: string,
    dbPassword?: string,
    dbRootPassword?: string
  ) {
    const chartPath = path.resolve(__dirname, "../../helm/woocommerce");

    if (!fs.existsSync(chartPath)) {
      throw new Error(`Helm chart not found at ${chartPath}`);
    }

    const existingRelease = await this.checkHelmRelease(releaseName, namespace);
    if (existingRelease) {
      logger.info(`Helm release ${releaseName} already exists, upgrading`);
    }

    const dbPass = dbPassword || this.generateSecurePassword();
    const dbRootPass = dbRootPassword || this.generateSecurePassword();

    // Sanitize release name for Helm (no spaces, lowercase, only hyphens)
    const sanitizedReleaseName = releaseName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const command = `helm upgrade --install "${sanitizedReleaseName}" "${chartPath}" \
      --namespace ${namespace} \
      --set ingress.host=${domain} \
      --set mariadb.auth.password=${dbPass} \
      --set mariadb.auth.rootPassword=${dbRootPass} \
      --values "${chartPath}/values-local.yaml" \
      --wait --timeout 10m`;

    logger.info(`Executing Helm: helm upgrade --install "${sanitizedReleaseName}"...`);

    try {
      const { stdout, stderr } = await execAsync(command);
      logger.info(`Helm install output: ${stdout}`);
      if (stderr) logger.warn(`Helm stderr: ${stderr}`);
      return { success: true, dbPassword: dbPass, dbRootPassword: dbRootPass };
    } catch (error: any) {
      logger.error(`Helm install failed:`, error);
      throw error;
    }
  }

  async installMedusa(
    releaseName: string,
    namespace: string,
    domain: string,
    dbPassword?: string
  ) {
    const chartPath = path.resolve(__dirname, "../../helm/medusa");

    if (!fs.existsSync(chartPath)) {
      throw new Error(`Helm chart not found at ${chartPath}`);
    }

    const existingRelease = await this.checkHelmRelease(releaseName, namespace);
    if (existingRelease) {
      logger.info(`Helm release ${releaseName} already exists, upgrading`);
    }

    const dbPass = dbPassword || this.generateSecurePassword();

    const sanitizedReleaseName = releaseName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const command = `helm upgrade --install "${sanitizedReleaseName}" "${chartPath}" \
      --namespace ${namespace} \
      --set ingress.host=${domain} \
      --set postgresql.auth.password=${dbPass} \
      --values "${chartPath}/values-local.yaml" \
      --wait --timeout 10m`;

    logger.info(`Executing Helm: helm upgrade --install "${sanitizedReleaseName}" (Medusa)...`);

    try {
      const { stdout, stderr } = await execAsync(command);
      logger.info(`Helm install output: ${stdout}`);
      if (stderr) logger.warn(`Helm stderr: ${stderr}`);
      return { success: true, dbPassword: dbPass };
    } catch (error: any) {
      logger.error(`Helm install failed:`, error);
      throw error;
    }
  }

  async uninstallHelmRelease(releaseName: string, namespace: string) {
    try {
      const command = `helm uninstall ${releaseName} -n ${namespace}`;
      logger.info(`Uninstalling Helm release: ${releaseName}`);
      const { stdout, stderr } = await execAsync(command);
      logger.info(`Helm uninstall output: ${stdout}`);
      if (stderr) logger.warn(`Helm stderr: ${stderr}`);
      return true;
    } catch (error: any) {
      if (error.message.includes("not found")) {
        logger.info(`Helm release ${releaseName} not found, skipping`);
        return true;
      }
      logger.error(`Helm uninstall failed:`, error);
      throw error;
    }
  }
}

export const k8sService = new K8sService();
