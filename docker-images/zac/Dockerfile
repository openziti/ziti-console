FROM node:20-bookworm-slim as zac-builder

WORKDIR /usr/src/app

RUN npm install -g @angular/cli@16.0.0-next.0

COPY package*.json ./
COPY version.js ./
COPY . .
RUN npm install --omit=optional
RUN ng build ziti-console-node


FROM node:20-bookworm-slim
WORKDIR /usr/src/app

COPY --from=zac-builder /usr/src/app/dist ./dist
COPY --from=zac-builder /usr/src/app/node_modules ./node_modules
COPY ./package*.json ./
COPY ./server.js ./
COPY ./run-zac.sh ./

# The in-container path for the key file to use for TLS.
ENV ZAC_SERVER_KEY=
# The in-container path for the cert bundle file to use for TLS.
ENV ZAC_SERVER_CERT_CHAIN=
# the HTTP port ZAC uses
ENV PORT=
# the HTTPS port ZAC uses
ENV PORTTLS=

# Expose ports
EXPOSE 1408
EXPOSE 8443

ENTRYPOINT ["/usr/src/app/run-zac.sh"]
CMD ["node-api"]
