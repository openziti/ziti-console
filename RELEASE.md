# Steps To Release

* Make sure versions are up to date in ./package.json & ./projects/ziti-console-lib/package.json
* Update release-notes.md with description/links to what has changed
* Create a PR to "main" with above changes (and merge with approval and completed checks)

## If releasing the ziti-console-lib shared library

* Create a new Release in Github with the following release name and tag format "ziti-console-lib-vx.x.x"
* Add the contents of the release-notes to the release description

## If releasing the app-ziti-console application

* Create a new Release in Github with the following release name and tag format "app-ziti-console-vx.x.x"
* Add the contents of the release-notes to the release description

## If releasing the config builder

The config builder (`projects/app-config-builder`) ships as `config-builder.zip`, which the ziti-doc site embeds. It has
no version file of its own; the tag is the version.

* Create a new Release in Github with the following release name and tag format "config-builder-vx.x.x"
* Publishing it runs the `build-and-publish-config-builder` job in `releases.yml`. The job attaches
  `config-builder.zip` to the release.
* To rebuild and re-attach the zip, run the "Create Releases" workflow from the Actions tab (Run workflow) with the
  existing release tag as the `tag` input.
* In ziti-doc, unzip it over `docusaurus/static/tools/config-builder-app/`, deleting the old `main.*.js`,
  `styles.*.css`, `runtime.*`, `polyfills.*` and `lottie-web.*` first.

To build and attach the zip by hand (needs `gh auth login` and an existing release):

```bash
node ./scripts/package-config-builder.mjs --build --upload config-builder-vx.x.x
```

Drop `--upload` to only write `dist/config-builder.zip`.

* Publish release(s)
* Go to Actions tab and look for failures triggered by the release.
