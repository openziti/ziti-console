#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

npm install
npm install -g @angular/cli@16.0.0-next.0
cd dist/ziti-console-lib && npm publish --access public