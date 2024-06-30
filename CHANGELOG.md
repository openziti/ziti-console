
# CHANGELOG

## v3.2.4

- Try client certificate authentication method if login form submitted without a username or password
- stop using build time `--deploy-url` and use alternative APP_BASE_HREF to compute relative paths if 
  `ng build ziti-console --base-href ${BASE_HREF}`, else `/zac/`

## v3.2.0

### What's New?

- Add a container image to ship the single-page application (SPA) build of the console: `openziti/ziti-console:3.2.0` (also `:v3` and `:latest`). The tag scheme follows the Git version of each release. See [the deployment guide](https://openziti.io/docs/guides/deployments/docker/console) for more information.
