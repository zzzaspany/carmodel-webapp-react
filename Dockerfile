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

# `sed -i` writes a temp file *in the directory* before renaming it over the original, so the
# directories need to be writable by the runtime user, not just the files inside them. The base
# image already runs as 101, so this has to step up to root and back down again.
USER root

# Upgrade the runtime layer's OS packages before dropping back to 101.
#
# The base image lags Alpine's own repository. As of 2026-11-15 every nginx-unprivileged
# alpine tag - `stable-alpine`, `mainline-alpine` and plain `alpine` - still ships
# brotli-libs 1.2.0-r1, while Alpine has 1.2.1-r0, which fixes CVE-2026-111497: an
# out-of-bounds write in the Brotli decoder, rated CRITICAL and reachable by anything that
# sends a brotli-encoded request body.
#
# Rebuilding alone does not clear it. v0.5.1 was exactly that - a rebuild of the same commit
# as v0.5.0, nothing else - and it dropped HIGH findings from 20 to 12 while leaving the
# CRITICAL untouched, because the package is as stale in the fresh base as in the old one.
# There is no newer tag to move to; all three were scanned.
#
# Upgrading the whole layer rather than naming brotli-libs is deliberate: it makes the next
# instance of this self-healing instead of needing another commit.
#
# That self-healing did not reach nginx, and 2026-11-19 is when that became visible.
# v0.5.2 scanned completely clean on 2026-11-16; three days later the same image reported
# Total: 6 (HIGH: 3, CRITICAL: 3), all of them nginx 1.30.6-r1 against a fixed 1.30.7-r0:
# CVE-2026-121810 (use-after-free in the worker process with HTTP/3), CVE-2026-123007 and
# CVE-2026-123633 (both HTTP/2), plus three HIGH. Nothing in this repository changed. The
# image rotted where it stood.
#
# `apk upgrade` could not fix it, and the reason is worth knowing rather than rediscovering.
# The base image writes exact version pins into /etc/apk/world:
#
#     nginx=1.30.6-r1
#     nginx-module-geoip=1.30.6-r1
#     nginx-module-image-filter=1.30.6-r1
#     nginx-module-njs=1.30.6.1.0.2-r1
#     nginx-module-xslt=1.30.6-r1
#
# Dropping the pin is still not enough, because the four module packages exist in
# v3.24/main *only* at 1.30.6 - there is no 1.30.7 build of them - and each depends on that
# exact nginx version. So apk holds nginx back to keep the modules installable. Measured on
# 2026-11-19: `apk add --upgrade nginx` with the pins gone left nginx at 1.30.6-r1, and only
# removing the modules let it move to 1.30.7-r0.
#
# The modules go, and nothing here used them: nginx.conf is 32 lines with no `load_module`,
# no geoip, no image_filter, no njs and no xslt directive, and the base image's own
# nginx.conf does not load them either - `nginx -t` passes with the packages gone. If one is
# ever needed, add it back and expect nginx to be held at whatever version that module is
# built for.
#
# **This costs about 10 MB and removing 39 packages does not pay it back.** v0.5.2 was 67.5 MB
# uncompressed; this is 77.9 MB. A deletion in a derived layer only writes a whiteout - the
# bytes stay in the base layer - while every upgraded file is written again on top. Reordering
# the three apk calls was tried on 2026-11-19 and made no difference at all: 77.9 MB either way.
# The only way out is to stop deriving from nginxinc's image and install nginx onto a plain
# alpine base, creating the uid-101 user here. That is a bigger change than this one and is not
# made under a CVE deadline.
RUN set -eu; \
    apk --no-cache del nginx-module-geoip nginx-module-image-filter nginx-module-njs nginx-module-xslt; \
    apk --no-cache add --upgrade nginx; \
    apk --no-cache upgrade; \
    n=$(apk info -v | grep -c '^nginx' || true); \
    [ "$n" -gt 0 ] || { echo 'FAIL: no nginx package is installed, so this check proved nothing'; exit 1; }; \
    [ "$n" -eq 1 ] || { echo "FAIL: $n nginx packages remain, expected nginx alone:"; apk info -v | grep '^nginx'; exit 1; }; \
    if grep -qE '^nginx(-module-[a-z-]+)?=' /etc/apk/world; then \
      echo 'FAIL: an exact version pin is back in /etc/apk/world, so nginx will rot again:'; \
      grep -E '^nginx' /etc/apk/world; exit 1; \
    fi; \
    echo "OK: $(apk info -v | grep '^nginx-1'), unpinned, modules removed"

# The COPY steps come *after* the package work above, and that ordering is load-bearing.
#
# `/usr/share/nginx/html/index.html` is a file owned by the `nginx` package. Copying the React
# build over it does not change that - apk still considers the path owned - so upgrading nginx
# deletes it and installs the package's own version. Built in that order on 2026-11-19, the
# image went green on the scanner and then died on start with:
#
#     sed: /usr/share/nginx/html/index.html: No such file or directory
#
# Doing the apk work first means apk never touches anything this repository put there.
# Copy built static files
# Owned by the runtime user: the entrypoint rewrites placeholders in these files at start-up,
# which a non-root user can only do if it owns them.
COPY --from=build --chown=101:101 /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY --chown=101:101 nginx.conf /etc/nginx/conf.d/default.conf

# Our own error page, rather than the one the nginx package used to drop in.
#
# `nginx.conf` has `error_page 500 502 503 504 /50x.html`, and until 1.30.6-r1 that file arrived
# for free at /usr/share/nginx/html/50x.html as part of the nginx package. **1.30.7-r0 moved the
# package's document root to /var/lib/nginx/html**, so it no longer lands where this config looks
# for it, and an unresolvable error_page turns a 502 into a 404 - which hides the actual failure.
# Shipping the file ourselves removes the dependency on where the distribution puts its samples.
COPY --chown=101:101 50x.html /usr/share/nginx/html/50x.html

# Assert the application actually survived into the image. A container that starts is not proof:
# the CMD's `sed` is what failed last time, and that happens at run time, in production.
RUN set -eu; \
    [ -f /usr/share/nginx/html/index.html ] || { echo 'FAIL: index.html is missing - did a package step overwrite /usr/share/nginx/html?'; ls -la /usr/share/nginx/html; exit 1; }; \
    grep -q '__POCKETBASE_URL__' /etc/nginx/conf.d/default.conf || { echo 'FAIL: the placeholder the CMD substitutes is not in default.conf'; exit 1; }; \
    [ -f /usr/share/nginx/html/50x.html ] || { echo 'FAIL: 50x.html is missing, so error_page would resolve to a 404'; exit 1; }; \
    roots=$(sed -n 's/.*root \([^;]*\);.*/\1/p' /etc/nginx/conf.d/default.conf | tr -d ' ' | sort -u); \
    [ -n "$roots" ] || { echo 'FAIL: no root directive found in default.conf, so the path check below would prove nothing'; exit 1; }; \
    for d in $roots; do \
      [ -d "$d" ] || { echo "FAIL: nginx.conf serves from $d, which does not exist in this image"; exit 1; }; \
    done; \
    n=$(find /usr/share/nginx/html -type f | wc -l); \
    [ "$n" -gt 1 ] || { echo "FAIL: only $n file(s) under /usr/share/nginx/html, so the build output did not land"; exit 1; }; \
    echo "OK: index.html present, placeholder intact, $n files served"

RUN chown -R 101:101 /usr/share/nginx/html /etc/nginx/conf.d
USER 101

EXPOSE 8080

CMD ["sh", "-c", "sed -i \"s|__POCKETBASE_URL__|${POCKETBASE_URL:-http://localhost:8090}|g; s|__CONTACT_EMAIL__|${CONTACT_EMAIL:-}|g\" /usr/share/nginx/html/index.html /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
