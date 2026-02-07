# WooCommerce Helm Chart

## Auto-Configuration

This Helm chart automatically sets up a complete WooCommerce store with:

✅ WordPress installed and configured  
✅ WooCommerce plugin installed and activated  
✅ 4 sample products (T-Shirt, Jeans, Sneakers, Hoodie)  
✅ Cash on Delivery (COD) payment enabled  
✅ Storefront theme activated  

## Default Credentials

- **Admin URL**: `http://{your-domain}/wp-admin`
- **Username**: `admin`
- **Password**: `admin123`

**⚠️ Change these credentials in production!**

## What Gets Created

- WordPress + WooCommerce (latest versions)
- MariaDB database
- 4 sample products ready to purchase
- COD payment method enabled
- Storefront theme (WooCommerce's default theme)

## Testing the Store

1. Visit: `http://{your-domain}`
2. Browse products
3. Add items to cart
4. Proceed to checkout
5. Fill in billing details
6. Select "Cash on Delivery"
7. Place order ✅

## Order Management

View orders in WordPress admin:
`http://{your-domain}/wp-admin` → WooCommerce → Orders

## Resources Created

- 2 Deployments (WordPress, MariaDB)
- 2 Services
- 2 PersistentVolumeClaims (5Gi each)
- 1 Ingress
- 1 Secret (DB credentials)
- 1 ResourceQuota
- 2 NetworkPolicies
- 1 Setup Job (post-install)

## Customization

Edit `values-local.yaml` or `values-prod.yaml` to customize:
- Resource limits
- Storage sizes
- Domain names
- Database passwords
