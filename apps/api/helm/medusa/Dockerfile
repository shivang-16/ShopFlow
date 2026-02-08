FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache python3 make g++ curl git

RUN npm install -g @medusajs/medusa-cli@latest

RUN medusa new medusa-store --skip-db --skip-env --skip-migrations

WORKDIR /app/medusa-store

RUN npx medusa build

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=5 \
  CMD curl -f http://localhost:9000/health || exit 1

CMD ["sh", "-c", "npx medusa db:migrate && npx medusa start"]

