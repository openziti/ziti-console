**Steps To Release**

* Update Version in version.txt
* Update version in project root package.json
* Update version in ziti-console-lib package.json 
* Add what has changed to release-notes.md
* Commit to "Master"
* Create a new Release in Github
* Create and Assign the Tag for the version in version.txt
* Add the contents of the release-notes to the release
* Go to Actions Tab and make sure both "Build and Publish SPA" and "Deploy QuickStart Container" actions are triggered by release
* Once both actions are complete publish release notes to "openziti-visibility" channel