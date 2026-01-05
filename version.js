import fs from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';
import {fileURLToPath} from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonRaw = fs.readFileSync("./package.json", 'utf8');
const packageJson = JSON.parse(packageJsonRaw);
const zacVersion = packageJson.version;

const file = path.resolve(__dirname, 'projects/ziti-console-lib/src/lib', 'ZAC_VERSION.ts');
fsExtra.writeFileSync(file,`export const ZAC_VERSION = {
    "version": "${zacVersion}"
};
`, { encoding: 'utf-8' });
