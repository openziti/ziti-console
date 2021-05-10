
## To Start

Make sure you have an edge controller running

1. run: npm install
2. run: node server.js

## Docker Build

1. build the image: `docker build . -t openziti/zac`
1. push the image: `docker push openziti/zac`

## Run via Docker

1. run: (sudo may/may not be necessary) `sudo docker run -d --name zac -p 1408:1408 openziti/zac`
1. optional - add TLS: 
 
        sudo docker run -d \
            --name zac \
            -p 1408:1408 \
            -p 8443:8443 \
            -v "path-to-server.key":/usr/src/app/server.key \
            -v "path-to-server.chain.pem":/usr/src/app/server.chain.pem \
            openziti/zac 

