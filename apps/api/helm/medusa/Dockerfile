FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ curl git

RUN npm install -g @medusajs/medusa-cli@latest

RUN medusa new medusa-store --skip-db --skip-env --skip-migrations

WORKDIR /app/medusa-store

ARG CACHEBUST=1
RUN echo "Cache bust: $CACHEBUST"

RUN npx medusa build > build_log.txt 2>&1 || (cat build_log.txt && exit 1)
RUN cat build_log.txt
RUN echo "Checking build directory..."
RUN ls -la
RUN ls -la build || echo "No build directory found"
RUN ls -la .cache || echo "No .cache directory found"

# Force cache bust
RUN echo "Build complete at $(date)" > /build_timestamp.txt

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD curl -f http://localhost:9000/health || exit 1

CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]

