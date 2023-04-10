# Release 2.6.9
* Fix Auth Policy Creation Value
* Fix Edit Auth Policy Screen

# Release 2.6.8
* Fix Time Zone Showing

# Release 2.6.7
* New Dashboard Stage 1
* Fix Cors/Helmet Settings
* Split Organization of Identity Details

# Release 2.6.5
* Skip Error and Continue

# Release 2.6.4
* Give appData field to Identity object
* Provide a means to push z zt-session and controller to auto login ZAC using /sso?controller=[http://yourcontroller:8441]&session=[zt-session]
* Fix various style issues
* Expose Certificate Authority JWT Download
* Fix CAS Switch editing
* Create "Notes" section for Recipe documentation (and others)

# Release 2.6.3
* Fixed CAS Issue with identityRoles
* Fixed Version Display
* Fixed Search and Select on Multi Selector Control

# Release 2.6.2
* Added missing fields to Transnit Router - Cost, noTraversal
* Fix Broken Identity Selector
* Fix Broken Default Auth Policy Loading

# Release 2.6.1
* Fix issue causing legacy settings to not load
* Router creation defaults to Tunneler Enabled
* Added Router Token and JWT
* Added Reject Self Signed Certs options in settings.json
* Added missing fields to terminators
* Fix bug in new select control that made edits not work

# Release 2.6.0
* Update Multi Select Component for Attributes
* Update Localization
* Add JWT-Signers Functionality
* Add Auth Policy Features
* Redesign Navigation to be more Usable
* Organize Sub Menus
* Create Html Components for reused features
* Apply Auth Policy to Identity

# Release 2.5.8
* Release that does not rely on cdn scripts or fonts for any functional need
* Note: Map & Gtag will not work in offline mode.

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
