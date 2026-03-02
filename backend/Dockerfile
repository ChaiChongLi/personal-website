# Multi-stage Dockerfile for Personal Website Backend
# Uses Alpine Linux for minimal image size with production dependencies

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Use npm install instead of npm ci — no package-lock.json in generated project.
# --omit=dev installs only production dependencies (equivalent to --only=production).
RUN npm install --omit=dev --legacy-peer-deps

# Stage 2: Runtime stage
FROM node:20-alpine

# Install system dependencies for Puppeteer
# Puppeteer requires system libraries for headless Chrome
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Configure Puppeteer to use system Chromium instead of downloading
# This saves ~200MB and avoids permission issues in Docker
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Copy package files from builder stage
COPY package*.json ./

# Copy production dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create logs directory with proper permissions
RUN mkdir -p logs && \
    chmod 755 logs

# Switch to non-root user for security
# Running as root in containers is a security risk
USER node

# Expose port 3000
EXPOSE 3000

# Health check
# Allows Docker/Kubernetes to detect if container is still alive
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["node", "src/server.js"]
