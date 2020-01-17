#!/usr/bin/env bash

# Set environment values if they exist as arguments
if [ $# -ne 0 ]; then
  echo "===> Overriding env params with args ..."
  for var in "$@"
  do
    export "$var"
  done
fi

echo "===> ENV Variables ..."
env | sort

echo "===> User"
id

echo "===> Building ..."
yarn build

echo "===> Running ... "
exec node index.js