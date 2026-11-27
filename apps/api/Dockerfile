# Build context is the repo root (npm workspaces share one root lockfile):
#   docker build -f apps/api/Dockerfile .
# Debian slim (glibc), not alpine: argon2 ships a prebuilt glibc binary.
ARG NODE_VERSION=24

# ---- build: all deps, compile TypeScript ----
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
# npm ci needs every workspace manifest, even for workspaces we don't build.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api
COPY apps/api apps/api
RUN npm run build -w apps/api

# ---- runtime: production deps + compiled output only ----
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api --omit=dev && npm cache clean --force
COPY --from=build /app/apps/api/dist apps/api/dist
USER node
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
