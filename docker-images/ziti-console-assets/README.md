
# openziti/ziti-console-assets

## Overview

This image is only for embedding the console in the controller container image. It doesn't do anything by itself.

## Deploy

[Here's a link to the console deployment guide](https://openziti.io/docs/guides/deployments/docker/console) that shows how to enable the console in the controller image.

## Build

In the project root, build the image. The build is path-agnostic: `BASE_HREF` defaults to `./`, so the same artifact
works at any mount path of any depth with no per-deploy rebuild. At startup the console detects its mount from the URL
(the path up to the first known route segment) and sets `<base href>` accordingly.

```bash
docker build \
    --tag ziti-console-assets \
    --file ./docker-images/ziti-console-assets/Dockerfile \
    "${PWD}"
```

You can still pin an absolute base href at build time with `--build-arg BASE_HREF=/zac/` if you want a fixed mount, but
it is no longer required.

Refer to [the `openziti/ziti-controller` image](https://github.com/openziti/ziti/blob/release-next/dist/docker-images/ziti-controller/Dockerfile) to see how this image is used to build a controller image.
