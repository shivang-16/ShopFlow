# Medusa Helm Chart

This Helm chart deploys a complete Medusa e-commerce stack including:
- Medusa backend server (Node.js + Express)
- PostgreSQL database
- Redis cache

> **Note**: This is based on the [community Docker setup](https://github.com/medusajs/docker-medusa). Medusa does not provide official Docker support.

## Prerequisites

1. Kubernetes cluster (local or cloud)
2. Helm 3.x installed
3. Docker for building the Medusa image

## Quick Start

### 1. Build the Medusa Docker Image

Medusa doesn't provide official Docker images, so you need to build one:

```bash
cd apps/api/helm/medusa

# For local development
./build-and-push.sh localhost:5000 latest

# For production (use your registry)
./build-and-push.sh YOUR_REGISTRY latest
```

### 2. Update Image Repository

Edit `values-local.yaml`:

```yaml
medusa:
  image:
    repository: localhost:5000/medusa  # or YOUR_REGISTRY/medusa
    tag: latest
```

### 3. Install the Chart

```bash
# Local development
helm install my-store . -f values-local.yaml -n shopflow

# Production
helm install my-store . -f values-prod.yaml -n production
```

### 4. Access Medusa

After installation:

- **API**: `http://NODE_IP:31900` (local NodePort)
- **Admin Panel**: `http://NODE_IP:31900/app`
- **Store API**: `http://NODE_IP:31900/store`

**Default Credentials** (created by setup job):
- Email: `admin@medusa-test.com`
- Password: `supersecret`

### 5. Test the API

```bash
curl -X GET http://NODE_IP:31900/store/products | python -m json.tool
```

## What Gets Created

After the setup job runs, you'll have:

- ✅ Admin user (admin@medusa-test.com)
- ✅ Default region with USD currency
- ✅ Manual payment provider (like Cash on Delivery)
- ✅ 5 sample products with variants
- ✅ Proper inventory setup

## Architecture

```
Medusa Stack:
├── Medusa Server (Node.js)
│   ├── REST API (/store, /admin)
│   ├── Admin Dashboard (/app)
│   └── Port 9000
├── PostgreSQL
│   ├── Products, Orders, Customers
│   └── Port 5432
└── Redis
    ├── Cache & Sessions
    └── Port 6379
```

## Configuration

### Environment Variables

The Medusa server is configured via environment variables:

```yaml
DATABASE_URL: postgres://user:pass@host:5432/dbname
REDIS_URL: redis://host:6379
NODE_ENV: production
ADMIN_CORS: *
STORE_CORS: *
JWT_SECRET: your-secret
COOKIE_SECRET: your-secret
```

### Resources

Default resource limits:

```yaml
medusa:
  resources:
    requests:
      memory: "512Mi"
      cpu: "200m"
    limits:
      memory: "1Gi"
      cpu: "1000m"
```

## Uninstallation

```bash
helm uninstall my-store -n shopflow
```

This removes all Kubernetes resources, but PVCs (data) persist. To delete data:

```bash
kubectl delete pvc -n shopflow -l app.kubernetes.io/instance=my-store
```

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n shopflow -l app.kubernetes.io/instance=my-store
```

### View Medusa Logs

```bash
kubectl logs -n shopflow -l app=my-store-medusa --tail=100 -f
```

### Check Setup Job

```bash
kubectl logs -n shopflow -l app=my-store-setup-job
```

### Database Connection Issues

```bash
# Check PostgreSQL
kubectl get pods -n shopflow -l app=my-store-postgresql
kubectl logs -n shopflow -l app=my-store-postgresql

# Test connection
kubectl exec -it -n shopflow <postgres-pod> -- psql -U medusa -d medusa
```

### Image Pull Errors

If you see `ImagePullBackOff`:

1. Ensure you've built and pushed the image
2. Verify the image repository in values.yaml
3. Check registry access (for private registries)

## Production Deployment

For production:

1. Build and push image to production registry
2. Update `values-prod.yaml` with your registry
3. Change all default passwords
4. Configure proper ingress with TLS
5. Enable backups for PostgreSQL

```bash
helm install prod-store . -f values-prod.yaml -n production
```

## Comparison with WooCommerce

| Feature | WooCommerce | Medusa |
|---------|-------------|--------|
| **Image** | Official | Custom built |
| **Language** | PHP | Node.js |
| **Database** | MariaDB | PostgreSQL |
| **Port** | 80 | 9000 |
| **Admin** | /wp-admin | /app |
| **API** | WP REST API | REST + GraphQL |
| **Setup** | Auto | CLI + migrations |

## Resources

- [Medusa Documentation](https://docs.medusajs.com)
- [Community Docker Repo](https://github.com/medusajs/docker-medusa)
- [Medusa API Reference](https://docs.medusajs.com/api)
- [Admin Dashboard Guide](https://docs.medusajs.com/admin/quickstart)
