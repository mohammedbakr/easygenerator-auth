# Build context is the repo root (npm workspaces share one root lockfile):
#   docker build -f apps/web/Dockerfile --build-arg VITE_APP_NAME="Secure Auth" .
ARG NODE_VERSION=24

# ---- build: compile the SPA to static files ----
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
# npm ci needs every workspace manifest, even for workspaces we don't build.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/web
COPY apps/web apps/web
# VITE_* values are baked into the JS bundle at build time; nginx can't change them later.
ARG VITE_APP_NAME="Secure Auth"
ENV VITE_APP_NAME=${VITE_APP_NAME}
RUN npm run build -w apps/web

# ---- runtime: unprivileged nginx (non-root, listens on 8080) ----
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/web/nginx-security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 8080
