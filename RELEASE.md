# Steps To Release

* Make sure versions are up to date in ./package.json & ./projects/ziti-console-lib/package.json
* Update release-notes.md with description/links to what has changed
* Create a PR to "main" with above changes (and merge with approvals)

# If releasing the ziti-console lib shared library
* Create a new Release in Github with the following release name and tag format "ziti-console-lib-vx.x.x"
* Add the contents of the release-notes to the release description

# If releasing the app-ziti-console application
* Create a new Release in Github with the following release name and tag format "ziti-console-lib-vx.x.x"
* Add the contents of the release-notes to the release description

* Publish release(s)
* Go to Actions Tab and make sure both "Create Releases" and "Deploy QuickStart Container" actions are triggered by release
* Once both actions are complete, publish release notes to "openziti-visibility" channel