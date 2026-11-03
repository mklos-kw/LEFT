# Build the web app.
FROM node:24-alpine AS build
WORKDIR /app
# pnpm comes through corepack, at the version pinned in package.json ("packageManager").
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @ocis-dashboard/web build

# Runtime: the server serves the API, the OAuth flows and the built web app on one port.
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    SERVER_PORT=3000 \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile --prod && pnpm store prune
COPY packages/core/src packages/core/src
COPY packages/server/src packages/server/src
COPY --from=build /app/packages/web/dist packages/web/dist
USER node
EXPOSE 3000
# pnpm installs tsx for the package that depends on it (server), not at the root.
CMD ["packages/server/node_modules/.bin/tsx", "packages/server/src/main.ts"]
