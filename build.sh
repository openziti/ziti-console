#!/usr/bin/env bash

set -o errexit
set -o nounset
set -o pipefail

if ! (( $# ))
then
    echo "usage: $0 <base-href>"
    exit 1
fi

npm install
npm install -g @angular/cli@16.0.0-next.0
ng build ziti-console-lib
ng build ziti-console --base-href "$1"
