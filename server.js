import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = process.env.PORT || 1408;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));

app.use('/', express.static('dist/app-open-ziti'));
app.use('/:name', express.static('dist/app-open-ziti'));

app.listen(port, () => {
    console.log('Server started http://localhost:' + port);
});

