#!/bin/bash
#
# this script is used to run zac within a container
#
# this adds two symlinks required to run the server with TLS:
# - the private key: server.key -> ${ZAC_SERVER_KEY}
# - certificate chain, including any intermediates: server.chain.pem -> ${ZAC_SERVER_CERT_CHAIN}

# Function to create symlinks if required files exist
create_symlink() {
  local file_var=$1
  local symlink_name=$2
  local file_name=$(eval echo \$$file_var)

  if [[ -n "$file_name" ]]; then
    while [ ! -f "$file_name" ]; do
      echo "Waiting for $file_name to exist..."
      sleep 3
    done
    echo "ZAC will use this file for TLS: $file_name"
    ln -s "$file_name" "$symlink_name"
  fi
}

# Create symlinks for server key and certificate chain
create_symlink "ZAC_SERVER_KEY" "/usr/src/app/server.key"
create_symlink "ZAC_SERVER_CERT_CHAIN" "/usr/src/app/server.chain.pem"

# Handle ZITI_CTRL configuration
if [[ -n "${ZITI_CTRL_EDGE_ADVERTISED_ADDRESS}" && -n "${ZITI_CTRL_EDGE_ADVERTISED_PORT}" ]]; then
  ZITI_CTRL_NAME="${ZITI_CTRL_NAME:-docker-based-controller}"
  echo "Emitting settings.json"
  cat > /usr/src/app/assets/data/settings.json <<HERE
{
    "edgeControllers":[{
        "name":"${ZITI_CTRL_NAME}",
        "url":"https://${ZITI_CTRL_EDGE_ADVERTISED_ADDRESS}:${ZITI_CTRL_EDGE_ADVERTISED_PORT}",
        "default":true
    }],
    "editable": true,
    "update": false,
    "location": "../ziti",
    "port": 1408,
    "portTLS": 8443,
    "logo": "",
    "primary": "",
    "secondary": "",
    "allowPersonal": true,
    "rejectUnauthorized": false,
    "mail": {
        "host": "",
        "port": 25,
        "secure": false,
        "auth": {
            "user": "",
            "pass": ""
        }
    },
    "from": "",
    "to": ""
}
HERE
else
  echo "ZITI_CTRL_EDGE_ADVERTISED_ADDRESS set but ZITI_CTRL_EDGE_ADVERTISED_PORT not set. Cannot create default server."
fi

# Determine which server to run based on input arguments
if [[ "$1" == "classic" ]]; then
  echo "Running Classic ZAC Application"
  exec node /usr/src/app/server.js classic
elif [[ "$1" == "edge-api" ]]; then
  echo "Running ZAC server with Edge API integration"
  exec node /usr/src/app/server-edge.js
elif (( $# )); then
  echo "Running: server.js $*"
  exec node /usr/src/app/server.js "$@"
else
  echo "Running ZAC Server with Node API Integration"
  exec node /usr/src/app/server.js node-api
fi
