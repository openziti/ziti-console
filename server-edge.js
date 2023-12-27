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
