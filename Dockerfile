# Stage 1: Build the React application
FROM docker.io/library/node:26-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy sources and build
COPY . .
RUN npm run build

# Stage 2: Serve the application using Nginx
#
# The unprivileged variant: same nginx, but it runs as uid 101 and listens on 8080 instead of 80.
# Plain nginx:alpine starts as root to bind port 80 and only then drops to the nginx user, so the
# master process stays root for the life of the container.
FROM docker.io/nginxinc/nginx-unprivileged:stable-alpine

# Copy built static files
# Owned by the runtime user: the entrypoint rewrites placeholders in these files at start-up,
# which a non-root user can only do if it owns them.
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf

# `sed -i` writes a temp file *in the directory* before renaming it over the original, so the
# directories need to be writable by the runtime user, not just the files inside them. The base
# image already runs as 101, so this has to step up to root and back down again.
USER root
RUN chown -R 101:101 /usr/share/nginx/html /etc/nginx/conf.d
USER 101

EXPOSE 8080

CMD ["sh", "-c", "sed -i \"s|__POCKETBASE_URL__|${POCKETBASE_URL:-http://localhost:8090}|g; s|__CONTACT_EMAIL__|${CONTACT_EMAIL:-}|g\" /usr/share/nginx/html/index.html /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
