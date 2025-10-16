# this Dockerfile builds openziti/ziti-console-assets

ARG NODE_VERSION=20

FROM node:${NODE_VERSION}-bookworm-slim AS builder

ARG BASE_HREF=/zac/

WORKDIR /usr/src/app

RUN npm install -g @angular/cli@16.0.0-next.0

COPY . .

RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/usr/src/app/.angular/cache \
    npm install --omit=optional && \
    ng build ziti-console --base-href ${BASE_HREF} --configuration "production"

ARG NODE_VERSION=${NODE_VERSION}

FROM node:${NODE_VERSION}-bookworm-slim

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist/app-ziti-console ./dist/app-ziti-console

CMD ["echo", "deployment guide https://openziti.io/docs/guides/deployments/docker/console"]
