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
# Plain alpine with nginx from Alpine's own repository, rather than deriving from
# nginxinc/nginx-unprivileged. That base was used until v0.5.3 and the move away from it is the
# whole point of this change, so the reasoning is kept here rather than in a commit message.
#
# **The vendor base pins nginx, and the pin is what rotted.** It writes exact versions into
# /etc/apk/world - `nginx=1.30.6-r1` and the same for four module packages - so `apk upgrade`
# cannot move nginx. v0.5.2 scanned completely clean on 2026-11-16 and, unchanged, reported three
# CRITICAL and three HIGH on 2026-11-19 when Alpine shipped 1.30.7-r0. Removing the pins was not
# enough either: nginx-module-geoip, -image-filter, -njs and -xslt exist in v3.24/main only at
# 1.30.6 and depend on that exact nginx version, so apk held nginx back to keep them installable.
# v0.5.3 deleted those four modules to get out. Installing nginx here instead means /etc/apk/world
# reads a bare `nginx`, the modules are never present to pin anything, and a rebuild simply picks
# up whatever v3.24/main holds.
#
# **And deriving cost 10 MB that could not be reclaimed.** v0.5.3 removed 39 packages and still
# grew from 67.5 MB to 77.9 MB, because a deletion in a derived layer only writes a whiteout - the
# bytes stay in the base layer - while every upgraded file is written again on top. Starting from
# alpine means never installing them. Measured on 2026-11-19: **14.8 MB and 18 packages**, against
# 77.4 MB and 31 for v0.5.3 and 67.5 MB and 70 for v0.5.2. The base is alpine 3.24.4, which Trivy
# does not flag as past EOL.
#
# What the vendor base supplied and this stage now supplies for itself: a non-root user, a main
# nginx.conf adjusted for one (see nginx.conf in this repository), and writable pid and temp
# paths. The runtime user is Alpine's own `nginx`, which is **uid 100**, where the vendor image
# used uid 101. Nothing outside the container depends on it: the Quadlet mounts no volumes and
# publishes a port, so the uid is internal.
FROM docker.io/library/alpine:3.24

# nginx and nothing else. No modules: this serves static files and proxies one path, and each
# module package would pin nginx to the exact version it was built against.
RUN set -eu; \
    apk add --no-cache nginx; \
    v=$(apk info -v | grep '^nginx-1' || true); \
    [ -n "$v" ] || { echo 'FAIL: nginx is not installed, so the checks below would prove nothing'; exit 1; }; \
    n=$(apk info -v | grep -c '^nginx' || true); \
    [ "$n" -eq 1 ] || { echo "FAIL: $n nginx packages are installed, expected nginx alone:"; apk info -v | grep '^nginx'; exit 1; }; \
    if grep -qE '^nginx(-module-[a-z-]+)?=' /etc/apk/world; then \
      echo 'FAIL: an exact version pin is in /etc/apk/world, which is what this base was chosen to avoid:'; \
      grep -E '^nginx' /etc/apk/world; exit 1; \
    fi; \
    \
    # nginx opens its compiled-in default error log *before* it reads any configuration, and that
    # path is $prefix/logs/error.log -> /var/log/nginx/error.log, which the runtime user cannot
    # write. Without this it emits `could not open error log file ... Permission denied` on every
    # single start, before the `error_log /dev/stderr` in nginx.conf ever takes effect.
    mkdir -p /var/log/nginx; \
    ln -sf /dev/stderr /var/log/nginx/error.log; \
    ln -sf /dev/stdout /var/log/nginx/access.log; \
    \
    echo "OK: $v, unpinned, no module packages"

# Our own main configuration, replacing Alpine's. See nginx.conf for what had to change and why.
COPY nginx.conf /etc/nginx/nginx.conf

# The server block. Alpine includes http.d, not conf.d - putting a server block in conf.d would
# be a syntax error, because that include sits outside the http context.
COPY default.conf /etc/nginx/http.d/default.conf

# Copy built static files. Nothing in this image owns /usr/share/nginx/html any more: on the
# vendor base it belonged to the nginx package, which is how upgrading nginx once deleted
# index.html out from under a build that had already been copied over it.
COPY --from=build /app/dist /usr/share/nginx/html

# Our own error page. nginx 1.30.7-r0 puts the package's samples under /var/lib/nginx/html, so
# default.conf's `error_page 500 502 503 504 /50x.html` would otherwise resolve to a 404 and hide
# whatever actually failed.
COPY 50x.html /usr/share/nginx/html/50x.html

RUN set -eu; \
    # `sed -i` writes a temp file *in the directory* before renaming it over the original, so the
    # directories have to be writable by the runtime user, not just the files inside them.
    chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/http.d; \
    \
    [ -f /usr/share/nginx/html/index.html ] || { echo 'FAIL: index.html is missing'; ls -la /usr/share/nginx/html; exit 1; }; \
    [ -f /usr/share/nginx/html/50x.html ]   || { echo 'FAIL: 50x.html is missing, so error_page would resolve to a 404'; exit 1; }; \
    grep -q '__POCKETBASE_URL__' /etc/nginx/http.d/default.conf || { echo 'FAIL: the placeholder the CMD substitutes is not in default.conf'; exit 1; }; \
    roots=$(sed -n 's/.*root \([^;]*\);.*/\1/p' /etc/nginx/http.d/default.conf | tr -d ' ' | sort -u); \
    [ -n "$roots" ] || { echo 'FAIL: no root directive found, so the path check below would prove nothing'; exit 1; }; \
    for d in $roots; do \
      [ -d "$d" ] || { echo "FAIL: default.conf serves from $d, which does not exist in this image"; exit 1; }; \
    done; \
    f=$(find /usr/share/nginx/html -type f | wc -l); \
    [ "$f" -gt 1 ] || { echo "FAIL: only $f file(s) under the document root, so the build output did not land"; exit 1; }; \
    \
    # Validate the real configuration, with the placeholder filled in on a throwaway copy. The
    # vendor base never allowed this - the config could only be proved at run time, in production,
    # which is where its last two faults were found.
    cp /etc/nginx/http.d/default.conf /tmp/orig.conf; \
    sed -i 's|__POCKETBASE_URL__|http://127.0.0.1:8090|g; s|__CONTACT_EMAIL__||g' /etc/nginx/http.d/default.conf; \
    nginx -t; \
    cp /tmp/orig.conf /etc/nginx/http.d/default.conf; \
    chown nginx:nginx /etc/nginx/http.d/default.conf; \
    \
    # Clean up after the validation. `nginx -t` runs as root here and it *creates files*: a pid
    # file at /tmp/nginx.pid and the five temp directories declared in nginx.conf. Left behind,
    # the root-owned pid file makes the container fail to start with
    # `open() "/tmp/nginx.pid" failed (13: Permission denied)` - an image that builds, scans clean
    # and dies on first run.
    rm -rf /tmp/orig.conf /tmp/nginx.pid /tmp/nginx-client-body /tmp/nginx-proxy \
           /tmp/nginx-fastcgi /tmp/nginx-uwsgi /tmp/nginx-scgi; \
    leftovers=$(find /tmp -mindepth 1 2>/dev/null | head -5); \
    [ -z "$leftovers" ] || { echo 'FAIL: build artifacts left in /tmp:'; echo "$leftovers"; exit 1; }; \
    grep -q '__POCKETBASE_URL__' /etc/nginx/http.d/default.conf || { echo 'FAIL: the placeholder was not restored after validation'; exit 1; }; \
    \
    echo "OK: $f files served, config valid, placeholder intact"

USER nginx

# The checks above all ran as root, which is exactly how the pid-file fault got shipped once.
# These run as the runtime user and test the two things that actually failed: creating the pid
# file, and creating a temp directory under /tmp.
RUN set -eu; \
    id -u | grep -qv '^0$' || { echo 'FAIL: still running as root, so this check proves nothing'; exit 1; }; \
    : > /tmp/nginx.pid || { echo 'FAIL: the runtime user cannot create /tmp/nginx.pid'; ls -la /tmp; exit 1; }; \
    mkdir -p /tmp/nginx-probe || { echo 'FAIL: the runtime user cannot create temp directories under /tmp'; exit 1; }; \
    rm -rf /tmp/nginx.pid /tmp/nginx-probe; \
    [ -r /usr/share/nginx/html/index.html ] || { echo 'FAIL: the runtime user cannot read index.html'; exit 1; }; \
    [ -w /etc/nginx/http.d ] || { echo 'FAIL: the runtime user cannot write /etc/nginx/http.d, so the CMD sed -i will fail'; exit 1; }; \
    echo "OK: runtime user $(id -un) ($(id -u)) can write the pid, temp dirs and the config directory"

EXPOSE 8080

CMD ["sh", "-c", "sed -i \"s|__POCKETBASE_URL__|${POCKETBASE_URL:-http://localhost:8090}|g; s|__CONTACT_EMAIL__|${CONTACT_EMAIL:-}|g\" /usr/share/nginx/html/index.html /etc/nginx/http.d/default.conf && exec nginx -g 'daemon off;'"]
