
# OpenZiti Console

The OpenZiti Console is an administrative web interface for an OpenZiti network.

## Run with NodeJS

Before you start, ensure you can connect to an OpenZiti Controller. To learn more about OpenZiti constructs and APIs go to [the API reference](https://openziti.io/docs/reference/developer/api/).

To build and run the application from source, you'll also need to make sure you have the following developer tools installed and available on your command line:

| Tool        | Min. Version |
| :---:       | :---:        |
| Node.js     | 16.13.x      |
| npm         | 8.1.x        |


* You will also need to make sure you have the angular CLI installed
* This project currently requires Angular CLI v16
* To install the Angular CLI run:

```bash
npm install -g @angular/cli@16
```

* You'll also need to be running Node.js version >= 16.13.x

From the project root:

1. install project dependencies:

    ```bash
    npm install
    ```

1. build project with Angular

    ```bash
    ng build ziti-console-lib;
    ng build ziti-console;
    ng build ziti-console-node;
    ```

1. run the node server

    ```bash
    node server.js
    ```

1. Finally, access the app @ http://localhost:1408

## Server TLS

The console server can be configured to present a TLS server certificate on a configurable TCP port. TLS is enabled when
the private key and certificate files exist with the expected filenames in the working directory.

* `./server.key` - private key
* `./server.chain.pem` - server certificate chain

Configure the TLS port in `settings.json` by setting `portTLS` (default: 8443).

## Developing with Angular

There are two elements to the Angular app.

From project Root:

1. Install dependencies

    ```bash
    npm install
    ```

1. Run & watch changes in the core library in **ziti-console-lib** by running the npm script **watch:lib**

    ```bash
    ng build ziti-console-lib --watch
    ```

    * Note: The NPM library is referenced/linked in package.json as "ziti-console-lib": "file:dist/ziti-console-lib".
    This library includes the pure javascript code it shared with ziti-console, and the Angular code it shares with other apps.

1. Then in a separate window run & watch changes in the main application **app-ziti-console**

    ```bash
    ng build ziti-console-node --watch
    ```

  This ensures changes made to the NPM library get pulled into the Angular app as you are developing

## Docker

The ZAC application can be run in a docker container by following the steps below.

If you don't have docker installed, you can download and install the docker engine here: https://docs.docker.com/engine/install/

### Build the Container Image

From the project root directory, build the image:

```bash
docker build . -t openziti/zac
```

### Run with Angular in Docker

* If you plan to connect to an Edge Controller that is NOT configured with a trusted SSL/TLS certificate, it's recommended you use the Node API integration
* To do this via **docker** run the container with the `node-api` argument:

```bash
sudo docker run -d --name zac -p 1408:1408 openziti/zac
```
