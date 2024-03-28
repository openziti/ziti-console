
# OpenZiti Console

The OpenZiti Console is an administrative web interface for an OpenZiti network.

## Run with Node.js

This section is about running the standalone Node.js server (`node-api` run mode) that presents a web interface and API to the user for managing an OpenZiti network.

The `node-api` implements [the OpenZiti management API](https://openziti.io/docs/reference/developer/api/), so the server must be configured with the address of the OpenZiti controller.

To build and run the application from source, you'll also need to make sure you have the following developer tools installed and available on your command line:

| Tool        | Min. Version |
| :---:       | :---:        |
| Angular CLI | 16.x         |
| Node.js     | 16.13.x      |
| npm         | 8.1.x        |

* Make sure you have the angular CLI installed
* This project is currently running on angular 16
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

## Settings

The `node-api` server can be configured with a settings file.

These are the most relevant settings. Link to default
[settings.json](./projects/ziti-console-lib/src/lib/assets/data/settings.json)

* `edgeControllers` - a list of edge controller management API URLs
* `rejectUnauthorized` - require a valid SSL certificate for the edge controller before sending the password
* `trustedRootCaBundle` - path to the PEM bundle of trusted root certificates; relative to settings path

The application will look for a settings file in a settings path. The default is a folder named "ziti" adjacent to the
working directory containing `server.js`. Override the relative path to the settings file by setting the `SETTINGS`
environment variable.

For example, for `/usr/src/app/server.js` the default settings file location would be `/usr/src/ziti/settings.json`, and
the full path to the trust bundle would be `/usr/src/ziti/trusted-root-ca-bundle.pem`.

```json
{
    "edgeControllers": [
        {
            "default": true,
            "name": "Mega Ziti",
            "url": "https://megaziti.example.com:1280"
        }
    ],
    "rejectUnauthorized": true,
    "trustedRootCaBundle": "trusted-root-ca-bundle.pem"
}
```

If you run `SETTINGS=../mnt node server.js` in `/app` then the application will look for the settings file at
`/mnt/settings.json` and the trust bundle at `/mnt/trusted-root-ca-bundle.pem`.

## Developing with Angular

There are two elements to the Angular app.

1. In the top-level directory of this project: install dependencies

    ```bash
    npm install
    ```

1. In `./projects/ziti-console-lib`, run & watch changes in the core library by running the npm script **watch:lib** if
    modifying the shared code in that directory, e.g., the default settings.json file.

    ```bash
    ng build ziti-console-lib --watch
    ```

    * Note: The NPM library is referenced/linked in package.json as "ziti-console-lib": "file:dist/ziti-console-lib".
    This library includes the pure javascript code it shared with ziti-console, and the Angular code it shares with other apps.

1. Then in a separate window, in `./projects/app-ziti-console`, run & watch changes in the main application if changing
    that part of the application. This ensures changes made to the NPM library get pulled into the Angular app as you are developing.

    ```bash
    ng build ziti-console-node --watch
    ```

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
