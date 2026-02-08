# ShopFlow - Kubernetes Store Orchestration Platform

ShopFlow is a "store provisioning platform" that runs on Kubernetes (local & production). It allows users to provision, manage, and scale e-commerce stores (WooCommerce & MedusaJS) instantly via a React dashboard.

![Dashboard Screenshot](https://via.placeholder.com/800x400?text=ShopFlow+Dashboard)

## 🚀 Features

- **Multi-Engine Support**: Provision **WooCommerce** (WordPress + MariaDB) or **MedusaJS** (Node.js + Postgres + Redis) stores.
- **Kubernetes Native**: Uses Helm charts, Deployments, StatefulSets, PVCs, and Ingress.
- **Isolation**: Each store runs in its own Kubernetes namespace with ResourceQuotas and NetworkPolicies.
- **Production Ready**: Deploys to AWS EC2 (k3s) with real DNS and Let's Encrypt SSL.
- **Abuse Prevention**: Rate limiting (IP & User-based), per-user quotas, and audit logging.
- **Self-Healing**: Automated readiness/liveness probes and state reconciliation.

---

## 🛠️ Architecture & System Design

### **Architecture Choice**
The system follows a **Control Plane** architecture pattern:

1. **Dashboard (React)**: User interface for managing stores.
2. **API (Express/Node.js)**: Acts as the "Store Controller". It talks to the Kubernetes API server to orchestrate resources.
3. **Kubernetes Cluster**:
   - **Ingress Controller (Nginx)**: Routes traffic to specific stores based on subdomains (`store-1.shopflow.com`).
   - **Namespaces**: One namespace per store for strong isolation.
   - **Helm**: Used as the templating engine to deploy standardized store blueprints.

### **Idempotency & Failure Handling**
- **Idempotent Provisioning**: The API checks if a namespace/release exists before creating. Re-running a provision command is safe.
- **Atomic Operations**: Database creation and Helm installs are sequenced. If a step fails, the system reports the specific failure state ("PROVISIONING" -> "FAILED").
- **Cleanup**: Deleting a store removes the entire namespace, ensuring 100% resource cleanup (PVCs, Secrets, Services).

### **Production vs. Local Differences**

| Feature | Local (Kind/Minikube) | Production (AWS EC2 + k3s) |
|---------|----------------------|----------------------------|
| **Ingress** | `*.local.test` (via `/etc/hosts`) | Real DNS (`*.yourdomain.com`) |
| **Storage** | `standard` / `hostPath` | `local-path` (k3s) or EBS (EKS) |
| **Secrets** | Plain text / simple secrets | External Secrets / Encrypted |
| **Scaling** | Single replica | Horizontal Pod Autoscaling (HPA) |
| **Values** | `values-local.yaml` | `values-prod.yaml` |

---

## 💻 Local Setup Instructions

### Prerequisites
- Node.js & pnpm
- Docker
- Kubernetes Cluster (Kind, Minikube, or Docker Desktop K8s)
- Helm 3
- `kubectl` configured

### 1. Start Local Cluster & Ingress
```bash
# Using Kind (example)
kind create cluster --config k8s/kind-config.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
```

### 2. Install Dependencies
```bash
# Root directory
pnpm install
```

### 3. Configure Environment
Create `.env` in `apps/api`:
```bash
PORT=4001
FRONTEND_URL=http://localhost:3000
KUBECONFIG_PATH=~/.kube/config
```

Create `.env.local` in `apps/web`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

### 4. Run Development Server
```bash
pnpm dev
# Frontend: http://localhost:3000
# API: http://localhost:4001
```

### 5. Local DNS (Important!)
Add these entries to your `/etc/hosts`:
```
127.0.0.1 shopflow.local
127.0.0.1 store-1.shopflow.local
127.0.0.1 store-2.shopflow.local
```

---

## ☁️ VPS / Production Setup (k3s on EC2)

### 1. Provision Server
- Launch an Ubuntu EC2 instance (t3.large or larger recommended).
- Allow ports: 80, 443, 6443, 30000-32767.

### 2. Install k3s
```bash
curl -sfL https://get.k3s.io | sh -
# Get kubeconfig
sudo cat /etc/rancher/k3s/k3s.yaml
```

### 3. Setup DNS
Point your domain (e.g., `*.yourdomain.com`) to the EC2 IP address.

### 4. Deploy API & Frontend
You can use the provided GitHub Actions workflow or deploy manually.
```bash
# Apply RBAC for API
kubectl apply -f k8s/rbac.yaml

# Deploy API
kubectl apply -f k8s/api-deployment.yaml
```

### 5. Configure API for Production
Update `apps/api/helm/*/values-prod.yaml` with your domain:
```yaml
ingress:
  host: "store-name.yourdomain.com"
```

---

## 🛒 How to Create a Store & Place Order

1. **Create Store**:
   - Go to Dashboard -> Click "Create Store".
   - Select Type: "WooCommerce" or "Medusa".
   - Enter Name: "My Awesome Store".
   - Click "Create".
   - Status will go from **Provisioning** (yellow) -> **Ready** (green).

2. **Access Store**:
   - Click the "URL" link in the dashboard.
   - **WooCommerce**: Log in with `admin` / `password` (shown in dashboard).
   - **Medusa**: Use the storefront URL.

3. **Place Order**:
   - Browse products.
   - Add to Cart.
   - Checkout (Cash on Delivery enabled by default).
   - Verify order in Admin Panel.

---

## 📂 Source Code Structure

- **`apps/web`**: Next.js 14 Dashboard (Frontend).
- **`apps/api`**: Express.js Control Plane (Backend).
  - `src/services/k8s.service.ts`: Core logic for Helm/K8s orchestration.
  - `src/controllers/store.controller.ts`: Store management logic.
  - `helm/`: Helm charts for store blueprints.
- **`k8s/`**: Kubernetes manifests for the platform itself.

---

## ☸️ Helm Charts

Located in `apps/api/helm/`:

### **WooCommerce Chart**
- **WordPress Container**: PHP-FPM + Apache.
- **MariaDB Container**: Persistent database.
- **Values**:
  - `values-local.yaml`: Disables heavy probes, uses minimal resources.
  - `values-prod.yaml`: Enable readiness probes, higher resource limits.

### **Medusa Chart**
- **Medusa Server**: Node.js backend.
- **Postgres**: Main database.
- **Redis**: Event bus / cache.
- **Worker**: Background job processor.

---

## 🛡️ Security & Scalability

- **RBAC**: API runs with a restricted ServiceAccount.
- **Rate Limiting**: 20 req/min per user, 5 req/min for create operations.
- **Network Policies**: Stores are isolated in their own namespaces.
- **Horizontal Scaling**: API is stateless and can be scaled (HPA).
