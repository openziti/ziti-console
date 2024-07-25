/*
    Copyright NetFoundry Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import bodyParser from 'body-parser';

const app = express();
const port = process.env.PORT || 1408;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));


var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
}
var helmetOptions = {
    contentSecurityPolicy: {
      directives: {
        styleSrc: ["'self'", 'www.googletagmanager.com', 'www.google-analytics.com', 'openstreetmap.org', "'unsafe-inline'"],
        scriptSrc: ["'self'", 'www.googletagmanager.com', 'www.google-analytics.com', 'openstreetmap.org', "'unsafe-inline'", "'unsafe-eval'"],
        scriptSrcAttr: ["'self'", 'www.googletagmanager.com', 'www.google-analytics.com', 'openstreetmap.org', "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'www.googletagmanager.com', 'www.google-analytics.com', 'openstreetmap.org', 'b.tile.opernstreetmap.org', 'data:', 'blob:', 'https:'],
        frameSrc: ["'self'", 'www.googletagmanager.com', 'openstreetmap.org'],
        frameAncestors: ["'self'", 'www.googletagmanager.com', 'openstreetmap.org'],
        mediaSrc: ["'self'", 'www.googletagmanager.com', 'openstreetmap.org', 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", '*'],
      },
    },
    frameguard: { action: 'SAMEORIGIN' },
    crossOriginEmbedderPolicy: false
};

app.use(cors(corsOptions));
app.use(helmet(helmetOptions));

app.use('/', express.static('dist/app-ziti-console'));
app.use('/:name', express.static('dist/app-ziti-console'));
app.use('/:name/:id', express.static('dist/app-ziti-console'));
app.use('/:name/:type/:id', express.static('dist/app-ziti-console'));

let maxAttempts = 100;
StartServer(port);

function StartServer(startupPort) {
    app.listen(startupPort, function() {
        console.log("Ziti Admin Console is now listening on port "+startupPort);
    }).on('error', function(err) {
        if (err.code=="EADDRINUSE") {
            maxAttempts--;
            console.log("Port "+startupPort+" In Use, Attempting new port "+(startupPort+1));
            startupPort++;
            if (maxAttempts>0) StartServer(startupPort);
        } else {
            console.log("All Ports in use "+port+" to "+startupPort);
        }
    });
}
