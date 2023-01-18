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

node /usr/src/app/server.js
