import express from "express";
import bodyParser from "body-parser";
import * as childProcess from 'child_process';

import _ from "lodash";

const integration = _.get(process, 'argv[2]') || "classic";

if (integration === 'edge-api') {
    const app = express();
    const port = process.env.PORT || 1408;

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended:false}));

    app.use('/', express.static('dist/app-ziti-console'));
    app.use('/:name', express.static('dist/app-ziti-console'));

    app.listen(port, () => {
        console.log('Server started http://localhost:' + port);
    });
} else {
    console.log('changing directory');
    process.chdir('./projects/ziti-console')
    childProcess.fork(`server.js`, [integration]);
}
