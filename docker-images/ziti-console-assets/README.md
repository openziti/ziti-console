
# openziti/ziti-console-assets

## Overview

This image is only for embedding the console in the controller container image. It doesn't do anything by itself.

## Deploy

[Link to console deployment guide](https://openziti.io/docs/guides/deployments/docker/console) shows how enable the console in the controller image.

## Build

In the project root, build the image with the `BASE_HREF` build argument set to the path where the console will be served (default: `/zac/` is hard-coded in `ziti controller`).

In this Dockerfile, the default value of `DEPLOY_URL` is set to the value of `BASE_HREF`. These correspond to [Angular `ng build` options](https://angular.io/cli/build).

```bash
docker build \
    --tag ziti-console-assets \
    --file ./docker-images/ziti-console-assets/Dockerfile \
    --build-arg BASE_HREF=/zac/ \
    --build-arg DEPLOY_URL=/zac/ \
    "${PWD}"
```

Refer to [the `openziti/ziti-controller` image](https://github.com/openziti/ziti/blob/release-next/dist/docker-images/ziti-controller/Dockerfile) to see how this image is used to build a controller image.
