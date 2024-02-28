# latest LTS version of node, e.g. 20
#FROM node:lts-alpine as builder
# this project's current LTS version of node, i.e., 16
FROM node:16.20.2-alpine3.18 as builder

# install Angular (ng) CLI
RUN npm install -g @angular/cli@16.0.0-next.0

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --omit=optional

COPY . .
RUN ng build ziti-console-lib
RUN ng build ziti-console
RUN ng build ziti-console-node

#FROM node:lts-alpine
FROM node:16.20.2-alpine3.18

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY ./package*.json ./
COPY ./server.js ./
COPY ./run-zac.sh ./

RUN apk add --no-cache bash

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
