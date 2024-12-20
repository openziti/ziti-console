# Builder Stage: Builds the Angular app
FROM node:20-bookworm-slim AS zac-builder

WORKDIR /usr/src/app

# Install Angular CLI globally
RUN npm install -g @angular/cli@16.0.0-next.0

# Copy necessary files for building
COPY package*.json ./
COPY version.js ./
COPY . .

# Install dependencies and build the Angular app
RUN npm install --omit=optional
RUN ng build ziti-console-node

# Final Stage: Prepare the runtime environment
FROM node:20-bookworm-slim

WORKDIR /usr/src/app

# Copy the build artifacts and node_modules from the builder stage
COPY --from=zac-builder /usr/src/app/dist ./dist
COPY --from=zac-builder /usr/src/app/node_modules ./node_modules

# Copy essential runtime files
COPY ./package*.json ./
COPY ./server.js ./
COPY ./run-zac.sh ./

# Environment variables for TLS, ports, and other configurations
ENV ZAC_SERVER_KEY="" \
    ZAC_SERVER_CERT_CHAIN="" \
    PORT="" \
    PORTTLS=""

# Expose ports for HTTP and HTTPS
EXPOSE 1408
EXPOSE 8443

# Set the entrypoint and default command
ENTRYPOINT ["/usr/src/app/run-zac.sh"]
CMD ["node-api"]
