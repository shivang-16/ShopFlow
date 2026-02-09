import { KubeConfig, CoreV1Api, AppsV1Api, BatchV1Api, V1Pod } from "@kubernetes/client-node";
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
  private batchApi: BatchV1Api | null = null;
  private k8sConfig: KubeConfig;

  constructor() {
    this.k8sConfig = new KubeConfig();
    try {
      this.k8sConfig.loadFromDefault();
      this.k8sApi = this.k8sConfig.makeApiClient(CoreV1Api);
      this.appsApi = this.k8sConfig.makeApiClient(AppsV1Api);
      this.batchApi = this.k8sConfig.makeApiClient(BatchV1Api);
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
    logger.info(`[K8S STATUS] Starting status check for namespace: ${namespace}`);
    
    if (!this.k8sApi) {
      logger.error(`[K8S STATUS] K8s API not available!`);
      return { status: "FAILED", pods: [], message: "K8s API not available" };
    }

    try {
      logger.info(`[K8S STATUS] Fetching pods from namespace: ${namespace}`);
      const podsResponse = await this.k8sApi.listNamespacedPod({ namespace });
      const pods = podsResponse.items;
      logger.info(`[K8S STATUS] Found ${pods.length} pods in namespace`);

      if (pods.length === 0) {
        logger.warn(`[K8S STATUS] No pods found yet in namespace ${namespace}`);
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

      logger.info(`[K8S STATUS] Pod statuses: ${JSON.stringify(podStatuses)}`);

      const runningPods = podStatuses.filter(ps => ps.phase === "Running" || ps.phase === "Succeeded");
      const allRunning = pods.length > 0 && runningPods.length === pods.length;
      const allReady = runningPods.length > 0 && runningPods.every(ps => 
        (ps.phase === "Running" && ps.ready) || ps.phase === "Succeeded"
      );
      const anyFailed = podStatuses.some(ps => ps.phase === "Failed" || ps.restarts > 10);

      logger.info(`[K8S STATUS] Analysis - allRunning: ${allRunning}, allReady: ${allReady}, anyFailed: ${anyFailed}`);

      if (anyFailed) {
        logger.warn(`[K8S STATUS] ❌ FAILED - One or more pods failed`);
        return { status: "FAILED", pods: podStatuses, message: "One or more pods failed" };
      }

      if (allReady) {
        logger.info(`[K8S STATUS] ✅ READY - All pods ready (readiness passed)`);
        return { status: "READY", pods: podStatuses, message: "All pods ready" };
      }

      // Fallback: if all pods are running (even if readiness probe hasn't passed yet)
      if (allRunning) {
        logger.info(`[K8S STATUS] ✅ READY - All pods running (readiness pending)`);
        return { status: "READY", pods: podStatuses, message: "All pods running (readiness pending)" };
      }

      logger.info(`[K8S STATUS] ⏳ PROVISIONING - Waiting for pods`);
      return { status: "PROVISIONING", pods: podStatuses, message: "Waiting for pods" };
    } catch (err: any) {
      logger.error(`[K8S STATUS] ❌ Error getting store status for ${namespace}:`, err);
      return { status: "FAILED", pods: [], message: err.message };
    }
  }

  async getStoreNodePort(storeName: string, namespace: string, storeType?: string): Promise<number | null> {
    if (!this.k8sApi) {
      return null;
    }

    try {
      // Determine service names based on store type
      const serviceNames = [];
      if (storeType === "WOOCOMMERCE") {
        serviceNames.push(`${storeName}-wordpress`);
      } else if (storeType === "MEDUSA") {
        serviceNames.push(`${storeName}-medusa`);
      } else {
        // Try both if type not specified
        serviceNames.push(`${storeName}-wordpress`, `${storeName}-medusa`);
      }
      
      for (const serviceName of serviceNames) {
        try {
          const serviceResponse = await this.k8sApi.readNamespacedService({ name: serviceName, namespace });
          const service = serviceResponse;
          
          if (service.spec?.type === "NodePort" && service.spec.ports && service.spec.ports.length > 0) {
            const nodePort = service.spec.ports[0].nodePort || null;
            logger.info(`Found NodePort ${nodePort} for ${serviceName} in namespace ${namespace}`);
            return nodePort;
          }
        } catch (err: any) {
          // Service not found, try next one
          continue;
        }
      }
      
      logger.warn(`No NodePort service found for ${storeName} in namespace ${namespace}`);
      return null;
    } catch (err: any) {
      logger.error(`Error getting NodePort for ${storeName}:`, err);
      return null;
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

  async getStorePods(namespace: string): Promise<Array<{ name: string; type: string; status: string }>> {
    if (!this.k8sApi) {
      return [];
    }

    try {
      const podsResponse = await this.k8sApi.listNamespacedPod({ namespace });
      return podsResponse.items.map((pod) => ({
        name: pod.metadata?.name || "unknown",
        type: pod.metadata?.name?.includes("wordpress") ? "wordpress" : 
              pod.metadata?.name?.includes("mariadb") ? "mariadb" :
              pod.metadata?.name?.includes("setup") ? "setup-job" : "other",
        status: pod.status?.phase || "Unknown"
      }));
    } catch (err: any) {
      logger.error(`Error listing pods in ${namespace}:`, err);
      return [];
    }
  }

  async getJobLogs(namespace: string, jobName: string, tailLines: number = 200): Promise<string> {
    if (!this.k8sApi) {
      return "K8s API not available";
    }

    try {
      // Get pods created by the job
      const podsResponse = await this.k8sApi.listNamespacedPod({
        namespace,
        labelSelector: `job-name=${jobName}`
      });

      if (podsResponse.items.length === 0) {
        return "No pods found for this job. Job may have been cleaned up.";
      }

      // Get logs from the latest pod
      const latestPod = podsResponse.items[podsResponse.items.length - 1];
      const podName = latestPod.metadata?.name;

      if (!podName) {
        return "Could not find pod name";
      }

      const logsResponse = await this.k8sApi.readNamespacedPodLog({
        name: podName,
        namespace,
        tailLines,
      });

      return logsResponse;
    } catch (err: any) {
      logger.error(`Error getting job logs for ${jobName}:`, err);
      return `Error: ${err.message}`;
    }
  }

  async updateWordPressSiteUrl(namespace: string, releaseName: string, siteUrl: string): Promise<void> {
    if (!this.k8sApi) {
      throw new Error("Kubernetes API not available");
    }

    const sanitizedReleaseName = releaseName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const jobName = `wp-url-update-${Date.now()}`;

    const jobSpec = {
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: jobName,
        namespace: namespace,
      },
      spec: {
        ttlSecondsAfterFinished: 60,
        backoffLimit: 2,
        template: {
          spec: {
            securityContext: {
              runAsUser: 0,
              runAsGroup: 0,
            },
            restartPolicy: 'Never',
            containers: [
              {
                name: 'wp-update',
                image: 'wordpress:cli-php8.1',
                command: ['/bin/sh', '-c'],
                args: [
                  `wp option update home "${siteUrl}" --path=/var/www/html --allow-root && wp option update siteurl "${siteUrl}" --path=/var/www/html --allow-root && echo "WordPress URLs updated successfully"`
                ],
                env: [
                  { name: 'WORDPRESS_DB_HOST', value: `${sanitizedReleaseName}-mariadb` },
                  {
                    name: 'WORDPRESS_DB_NAME',
                    valueFrom: {
                      secretKeyRef: {
                        name: `${sanitizedReleaseName}-db-secret`,
                        key: 'mariadb-database',
                      },
                    },
                  },
                  {
                    name: 'WORDPRESS_DB_USER',
                    valueFrom: {
                      secretKeyRef: {
                        name: `${sanitizedReleaseName}-db-secret`,
                        key: 'mariadb-user',
                      },
                    },
                  },
                  {
                    name: 'WORDPRESS_DB_PASSWORD',
                    valueFrom: {
                      secretKeyRef: {
                        name: `${sanitizedReleaseName}-db-secret`,
                        key: 'mariadb-password',
                      },
                    },
                  },
                ],
                volumeMounts: [
                  {
                    name: 'wordpress-data',
                    mountPath: '/var/www/html',
                  },
                ],
              },
            ],
            volumes: [
              {
                name: 'wordpress-data',
                persistentVolumeClaim: {
                  claimName: `${sanitizedReleaseName}-wordpress-pvc`,
                },
              },
            ],
          },
        },
      },
    };

    try {
      logger.info(`Updating WordPress site URL to: ${siteUrl}`);

      const batchClient = this.k8sConfig.makeApiClient(BatchV1Api);

      await batchClient.createNamespacedJob({ namespace, body: jobSpec as any });

      for (let i = 0; i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        try {
          const jobStatus = await batchClient.readNamespacedJobStatus({ name: jobName, namespace });
          if (jobStatus.status?.succeeded && jobStatus.status.succeeded > 0) {
            logger.info(`WordPress site URL updated successfully`);
            return;
          }
          if (jobStatus.status?.failed && jobStatus.status.failed > 2) {
            throw new Error("Job failed after multiple attempts");
          }
        } catch (err: any) {
          if (i === 29) throw err;
        }
      }

      logger.warn("Job did not complete in time, but store is still usable");
    } catch (err: any) {
      logger.error(`Error updating WordPress site URL:`, err);
      throw err;
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
    dbRootPassword?: string,
    wpAdminPassword?: string,
    storeTitle?: string
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
    const wpPass = wpAdminPassword || this.generateSecurePassword(16);

    // Sanitize release name for Helm (no spaces, lowercase, only hyphens)
    const sanitizedReleaseName = releaseName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const title = storeTitle || sanitizedReleaseName;
    
    const command = `helm upgrade --install "${sanitizedReleaseName}" "${chartPath}" \
      --namespace ${namespace} \
      --set ingress.enabled=true \
      --set ingress.host=${domain} \
      --set ingress.tls.enabled=true \
      --set ingress.tls.secretName=${sanitizedReleaseName}-tls \
      --set wordpress.service.type=ClusterIP \
      --set mariadb.auth.password=${dbPass} \
      --set mariadb.auth.rootPassword=${dbRootPass} \
      --set wordpress.adminPassword=${wpPass} \
      --set wordpress.storeTitle="${title}" \
      --values "${chartPath}/values-local.yaml"`;


    logger.info(`Executing Helm: helm upgrade --install "${sanitizedReleaseName}" (WooCommerce)... [NO WAIT - async deployment]`);

    try {
      const { stdout, stderr } = await execAsync(command);
      logger.info(`Helm install output: ${stdout}`);
      if (stderr) logger.warn(`Helm stderr: ${stderr}`);
      return { success: true, dbPassword: dbPass, dbRootPassword: dbRootPass, wpAdminPassword: wpPass };
    } catch (error: any) {
      logger.error(`Helm install failed:`, error);
      throw error;
    }
  }

  async installMedusa(
    releaseName: string,
    namespace: string,
    domain: string,
    dbPassword?: string,
    adminPassword?: string,
    adminEmail?: string
  ) {
    const chartPath = path.resolve(__dirname, "../../helm/medusa");

    if (!fs.existsSync(chartPath)) {
      throw new Error(`Helm chart not found at ${chartPath}`);
    }

    const existingRelease = await this.checkHelmRelease(releaseName, namespace);
    if (existingRelease) {
      logger.info(`Helm release ${releaseName} already exists, upgrading`);
    }

    const sanitizedReleaseName = releaseName
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    const isProduction = process.env.NODE_ENV === 'production';
    const valuesFile = isProduction ? 'values-prod.yaml' : 'values-local.yaml';

    let command = `helm upgrade --install "${sanitizedReleaseName}" "${chartPath}" \
      --namespace ${namespace} \
      --timeout 10m0s \
      --set ingress.enabled=false \
      --set medusa.service.type=NodePort`;

    
    if (dbPassword) {
      command += ` \\\n      --set postgresql.auth.password="${dbPassword}"`;
    }
    
    if (adminPassword) {
      command += ` \\\n      --set medusa.adminPassword="${adminPassword}"`;
    }
    
    if (adminEmail) {
      command += ` \\\n      --set medusa.adminEmail="${adminEmail}"`;
    }
    
    command += ` \\\n      --values "${chartPath}/${valuesFile}"`;

    logger.info(`Executing Helm: helm upgrade --install "${sanitizedReleaseName}" (Medusa)... [NO WAIT - async deployment]`);

    try {
      const { stdout, stderr } = await execAsync(command);
      logger.info(`Helm install output: ${stdout}`);
      if (stderr) logger.warn(`Helm stderr: ${stderr}`);
      
      // Check if release was actually created
      await new Promise(resolve => setTimeout(resolve, 2000));
      const releaseCheck = await this.checkHelmRelease(sanitizedReleaseName, namespace);
      if (!releaseCheck) {
        throw new Error(`Helm release ${sanitizedReleaseName} was not created successfully`);
      }
      
      logger.info(`✅ Helm release ${sanitizedReleaseName} created successfully in namespace ${namespace}`);
      return { success: true };
    } catch (error: any) {
      logger.error(`❌ Helm install FAILED for ${sanitizedReleaseName}:`, error.message);
      logger.error(`Full error:`, error);
      throw error;
    }
  }

  async getNodePort(namespace: string, releaseName: string): Promise<number> {
    try {
      const k8sApi = this.k8sConfig.makeApiClient(CoreV1Api);
      const serviceName = `${releaseName}-medusa`;
      const res = await k8sApi.readNamespacedService({ name: serviceName, namespace });
      const nodePort = res.spec?.ports?.[0]?.nodePort;
      
      if (!nodePort) {
        throw new Error(`NodePort not found for service ${serviceName}`);
      }
      
      return nodePort;
    } catch (error: any) {
      logger.error(`Failed to get NodePort for ${releaseName}:`, error);
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

  async verifyNamespaceResources(namespace: string): Promise<{
    deployments: number;
    pods: number;
    services: number;
    secrets: number;
    jobs: number;
  }> {
    if (!this.k8sApi || !this.appsApi || !this.batchApi) {
      logger.warn("K8s API clients not available for resource verification");
      return { deployments: 0, pods: 0, services: 0, secrets: 0, jobs: 0 };
    }

    try {
      const [deployments, pods, services, secrets, jobs] = await Promise.all([
        this.appsApi.listNamespacedDeployment({ namespace }).catch(() => ({ items: [] })),
        this.k8sApi.listNamespacedPod({ namespace }).catch(() => ({ items: [] })),
        this.k8sApi.listNamespacedService({ namespace }).catch(() => ({ items: [] })),
        this.k8sApi.listNamespacedSecret({ namespace }).catch(() => ({ items: [] })),
        this.batchApi.listNamespacedJob({ namespace }).catch(() => ({ items: [] }))
      ]);

      const result = {
        deployments: deployments.items?.length || 0,
        pods: pods.items?.length || 0,
        services: services.items?.length || 0,
        secrets: secrets.items?.length || 0,
        jobs: jobs.items?.length || 0
      };

      logger.info(`[VERIFY] Namespace ${namespace} has: ${result.deployments} deployments, ${result.pods} pods, ${result.services} services, ${result.secrets} secrets, ${result.jobs} jobs`);
      return result;
    } catch (err: any) {
      logger.error(`Error verifying namespace resources:`, err);
      return { deployments: 0, pods: 0, services: 0, secrets: 0, jobs: 0 };
    }
  }
}

export const k8sService = new K8sService();
