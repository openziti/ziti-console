
# OpenZiti Console

The OpenZiti Console is an administrative web interface for an OpenZiti network.

## Deployments

Read the production deployment guides for the console as well as the controller, router, etc.

[Link to deployment guides](https://openziti.io/docs/category/deployments/)

## Requirements

To build and run the application from source, you'll also need to make sure you have the following developer tools installed and available on your command line.

| Tool        |      Version |
| :---:       | :---:        |
| Node.js     |  =18         |
| npm         | >=8.1        |
| ng          |  =16         |

### Install Angular CLI

This provides the `ng` command.

```bash
npm install -g @angular/cli@16
```

## Projects

This repository houses two projects.

1. [ziti-console-lib](./projects/ziti-console-lib) - Angular library used by the console UI.
1. [app-ziti-console](./projects/app-ziti-console) - console UI with two deployment modes.
  1. Single page application mode (recommended) 
  1. Node.js server mode (`server.js`, deprecated)

## Build

From the project root:

1. Install the projects' dependencies.

    ```bash
    npm install
    ```

1. Build the library project with Angular.

    ```bash
    ng build ziti-console-lib
    ```
### Build the Single Page Application

This is the recommended approach.

1. Build the console project with Angular.

    ```bash
    ng build ziti-console
    ```

1. You must host the static files with a web server. 
   See [the deployment guide](https://openziti.io/docs/guides/deployments/linux/console) for details on configuring the controller to host these files.
   
1. Access the console at the controller's address: https://localhost:1280/zac

        
### Build the Standalone Node Server

This deployment mode is deprecated by the SPA mode.

1. Build the console project with Angular.

    ```bash
    ng build ziti-console-node
    ```

1. If developing the standalone Node server, run it.

    ```bash
    node server.js
    ```

1. Access the console at http://localhost:1408
1. Configure the server with the URL of the controller's edge-management API, e.g. https://localhost:1280

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

