#!/bin/bash
# this script is used to run zac within a container
# it only exists to add the two symlinks required to run the server with TLS by reusing the certificates
# created by the ziti-edge-controller
echo "running ZAC"
if [[ "${ZAC_SERVER_KEY}" != "" ]]; then
  while [ ! -f "${ZAC_SERVER_KEY}" ]; do
    echo "waiting for server key to exist..."
    sleep 3
  done

  echo "ZAC will use this key for TLS: ${ZAC_SERVER_KEY}"
  ln -s "${ZAC_SERVER_KEY}" /usr/src/app/server.key
fi
if [[ "${ZAC_SERVER_CERT_CHAIN}" != "" ]]; then
  while [ ! -f "${ZAC_SERVER_CERT_CHAIN}" ]; do
    echo "waiting for server cert chain to exist..."
    sleep 3
  done

  echo "ZAC will present this pem for TLS: ${ZAC_SERVER_CERT_CHAIN}"
  ln -s "${ZAC_SERVER_CERT_CHAIN}" /usr/src/app/server.chain.pem
fi

if [[ "${ZITI_CTRL_EDGE_ADVERTISED_ADDRESS}" != "" ]]; then
if [[ "${ZITI_CTRL_EDGE_ADVERTISED_PORT}" != "" ]]; then
if [[ "${ZITI_CTRL_NAME}" == "" ]]; then
  ZITI_CTRL_NAME="docker-based-controller"
fi
  echo "emitting settings.json"
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
    "allowPersonal":  true,
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
  echo ZITI_CTRL_EDGE_ADVERTISED_ADDRESS set but ZITI_CTRL_EDGE_ADVERTISED_PORT not set. cannot create default server
fi
fi

node /usr/src/app/server.js
