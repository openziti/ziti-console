# app-list-table-demo

A standalone demo of the `lib-list-table` tree table from `ziti-console-lib`. It runs on static
sample data with no controller, login, or backend, so the list-table component (its flat and
contained/card tree variants) can be viewed and reviewed on its own.

Component API reference: `projects/ziti-console-lib/src/lib/features/list-table/README.md`.

## Run locally

```bash
npm install
npm run list-table-demo
```

That builds `ziti-console-lib` and serves the demo at http://localhost:4455. Or do it by hand:

```bash
npm run build-lib:once                       # the demo imports ziti-console-lib from dist/
npx ng serve app-list-table-demo --port 4455
```

The library must be built first: the demo resolves `ziti-console-lib` from `dist/` (see the
`paths` entry in `tsconfig.json`), so a serve before `build-lib:once` fails to resolve the import.

## Production build

```bash
npm run build:list-table-demo
```

This builds the library, builds the demo with the production configuration, and rewrites absolute
`/assets` paths to relative ones so the bundle works from any base path. Output goes to
`dist/app-list-table-demo`.

## Deploying on Vercel

Deploy it like the main app: a Vercel project pointing at this repo (repo root), with these settings.

| Setting | Value |
|---|---|
| Framework Preset | Other |
| Build Command | `npm run build:list-table-demo` |
| Output Directory | `dist/app-list-table-demo` |
| Install Command | `npm install` |

`index.html` uses `<base href="./">` and all assets resolve relative to it, so the build serves
correctly from the Vercel project root and from PR preview URLs.
