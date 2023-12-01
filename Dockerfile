FROM node:latest

# The in-container path for the key file to use for TLS.
ENV ZAC_SERVER_KEY=
# The in-container path for the cert bundle file to use for TLS.
ENV ZAC_SERVER_CERT_CHAIN=
# the HTTP port ZAC uses
ENV PORT=
# the HTTPS port ZAC uses
ENV PORTTLS=

# Create app directory
WORKDIR /usr/src/app

# Expose ports
EXPOSE 1408
EXPOSE 8443

# Copy source code to image
COPY . .

# Fetch dependencies
RUN npm install

RUN npm install -g @angular/cli
RUN ng build ziti-console-lib
RUN cp -r ./assets ./dist/ziti-console-lib
RUN cp -r ./html ./dist/ziti-console-lib/assets
RUN ng build ziti-console
RUN ng build ziti-console-edge

ENTRYPOINT ["/usr/src/app/run-zac.sh"]
CMD ["/usr/src/app/run-zac.sh"]
