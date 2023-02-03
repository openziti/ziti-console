# Release 2.5.7
* Update how settings are inited and managed within /assets/data/settings.json
* settings.json - edgeControllers list of controllers with properties name, url, default like { "name": "My Edge Controller", "url": "https://mycontroller.com:1208", "default": true}
* settings.json value "editable" will turn off or on the ability to add controllers to ZAC
* settings.json has value "update" which tells zac whether or not to overwrite last saved settings with this file
* settings.json location value tells the system where to save local settings to
* settings.json port and portTLS can be defined here
* Environmental Variables values added for settings overrides for UPDATESETTINGS, reminder PORT, PRTLTLS and SETTINGS where values in the system alread to override settings.json
* Added command line options to override settings for editable, update, location, port & portTLS


# Release 2.5.6
* Expose details around invalid controller entry

# Release 2.5.5
* Updated all the node components to the latest version

# Release 2.5.5
* Added ARM64 building and version publication to pushLatestDocker.sh
* Added version.txt to track version

# Release 2.3.0-2.5.4
Release notes omitted... We'll try to do better! :)

# Release 2.3.0

## What's New
* Recipes - Create a "Recipe" and generate multiple identities, with access to what they need in a flash

## Other changes:
* Update external libraries

## Bugs fixed:
* Minor Style Changes for Usability
* Fix select all button on CA page

# All versions prior to 2.3.0

Changelog tracking began with 2.3.0 - all previous changes were not tracked. If interested please
review the commit history.
