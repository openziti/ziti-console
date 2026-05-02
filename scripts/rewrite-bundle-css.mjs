// Post-build: strip leading '/' from url(/assets/...) in emitted bundle CSS.
//
// Why: in CSS source we keep absolute paths (url('/assets/foo')) so Angular's
// esbuild URL resolver passes them through unchanged. The browser would then
// resolve them against origin, ignoring <base href>, which breaks path-agnostic
// deployment. We rewrite the emitted bundle to use 'assets/foo' (no leading
// slash), which the browser resolves against <base href> at runtime.

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const distRoot = join(here, '..', 'dist', 'app-ziti-console');

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

let touched = 0;
let occurrences = 0;
for await (const file of walk(distRoot)) {
  // .css files hold global stylesheets; .js files hold component-scoped styles
  // inlined as strings by Angular, which still contain url(/assets/...) literals.
  if (!file.endsWith('.css') && !file.endsWith('.js')) continue;
  if (file.endsWith('.map')) continue;
  const original = await readFile(file, 'utf8');
  // Match url('/assets/...') and the escaped form url(\"/assets/...\") that
  // appears when component styles are embedded in JS string literals.
  const rewritten = original
    .replace(/url\(\s*(['"]?)\/assets\//g, 'url($1assets/')
    .replace(/url\(\\(['"])\/assets\//g, 'url(\\$1assets/');
  if (rewritten !== original) {
    const beforeRe = /url\(\s*\\?['"]?\/assets\//g;
    const before = (original.match(beforeRe) || []).length;
    const after = (rewritten.match(beforeRe) || []).length;
    occurrences += before - after;
    touched++;
    await writeFile(file, rewritten, 'utf8');
    console.log(`  rewrote ${before - after} url(/assets/...) in ${file.substring(distRoot.length + 1)}`);
  }
}
console.log(`\nrewrote ${occurrences} url() references across ${touched} CSS files`);
