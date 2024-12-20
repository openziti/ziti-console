#!/usr/bin/env bash

# Override environment variables if provided as arguments
if [ $# -gt 0 ]; then
  echo "===> Overriding environment variables with arguments..."
  for var in "$@"; do
    export "$var"
  done
fi

# Display the current environment variables
echo "===> ENV Variables ..."
env | sort

# Show the user information
echo "===> User:"
id

# Build the project
echo "===> Building ..."
yarn build

# Run the application
echo "===> Running ..."
exec node index.js
