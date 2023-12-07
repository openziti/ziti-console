## What is the Ziti Administration Console 
The Ziti Administration Console (ZAC) is a web UI provided by the OpenZiti project which will allow you to configure and explore a Ziti Network.


## How To Run ZAC
Before you start, make sure you are able to connect to a Ziti Edge Controller. To learn more about Ziti constructs and API's go to: https://openziti.io/docs/reference/developer/api/

To build and run the application from source, you'll also need to make sure you have the following developer tools installed and available on your command line:

| Tool        | Min. Version |
| :---:       | :---:        |
| Angular CLI | 16.x         |
| Node.js     | 16.3.x       | 
| npm         | 8.1.x        |



## Running ZAC From Source

* Make sure you have the angular CLI installed
* This project is currently running on angular 16.2.11
* To install the angular CLI run:
```
npm install -g @angular/cli@16.0.0-next.0
```

* You'll also need to be running Node.js version >= 16.13.x

From the project root: 

1) install project dependencies:
	```
	npm install
	```

2) build core project library
	```
	npm run build-lib
	```

3) build & run the ziti-console angular app 

   	  ```
	  ng build ziti-console-node
	  ```
	  ```
	  node server.js node-api
	  ```


4) Finally, access the app @ http://localhost:1408


## Developing Angular App
There are two elements to the Angular app - 

From project Root:

1) Install dependencies
	```
	npm install
	```

3) Run & watch changes in the core library in **ziti-console-lib** by running the npm script **watch:lib**
	```
	ng build ziti-console-lib --watch
 	```
   * Note: The NPM library is referenced/linked in package.json as "ziti-console-lib": "file:dist/ziti-console-lib".
   	   This library includes the pure javascript code it shared with ziti-console, and Angular code it shares with other apps.

4) Then in a seperate window run & watch changes in the main application **app-ziti-console**
   	```
	ng build ziti-console-node --watch
	```
  This ensures changes made to the NPM library get pulled into the Angular app as you are developing



## Running via Docker
The ZAC application can be run in a docker container by following the steps below.

If you don't have docker installed, you can download and install the docker engine here: https://docs.docker.com/engine/install/


### Build the Docker Image
From project root:
1. build the image: `docker build . -t openziti/zac`

### Running The Angular ZAC application with node API integration
* If you plan to connect to an Edge Controller that is NOT configured with a trusted SSL/TLS certificate, it's recomended you use the Node API integration
* To do this via **docker** run the container with the `node-api` argument:
```
sudo docker run -d --name zac -p 1408:1408 openziti/zac node-api
```

### Running The Angular ZAC application with edge API integration
* If your Edge Controller does use a trusted SSL/TLS certificate, you can access it from the console with the Edge API integration
* To do this via **docker** run the container with the `edge-api` argument:
```
sudo docker run -d --name zac -p 1408:1408 openziti/zac edge-api
```


