import { KubeConfig, CoreV1Api } from "@kubernetes/client-node";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { logger } from "../logger";

const execAsync = promisify(exec);

class K8sService {
  private k8sApi: CoreV1Api | null = null;

  constructor() {
    try {
      const kc = new KubeConfig();
      kc.loadFromDefault();
      this.k8sApi = kc.makeApiClient(CoreV1Api);
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
      await this.k8sApi.createNamespace({
        body: {
          metadata: {
            name: name,
            labels: {
              "managed-by": "cloudly-provisioner",
            },
          },
        }
      });
      logger.info(`Namespace ${name} created`);
    } catch (err: any) {
      if (err.response && err.response.statusCode === 409) {
        logger.info(`Namespace ${name} already exists`);
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
    } catch (err: any) {
       if (err.response && err.response.statusCode === 404) {
        logger.info(`Namespace ${name} not found, skipping delete`);
      } else {
        logger.error(`Error deleting namespace ${name}:`, err);
        throw err;
      }
    }
  }

  async installWooCommerce(releaseName: string, namespace: string, domain: string) {
    const chartPath = path.resolve(__dirname, "../../helm/woocommerce");
    
    // Ensure chart exists
    if (!fs.existsSync(chartPath)) {
      throw new Error(`Helm chart not found at ${chartPath}`);
    }

    const command = `helm upgrade --install ${releaseName} ${chartPath} \
      --namespace ${namespace} \
      --set ingress.host=${domain} \
      --wait --timeout 5m`;

    logger.info(`Executing Helm: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command);
      logger.info(`Helm install output: ${stdout}`);
      if (stderr) logger.warn(`Helm stderr: ${stderr}`);
      return true;
    } catch (error) {
      logger.error(`Helm install failed:`, error);
      throw error;
    }
  }
}

export const k8sService = new K8sService();
