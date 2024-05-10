# this Dockerfile builds openziti/ziti-console-assets

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bookworm-slim as builder

ARG BASE_HREF=/zac/
ARG DEPLOY_URL=${BASE_HREF}

WORKDIR /usr/src/app

RUN npm install -g @angular/cli@16.0.0-next.0

COPY package*.json ./
RUN npm install --omit=optional

COPY . .
RUN ng build ziti-console-lib
RUN ng build ziti-console --base-href ${BASE_HREF} --deploy-url ${DEPLOY_URL}

ARG NODE_VERSION=${NODE_VERSION}
FROM node:${NODE_VERSION}-bookworm-slim
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist/app-ziti-console ./dist/app-ziti-console

CMD echo "deployment guide https://openziti.io/docs/guides/deployments/docker/console"
