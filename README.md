## Running Legacy App (vanilla javascript)
```
cd projects/ziti-console
npm install
node server.js
```

## Running OpenZitiConsole (Angular App)

```
from project root: 

node server.js
```
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



