# ShopFlow: Multi-Tenant E-commerce Provisioning Platform

ShopFlow is a robust, Kubernetes-native platform that enables users to instantly provision, manage, and scale E-commerce stores. It supports two major platforms: **WooCommerce** (WordPress) and **MedusaJS**.

Start your own store in seconds, with dedicated resources, automated setup, and production-grade reliability.

**Live:** [https://shop-flow-web-olive.vercel.app/](https://shop-flow-web-olive.vercel.app/)

### 🚀 Sample Stores (Running Live on K3s)
*   **WooCommerce Store:** [https://seventen.shivangyadav.com/](https://seventen.shivangyadav.com/?post_type=product)
    *   **Admin Access:** Username: `admin`, Password: `sMq80HsbtUhRGLZm` 
*   **Medusa Admin Dashboard:** [http://43.205.194.216:32165/app/login](http://43.205.194.216:32165/app/login)
    *   **Email:** `admin@medusa.local`
    *   **Password:** `phWq9GDIEukFP1N5`

<img width="1707" height="881" alt="Screenshot 2026-02-09 at 5 37 35 PM" src="https://github.com/user-attachments/assets/b2c94f8f-50a7-48ae-a54f-6f8c75685ec1" />

---

## ✨ Key Features

*   **Multi-Tenancy & Isolation:** Each store runs in its own Kubernetes Namespace with strict **ResourceQuotas** and **NetworkPolicies** to prevent noisy neighbors.
*   **Fully Automated Provisioning:** One click triggers a complete setup including Database (MySQL/Postgres), Redis, App Server, and Storage.
*   **Secure Authentication:** Powered by **Clerk** for seamless user management and SSO.
*   **Production Ready:**
    *   **Domain Management:** Automatic subdomain assignment (`store-name.shivangyadav.com`).
    *   **Resilience:** Self-healing reconciliation service that recovers stuck deployments on restart.
    *   **Resource Management:** Smart limits (CPU/RAM) tailored for small-node clusters (e.g., EC2 t3.medium).
*   **Dual Platform Support:**
    *   **WooCommerce:** Full WordPress setup with auto-configured products, posts, and COD payment method.
    *   **MedusaJS:** Modern headless commerce backend with a dedicated Admin dashboard.

---

## 🛍️ Supported Platforms

### 1. WooCommerce (Fully Implemented)
A complete, ready-to-sell store out of the box.
*   **Version:** Latest WordPress + WooCommerce.
*   **Automation:**
    *   **Auto-Login:** Admin credentials generated and securely stored.
    *   **Pre-Seeded Content:** Automatically creates sample products ("T-Shirt", "Jeans") and blog posts upon installation.
    *   **Payment Gateway:** Cash on Delivery (COD) enabled by default.
    *   **Configuration:** Site URL and Permalink structure automatically updated to match the assigned subdomain.
*   **Tech Stack:** WordPress Container + MariaDB + Persistent Volume Claims.

### 2. MedusaJS (Headless Commerce)
A developer-friendly, API-first commerce engine.
*   **Components:**
    *   **Medusa Backend:** The core API server.
    *   **Medusa Admin:** A dashboard for managing products, orders, and customers.
    *   **PostgreSQL:** Dedicated database for store data.
    *   **Redis:** For event handling and caching.
    *   **Stack:** Built on `ghcr.io/shivang-16/shopflow-medusa:latest` (Custom optimized image).
*   **Access:** Users get a direct link to the Admin Dashboard to start managing their inventory immediately.

---

## 🛠️ Local Development Setup

Follow these steps to run ShopFlow on your local machine using **Kind** (Kubernetes in Docker).

### Prerequisites
*   Node.js (v18+) & pnpm
*   Docker Desktop
*   **Kind** (`brew install kind`)
*   Helm (v3+)
*   Kubectl

### Steps

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/shivang-16/shopflow
    cd shopflow
    ```

2.  **Install Dependencies**
    ```bash
    pnpm install
    ```

3.  **Start Local Kubernetes Cluster**
    ```bash
    kind create cluster --name shopflow
    kubectl cluster-info --context kind-shopflow
    ```

4.  **Configure Environment Variables**

    **Backend (`apps/api/.env`):**
    ```env
    DATABASE_URL="postgresql://user:pass@endpoint:5432/postgres" # Use Supabase/Local
    PORT=4001
    FRONTEND_URL="http://localhost:3000"
    
    # Clerk Auth
    CLERK_PUBLISHABLE_KEY=pk_test_...
    CLERK_SECRET_KEY=sk_test_...

    # Redis (For Job Queues)
    REDIS_URL="rediss://default:pass@redis-endpoint:port"
    
    # K8s Config
    DOCKER_USERNAME="your-docker-user"
    PUBLIC_IP="127.0.0.1" # For local testing
    NODE_ENV="development"
    ```

    **Frontend (`apps/web/.env.local`):**
    ```env
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
    CLERK_SECRET_KEY=sk_test_...
    
    # Clerk Routes
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/

    # API Endpoint
    NEXT_PUBLIC_API_BASE_URL="http://localhost:4001"
    ```

5.  **Run Database Migrations**
    ```bash
    cd apps/api
    npx prisma migrate dev
    ```

6.  **Start the Development Servers**
    ```bash
    # From root
    pnpm dev
    ```
    *   **Frontend:** http://localhost:3000
    *   **Backend:** http://localhost:4001

---

## ☁️ Production Deployment (EC2 + K3s)

This section details how I deployed ShopFlow to a production AWS EC2 instance (Ubuntu t3.medium).

### 1. Infrastructure Setup
*   **OS:** Ubuntu 22.04 LTS
*   **Cluster:** **K3s** (Lightweight Kubernetes).
    ```bash
    curl -sfL https://get.k3s.io | sh -
    # K3s uses very low resources (~500MB RAM), perfect for small nodes.
    ```
*   **Storage:** Local Path Provisioner (Default in K3s) handles dynamic PVC creation.
*   **Public IP:** `43.205.194.216` (Elastic IP attached to EC2).
*   **DNS:** Wildcard A record (`*.shivangyadav.com`) points to `43.205.194.216`.

### 2. Medusa Custom Image
Since Medusa requires build steps, I created a custom Docker image optimized for this platform.
*   **Docker Image:** `ghcr.io/shivang-16/shopflow-medusa:latest`
*   **Optimizations:**
    *   Pre-built admin dashboard to save boot time.
    *   Running in production mode (`npm run start`).
    *   Includes `cnpg` and migrations script for auto-seeding.

### 3. Domain Strategy & Traffic Routing

We use a hybrid approach to expose stores based on platform compatibility.

#### 🛒 WooCommerce: Dedicated Subdomains (Ingress)
WooCommerce is fully compatible with host-based routing.
*   **Method:** We use **ClusterIP** services combined with K3s's built-in **Traefik Ingress Controller**.
*   **Flow:**
    1.  User creates a store named "palmonas".
    2.  System assigns domain `palmonas.shivangyadav.com`.
    3.  Ingress route is created pointing `palmonas.shivangyadav.com` -> `svc/store-palmonas` on port 80.
*   **Live Example:** [https://seventen.shivangyadav.com/](https://seventen.shivangyadav.com/)

#### ⚡ MedusaJS: Direct NodePort Access
Medusa's Admin Dashboard has strict CORS and domain configurations that can be tricky behind standard Ingress in this specific environment ("Blocking Custom Domains").
*   **Challenge:** The Medusa Admin often blocks connections if the Host header doesn't strictly match internal expectations, causing "Network Errors" on custom domains.
*   **Solution:** To ensure reliable access, we expose the Medusa Admin via **NodePort**.
*   **Flow:**
    1.  Kubernetes assigns a random high port (e.g., `32165`) on the EC2 host.
    2.  The ShopFlow Dashboard retrieves this port dynamically.
    3.  User is redirected to `http://43.205.194.216:32165/app/login`.

### 4. Resource Management (The Secret Sauce)
To ensure stability on a 2GB RAM node, strict limits are enforced via Helm Values (`values-prod.yaml`):

*   **ResourceQuotas (Per Namespace):**
    *   **RAM:** Max 1.5Gi
    *   **CPU:** Max 1.5 core
    *   **Storage:** Max 5Gi
*   **LimitRange:**
    *   Prevents any pod from launching without limits (defaults to 512Mi RAM).
*   **Graceful Recovery:**
    *   A **Reconciliation Service** runs on API startup to detect and fix any stores stuck in `PROVISIONING` state due to restarts.

---

### Created by Shivang Yadav
