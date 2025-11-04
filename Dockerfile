# Build stage
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Production stage
FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /usr/src/app/logs && \
    chown -R nodejs:nodejs /usr/src/app

# Copy dependencies from builder
COPY --from=builder --chown=nodejs:nodejs /usr/src/app/node_modules ./node_modules

# Copy application files
COPY --chown=nodejs:nodejs . .

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/version', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "server/index.js"]