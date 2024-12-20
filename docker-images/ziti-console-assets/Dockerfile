# Use ARG for flexible Node.js version selection
ARG NODE_VERSION=20

# Builder Stage
FROM node:${NODE_VERSION}-bookworm-slim AS builder

# Set the base href for the application
ARG BASE_HREF=/zac/

WORKDIR /usr/src/app

# Install Angular CLI
RUN npm install -g @angular/cli@16.0.0-next.0

# Copy project files into the container
COPY . .

# Use cache for node_modules and Angular build cache
RUN --mount=type=cache,target=/usr/src/app/node_modules \
    --mount=type=cache,target=/usr/src/app/.angular/cache \
    npm install --omit=optional && \
    ng build ziti-console --base-href ${BASE_HREF} --configuration "production"

# Final Stage
FROM node:${NODE_VERSION}-bookworm-slim

WORKDIR /usr/src/app

# Copy the built Angular application from the builder stage
COPY --from=builder /usr/src/app/dist/app-ziti-console ./dist/app-ziti-console

# Default command for the container
CMD ["echo", "Deployment guide: https://openziti.io/docs/guides/deployments/docker/console"]
