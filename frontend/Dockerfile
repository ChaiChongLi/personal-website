##############################################################################
# frontend/Dockerfile — Multi-stage build for Angular 19
#
# Stage 1 (builder): Install Node.js, install deps, run ng build
# Stage 2 (runtime): Nginx serving the compiled static files
#
# Multi-stage build keeps the final image small (~25MB vs ~900MB)
# Only the compiled dist/ folder is copied into the Nginx image
##############################################################################

# ── Stage 1: Build Angular application ──────────────────────────────────────
FROM node:20-alpine AS builder

# Build-time argument: API URL for Angular environment (injected via docker-compose)
ARG API_URL=/api/v1

WORKDIR /app

# Copy package files first (layer caching — only reinstall if deps change)
COPY package*.json ./

# Use npm install instead of npm ci (no package-lock.json in generated project).
# --legacy-peer-deps avoids peer-dependency conflicts common with Angular 19 packages.
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Replace environment.prod.ts API URL with the build arg value
# This allows different API URLs per deployment environment
RUN sed -i "s|apiUrl: '/api/v1'|apiUrl: '${API_URL}'|g" \
    src/environments/environment.prod.ts

# Build Angular for production
# --configuration production enables:
#   - AOT compilation
#   - Tree shaking (removes unused code)
#   - Minification and uglification
#   - Dead code elimination
RUN npm run build -- --configuration production

# ── Stage 2: Serve with Nginx ────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

# Remove default Nginx static site
RUN rm -rf /usr/share/nginx/html/*

# Copy compiled Angular app from builder stage
COPY --from=builder /app/dist/personal-website-frontend/browser /usr/share/nginx/html

# Nginx config is mounted via docker-compose volume (nginx/nginx.conf)
# This allows config changes without rebuilding the image

# Expose HTTP port
EXPOSE 80

# Run Nginx in foreground (Docker requires non-daemon process)
CMD ["nginx", "-g", "daemon off;"]
