  

## To Start
Before you start, make sure you are able to connect to a Ziti Edge Controller. To learn more about Ziti constructs and API's go to: https://openziti.io/docs/reference/developer/api/

You will also need the following tools installed and available on your command line:

* Angular CLI v16.x+
* npm v8.1.x+
* Node JS v16.3.x+

Optional:
	* To run via Docker container you can find the docker engine here: https://docs.docker.com/engine/install/

## Docker Build
From project root:
1. build the image: `docker build . -t openziti/zac`

## Run via Docker

### Running The Legacy ZAC application
1. run: (sudo may/may not be necessary) 
	```
	sudo docker run -d --name zac -p 1408:1408 openziti/zac
	```

2. optional - add TLS: 
 
        sudo docker run -d \
            --name zac \
            -p 1408:1408 \
            -p 8443:8443 \
            -v "path-to-server.key":/usr/src/app/server.key \
            -v "path-to-server.chain.pem":/usr/src/app/server.chain.pem \
            openziti/zac 

### Running The Angular ZAC application with node API integration
* If you're planning to connect to an Edge Controller that does not have a trusted SSL/TLS certificate/certificate authority it's recomended you use the node API integration
* To do this via docker run with the `node-api` argument:
`sudo docker run -d --name zac -p 1408:1408 openziti/zac node-api`

### Running The Angular ZAC application with edge API integration
* If you're Edge Controller uses a trusted SSL/TLS certificate you can access it form the console with the Edge API integration
* To do this via docker run with the `edge-api` argument:
`sudo docker run -d --name zac -p 1408:1408 openziti/zac edge-api`



## Running OpenZitiConsole From Source

### Running the ZAC Angular App
* Make sure you have the angular CLI installed
* This project is currently running on angular 16.2.11
* To install the angular CLI run:
```
npm install -g @angular/cli@16.0.0-next.0
```

* You'll also need to be running Node JS version >= 16.13.x
From project root: 

1) install project dependencies:
```
npm install -npm install --legacy-peer-deps
```

2) build core project library
```
ng build open-ziti-console-lib
```

3) build & run the ziti-console app project

	  a) If you are going to connect to an Edge Controller via HTTPS with a trusted cert/CA run:
	  ```
	  ng build open-ziti
	  node server.js
	  ```

	  b) otherwise run with the node integration via:
	  ```
	  ng build open-ziti-node
	  node /projects/ziti-console/server-node.js
	  ```

4) Access the app @ http://localhost:1408


### Running Legacy App (vanilla html/javascript)
1)
```
npm install --legacy-peer-deps
node server.js
```
2) Access the app @ http://localhost:1408



## Developing Angular App
There are two elements to the Angular app - 
1) the NPM library referenced in package.json as
"open-ziti-console-lib": "file:dist/open-ziti-console-lib". The NPM library includes vanilla javascript code it shared with ziti-console, and 
generic Angular code it shares with other apps.
2) A sample angular application in app-open-ziti.
```
cd projects/open-ziti-console-lib
ng build --watch
cd ../..
ng serve open-ziti --ssl
```

This ensures changes made to the NPM library get pulled into the Angular app you are developing

### Hybrid App
In the interim, the open-ziti is a hybrid app, in that it runs the old ZAC code and tranisitoned angular components.
This requires some duplication - for instance in running both the legacy settings and the open-ziti settings.



