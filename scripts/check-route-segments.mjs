// Guard: the inline base-href script in app-ziti-console/src/index.html computes the deploy
// mount by treating the URL path up to the first recognized route segment as the mount. That
// list (ROUTE_SEGMENTS) must mirror the top-level routes in app-routing.module.ts. If a route
// is added or removed and the list isn't updated, mount detection silently breaks at that path.
//
// This check extracts both sets and fails the build on any drift, so a stale list can never
// ship. Run locally or in CI:
//   node ./scripts/check-route-segments.mjs

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const routingPath = join(root, 'projects', 'app-ziti-console', 'src', 'app', 'app-routing.module.ts');
const indexPath = join(root, 'projects', 'app-ziti-console', 'src', 'index.html');

const routing = await readFile(routingPath, 'utf8');
const index = await readFile(indexPath, 'utf8');

// 1. top-level route segments: first segment of every `path: '...'`, minus '' and the '**' wildcard.
const routeSegs = new Set();
for (const m of routing.matchAll(/path:\s*['"]([^'"]*)['"]/g)) {
  const p = m[1];
  if (!p || p === '**') continue;
  routeSegs.add(p.split('/')[0]);
}

// 2. the ROUTE_SEGMENTS array embedded in index.html
const arr = index.match(/ROUTE_SEGMENTS\s*=\s*\[([\s\S]*?)\]/);
if (!arr) {
  console.error('FAIL: ROUTE_SEGMENTS array not found in index.html');
  process.exit(1);
}
const listSegs = new Set([...arr[1].matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]));

// 3. compare both directions
const missing = [...routeSegs].filter((s) => !listSegs.has(s)); // in routes, absent from index.html
const extra = [...listSegs].filter((s) => !routeSegs.has(s)); // in index.html, no longer a route

if (missing.length || extra.length) {
  console.error('FAIL: ROUTE_SEGMENTS in index.html is out of sync with app-routing.module.ts');
  if (missing.length) console.error('  add to index.html ROUTE_SEGMENTS:   ' + missing.join(', '));
  if (extra.length) console.error('  remove from index.html ROUTE_SEGMENTS: ' + extra.join(', '));
  process.exit(1);
}

console.log(`OK: ROUTE_SEGMENTS in sync with app-routing.module.ts (${routeSegs.size} segments)`);
