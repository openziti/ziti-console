npm install
npm install -g @angular/cli@16.0.0-next.0
ng build ziti-console-lib
ng build ziti-console --base-href /$1/ --deploy-url /$1/
if [[ "publish" == "$2" ]]; then
  cd dist/ziti-console-lib && npm publish
fi