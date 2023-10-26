FROM node:16.14.2

# Determine which app integration to run: NODE/EDGE/LEGACY
ENV ZAC_API_SERVER=NODE
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
RUN npm install --force

RUN npm install -g @angular/cli 

RUN ng build open-ziti-console-lib
RUN ng build open-ziti
RUN ng build open-ziti-node

ENTRYPOINT ["/usr/src/app/run-zac.sh"]
CMD ["/usr/src/app/run-zac.sh"]
