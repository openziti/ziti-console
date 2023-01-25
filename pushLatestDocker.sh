ZAC_VERSION=$(cat version)

if [ -z "${ZAC_VERSION}" ]; then
  echo "ZAC_VERSION was not set and auto-detection failed."
  exit 1
fi

docker buildx create --use --name=zac
docker buildx build --platform linux/amd64,linux/arm64 . \
  --tag "openziti/zac:${ZAC_VERSION}" \
  --tag "openziti/zac:latest" \
  --push
