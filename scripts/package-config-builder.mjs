/*
 * Copyright NetFoundry Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Zips dist/config-builder into config-builder.zip so the doc site can fetch it from a release.
// Usage: node ./scripts/package-config-builder.mjs [--build] [--out <file>] [--upload <tag>]
//   --build        run `npm run build:config-builder` first
//   --out <file>   zip path (default: dist/config-builder.zip)
//   --upload <tag> attach the zip to the GitHub release <tag> with `gh` (needs GH_TOKEN in CI)
import {spawnSync} from 'node:child_process';
import {existsSync, rmSync} from 'node:fs';
import {resolve} from 'node:path';

const args = process.argv.slice(2);
const flag = name => args.includes(name);
const value = name => args[args.indexOf(name) + 1];

const root = resolve(import.meta.dirname, '..');
const dist = resolve(root, 'dist', 'config-builder');
const out = resolve(root, flag('--out') ? value('--out') : 'dist/config-builder.zip');

const run = (cmd, cmdArgs, cwd = root) => {
    const r = spawnSync(cmd, cmdArgs, {cwd, stdio: 'inherit', shell: process.platform === 'win32'});
    if (r.status !== 0) {
        console.error(`package-config-builder: "${cmd} ${cmdArgs.join(' ')}" failed`);
        process.exit(r.status ?? 1);
    }
};

if (flag('--build')) {
    run('npm', ['run', 'build:config-builder']);
}
if (!existsSync(resolve(dist, 'index.html'))) {
    console.error(`package-config-builder: ${dist} has no index.html. Run with --build or npm run build:config-builder.`);
    process.exit(1);
}

rmSync(out, {force: true});
if (process.platform === 'win32') {
    const ps = resolve(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    run(`"${ps}"`, ['-NoProfile', '-Command', `Compress-Archive -Path '${dist}\\*' -DestinationPath '${out}'`]);
} else {
    run('zip', ['-r', '-q', out, '.'], dist);
}
console.log(`package-config-builder: wrote ${out}`);

if (flag('--upload')) {
    run('gh', ['release', 'upload', value('--upload'), out, '--clobber']);
}
