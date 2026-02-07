# Multi-stage build for Node.js API
FROM node:20-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files from monorepo root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all apps (needed for monorepo)
COPY apps ./apps

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build stage
FROM base AS builder

WORKDIR /app

# Build the API
RUN pnpm --filter api run build

# Generate Prisma Client
WORKDIR /app/apps/api
RUN pnpm prisma generate

# Production stage
FROM node:20-alpine AS runner

# Install pnpm
RUN npm install -g pnpm

# Install Helm
RUN apk add --no-cache curl openssl && \
    curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 && \
    chmod 700 get_helm.sh && \
    ./get_helm.sh && \
    rm get_helm.sh

WORKDIR /app

# Copy package files
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/pnpm-workspace.yaml ./

# Copy built API
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copy helm charts to where the code expects them (dist/helm)
COPY --from=builder /app/apps/api/helm ./apps/api/dist/helm
# Also copy to root just in case
COPY --from=builder /app/apps/api/helm ./apps/api/helm

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

WORKDIR /app/apps/api

# Expose port
EXPOSE 4001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD node -e "require('http').get('http://localhost:4001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "dist/src/server.js"]
