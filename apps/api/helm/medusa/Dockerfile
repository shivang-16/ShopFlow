FROM node:18-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache python3 make g++

# Install Medusa CLI
RUN npm install -g @medusajs/medusa-cli

# Create a new Medusa project
RUN medusa new . --skip-db

# Install dependencies
RUN npm install

# Expose port
EXPOSE 9000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:9000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); });"

# Start Medusa
CMD ["npm", "run", "start"]
