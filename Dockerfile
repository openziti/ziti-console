# Build Stage
FROM node:16.20.2 as builder

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm install -g @angular/cli@16.0.0-next.0
RUN ng build ziti-console-lib
RUN ng build ziti-console
RUN ng build ziti-console-node

# Final Stage
FROM node:16.20.2-alpine

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/run-zac.sh ./

# Set environment variables...

EXPOSE 1408
EXPOSE 8443

ENTRYPOINT ["./run-zac.sh"]
CMD ["./run-zac.sh"]