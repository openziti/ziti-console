#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail
set -o xtrace

: "${ZAC_IMAGE_REPO:="openziti/zac"}"
ZAC_VERSION=$(jq -r .version package.json)

if [ -z "${ZAC_VERSION}" ]; then
  echo "ZAC_VERSION was not set and auto-detection failed."
  exit 1
fi

echo "Building node ZAC version ${ZAC_VERSION} for amd64/arm64"

docker buildx create --use --name=zac
docker buildx build --platform linux/amd64,linux/arm64 . \
  --tag "${ZAC_IMAGE_REPO}:${ZAC_VERSION}" \
  --tag "${ZAC_IMAGE_REPO}:latest" \
  --file docker-images/zac/Dockerfile \
  --push
