ZAC_VERSION=$(jq -r .version package.json)

if [ -z "${ZAC_VERSION}" ]; then
  echo "ZAC_VERSION was not set and auto-detection failed."
  exit 1
fi

echo "Building ZAC version ${ZAC_VERSION} for amd64/arm64"

docker buildx create --use --name=zac
docker buildx build --platform linux/amd64,linux/arm64 . \
  --tag "openziti/zac:${ZAC_VERSION}" \
  --tag "openziti/zac:latest" \
  --push
