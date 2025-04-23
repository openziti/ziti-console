# app-ziti-console-v3.12.1
# ziti-console-lib-v0.12.1
## Feature/Improvements
* [Issue #670](https://github.com/openziti/ziti-console/pull/670) - Enable testing and verification of an external JWT signer from create/edit form
* [Issue #675](https://github.com/openziti/ziti-console/pull/675) - Cleanup of sessions and terminators list pages


# app-ziti-console-v3.12.0
# ziti-console-lib-v0.12.0
## Feature/Improvements
* [Issue #664](https://github.com/openziti/ziti-console/pull/664) - New Sessions (And API Sessions) List Pages and Edit Forms


# app-ziti-console-v3.11.2
# ziti-console-lib-v0.11.2
## Bug Fixes
* [Issue #657](https://github.com/openziti/ziti-console/issues/657) - Use the tokenType property to determine whether to use the access token or ID token


# app-ziti-console-v3.11.1
# ziti-console-lib-v0.11.1
## Bug Fixes
* [Issue #657](https://github.com/openziti/ziti-console/issues/657) - Fix OIDC config to support google oauth


# app-ziti-console-v3.11.0
# ziti-console-lib-v0.11.0
## Feature/Improvements
* [Issue #649](https://github.com/openziti/ziti-console/pull/649) - New Transit Routers Page and Edit Form
* [Issue #653](https://github.com/openziti/ziti-console/pull/653) - Check if ext-jwt-signer is in use before deleting
* [Issue #655](https://github.com/openziti/ziti-console/issues/655) - Add "Reset MFA" option for identities

## Bug Fixes
* [Issue #651](https://github.com/openziti/ziti-console/issues/651) - Identity form isn't pre-selecting auth policy in the drop down
* [Issue #658](https://github.com/openziti/ziti-console/issues/658) - Prevent intercept on requests to OIDC config "well-know" endpoint


# ziti-console-lib-v0.10.2
## Feature/Improvements
* [Issue #653](https://github.com/openziti/ziti-console/pull/653) - Check if ext-jwt-signer is in use before deleting
* [Issue #655](https://github.com/openziti/ziti-console/issues/655) - Add "Reset MFA" option for identities


# ziti-console-lib-v0.10.1
## Feature/Improvements
* [Issue #649](https://github.com/openziti/ziti-console/pull/649) - New Transit Routers Page and Edit Form
## Bug Fixes
* [Issue #651](https://github.com/openziti/ziti-console/issues/651) - Identity form isn't pre-selecting auth policy in the drop down

# app-ziti-console-v3.10.0
# ziti-console-lib-v0.10.0
## Feature/Improvements
* [Issue #644](https://github.com/openziti/ziti-console/issues/644) - Allow users to do OIDC login via External JWT Signers
* [Issue #646](https://github.com/openziti/ziti-console/issues/646) - New Posture Checks List Page and Edit Form


# app-ziti-console-v3.9.2
# ziti-console-lib-v0.9.3
## Feature/Improvements
* [Issue #637](https://github.com/openziti/ziti-console/issues/637) - Update password from ZAC user management page
* [Issue #639](https://github.com/openziti/ziti-console/issues/639) - Can't sort terminators list on anything other field besides address

# app-ziti-console-v3.9.1
# ziti-console-lib-v0.9.2
## Feature/Improvements
* [Issue #635](https://github.com/openziti/ziti-console/issues/635) - If cert based auth is enabled for a user, automatically login when loading ZAC or refresh when session expires


# ziti-console-lib-v0.9.1
## Bug Fixes
* [Issue #632](https://github.com/openziti/ziti-console/issues/632) - Layout of config-types list page doesn't fill the main container


# app-ziti-console-v3.9.0
# ziti-console-lib-v0.9.0
## Feature/Improvements
* [Issue #629](https://github.com/openziti/ziti-console/issues/629) - New Config Types List Page and Edit Form

## Bug Fixes
* [Issue #625](https://github.com/openziti/ziti-console/issues/625) - Specify a list of pre-defined edge controllers when running the node server
* [Issue #624](https://github.com/openziti/ziti-console/issues/624) - Remove file upload utility and node service

# Notes:
This release will require all users deploying ZAC via the NodeJS server to specify a pre-defined list of ziti edge controller URL's in order to connect to a controller. To do this, users must define an environment variable called ZAC_CONTROLLER_URLS. It must be a comma seperated list of URLS. For example:

On Mac/Linux:
`export ZAC_CONTROLLER_URLS=https://localhost:1280,https://example.domain.io:443`

On Windows:
`set ZAC_CONTROLLER_URLS=https://localhost:1280,https://example.domain.io:443`


# app-ziti-console-v3.8.0
# ziti-console-lib-v0.8.2
## Feature/Improvements
* [Issue #611](https://github.com/openziti/ziti-console/issues/611) - New Certificate Authorities List Page and Edit Form
* [Issue #614](https://github.com/openziti/ziti-console/issues/614) - Maintain application state when ziti session is expired
* [Issue #616](https://github.com/openziti/ziti-console/issues/616) - Allow users to set "targetToken" property on JWT Signer

## Bug Fixes
* [Issue #620](https://github.com/openziti/ziti-console/issues/620) - Hosting Configuration in simple service only shows the first 30 identities


# ziti-console-lib-v0.8.0
## Feature/Improvements
* [Issue #601](https://github.com/openziti/ziti-console/issues/611) - New Certificate Authorities List Page and Edit Form


# app-ziti-console-v3.7.1
# ziti-console-lib-v0.7.1
## Bug Fixes
* [Issue #605](https://github.com/openziti/ziti-console/issues/605) - Remove delay in username & password change events during login
* [Issue #607](https://github.com/openziti/ziti-console/issues/607) - Network Visualizer: Fix in node type name, color and subgroup size
* [Issue #609](https://github.com/openziti/ziti-console/issues/609) - Apply correct colors/styles when dark mode is active


# app-ziti-console-v3.7.0
# ziti-console-lib-v0.7.0
## Feature/Improvements
* [Issue #601](https://github.com/openziti/ziti-console/issues/601) - Improve scaling and responsiveness of ZAC pages & components
* [Issue #595](https://github.com/openziti/ziti-console/issues/595) - Default behavior for JWT Signer "claims" property
* [Issue #490](https://github.com/openziti/ziti-console/issues/490) - NW visualizer: difference in components count in few nodes

## Bug Fixes
* [Issue #598](https://github.com/openziti/ziti-console/issues/598) - Fix selection behavior for router managed identities
* [Issue #603](https://github.com/openziti/ziti-console/issues/603) - Missing label for "External ID" field on identities create/edit form


# app-ziti-console-v3.6.5
# ziti-console-lib-v0.6.8
## Bug Fixes
* [Issue #589](https://github.com/openziti/ziti-console/issues/589) - Clicking name column doesn't open auth policy edit form
* [Issue #592](https://github.com/openziti/ziti-console/issues/592) - ZAC configurations are empty after a few requests


# app-ziti-console-v3.6.4
# ziti-console-lib-v0.6.7
## Bug Fixes
* [Issue #577](https://github.com/openziti/ziti-console/issues/570) - "Create and attach" button label should just say "attach" when adding existing config to a service

# ziti-console-lib-v0.6.6
## Feature/Improvements
* [Issue #572](https://github.com/openziti/ziti-console/issues/572) - Add "None" as an option for identity enrollment type

## Bug Fixes
* [Issue #570](https://github.com/openziti/ziti-console/issues/570) - Fix alignment of protocol, hostname, and port options when editing a config
* [Issue #533](https://github.com/openziti/ziti-console/issues/533) - Config isn't validating for missing protocol before saving
* [Issue #524](https://github.com/openziti/ziti-console/issues/524) - create config with missing required fields gets incomprehensible error


# ziti-console-lib-v0.6.5
## Feature/Improvements
* [Issue #568](https://github.com/openziti/ziti-console/issues/568) - Show login help text when entered controller URL is not reachable


# app-ziti-console-v3.6.3
# ziti-console-lib-v0.6.4
## Feature/Improvements
* [Issue #562](https://github.com/openziti/ziti-console/issues/562) - Improve config editing and validation
*
## Bug Fixes
* [Issue #556](https://github.com/openziti/ziti-console/issues/556) - Clicking Auth Policy name on list page does not open edit form
* [Issue #558](https://github.com/openziti/ziti-console/issues/558) - "Download All" option on list table does not download entities
* [Issue #560](https://github.com/openziti/ziti-console/issues/560) - Edge Controller selection becomes unselected on login page
* [Issue #564](https://github.com/openziti/ziti-console/pull/564) - Can't navigate past first 50 results on Edge Routers page
* [Issue #566](https://github.com/openziti/ziti-console/pull/566) - QR Code scanner expands multiple times with continuous clicks


# app-ziti-console-v3.6.2
# ziti-console-lib-v0.6.3

## Feature/Improvements
* [Issue #548](https://github.com/openziti/ziti-console/issues/548) - Optionally delete unused/orphaned entities when deleting a Service
*
## Bug Fixes
* [Issue #550](https://github.com/openziti/ziti-console/issues/550) - Fix filtering of configs based on config type when editing a service
* [Issue #546](https://github.com/openziti/ziti-console/issues/546) - Fix download of Certificate Authority JWT
* [Issue #553](https://github.com/openziti/ziti-console/issues/553) - Fix synchronization of pagination controls when applying filters to list pages
* [Issue #544](https://github.com/openziti/ziti-console/pull/544) - prune and ignore hard-coded lib version.ts file


# app-ziti-console-v3.6.1
# ziti-console-lib-v0.6.2

## Feature/Improvements
* [Issue #534](https://github.com/openziti/ziti-console/issues/534) - Allow re-arrangement of sub tabs via extension service
* [Issue #539](https://github.com/openziti/ziti-console/issues/539) - Add ability to download network JWT
* [Issue #523](https://github.com/openziti/ziti-console/issues/523) - lock git revision to dependency versions
* 
## Bug Fixes
* [Issue #520](https://github.com/openziti/ziti-console/issues/520) - Data doesn't show when loading config editor
* [Issue #526](https://github.com/openziti/ziti-console/issues/526) - Prevent default policy warning from showing when it isn't selected
* [Issue #535](https://github.com/openziti/ziti-console/issues/535) - Prevent actions on save button when "disable" state is applied
* [Issue #541](https://github.com/openziti/ziti-console/issues/541) - Verify Certificate modal doesn't render


# app-ziti-console-v3.6.0
# ziti-console-lib-v0.6.1

## Feature/Improvements
* [Issue #517](https://github.com/openziti/ziti-console/issues/517) - New Auth Policies List Page and Edit Form
* [Issue #514](https://github.com/openziti/ziti-console/issues/514) - Added URI validation and improve layout for Cert PEM & JWKS Endpoint input fields

## Bug Fixes
* [Issue #515](https://github.com/openziti/ziti-console/issues/515) - Show sub-tab navigation options for list page header


# ziti-console-lib-v0.6.0
## Feature/Improvements
* [Issue #512](https://github.com/openziti/ziti-console/issues/512) - New JWT Signers List Page and Edit Form

# app-ziti-console-v3.5.0
# ziti-console-lib-v0.5.0

## Feature/Improvements
* [Issue #486](https://github.com/openziti/ziti-console/issues/486) - New Terminators List Page and Edit Form

## Bug Fixes
* [Issue #492](https://github.com/openziti/ziti-console/issues/492) - Simple service form is limited to only 30 identities


# ziti-console-lib-v0.4.10
## Bug Fixes
* [Issue #482](https://github.com/openziti/ziti-console/issues/482) - Save search filters when navigating between the list page and edit screen
* [Issue #487](https://github.com/openziti/ziti-console/issues/487) - Visualizer: router hosted service link showing error state.
* [Issue #477](https://github.com/openziti/ziti-console/issues/477) - Identity role attributes aren't showing for the host/accessing configurations on the simple service form

# app-ziti-console-v3.4.7
# ziti-console-lib-v0.4.9
* [Issue #476](https://github.com/openziti/ziti-console/issues/476) - Reduce application bundle size using production configuration
* [Issue #478](https://github.com/openziti/ziti-console/issues/478) - Fix display of identity "role" attributes on simple service form

# ziti-console-lib-v0.4.8
* [Issue #469](https://github.com/openziti/ziti-console/issues/469) - Validation for the names on simple service summary screen
* [Issue #434](https://github.com/openziti/ziti-console/issues/467) - Allow users to navigate to the config edit page via the "Associated Configs" pod


# app-ziti-console-v3.4.6
# ziti-console-lib-v0.4.7

## Feature/Improvements
* [Issue #459](https://github.com/openziti/ziti-console/issues/459) - Enable extension of data-table filters via the ExtensionService class
* [Issue #434](https://github.com/openziti/ziti-console/issues/434) - Allow filtering of Identities list page via "isAdmin"

## Bug Fixes
* [Issue #457](https://github.com/openziti/ziti-console/issues/457) - Table is not resized when browzer size changes


# ziti-console-lib-v0.4.6

## Bug Fixes
* [Issue #450](https://github.com/openziti/ziti-console/issues/450) - Hide the navigation bar when session expires and routing to login page
* [Issue #452](https://github.com/openziti/ziti-console/issues/452) - Correctly show associated entities when using the #all attribute
* [Issue #453](https://github.com/openziti/ziti-console/issues/453) - AppData is not persisting when adding via the JSON editor on edit forms
* [Issue #455](https://github.com/openziti/ziti-console/issues/455) - Prevent overflow of attribute items with long names in tag selector component
* [Issue #457](https://github.com/openziti/ziti-console/issues/457) - Table is not resized when browzer size changes

# app-ziti-console-v3.4.5
## Bug Fixes
* [Issue #444](https://github.com/openziti/ziti-console/issues/444) - BASE_HREF is wrongly quoted


# app-ziti-console-v3.4.4
# ziti-console-lib-v0.4.4

## Bug Fixes
* [Issue #441](https://github.com/openziti/ziti-console/issues/441) - Unable to Add resources on Identities, routers, router policies, or service router policies


# app-ziti-console-v3.4.3
# ziti-console-lib-v0.4.3

## Bug Fixes
* [Issue #432](https://github.com/openziti/ziti-console/issues/432) - Persist changes to config when editing in JSON view
* [Issue #437](https://github.com/openziti/ziti-console/issues/437) - Enable "deep link" navigation for dynamic routes

# app-ziti-console-v3.4.2
# ziti-console-lib-v0.4.2
*
## Feature/Improvements
* [Issue #430](https://github.com/openziti/ziti-console/issues/416) - New Service Edge Router Policies List Page and Form
* [Issue #416](https://github.com/openziti/ziti-console/issues/416) - Enable "deep routes" for create/edit pages (Configs, Service Policies, Edge Router Policies)

## Bug Fixes
* [Issue #424](https://github.com/openziti/ziti-console/issues/424) - Trim names on form data to get rid of white spaces


# app-ziti-console-v3.4.1
# ziti-console-lib-v0.4.1
*
## Feature/Improvements
* [Issue #416](https://github.com/openziti/ziti-console/issues/416) - Enable "deep routes" for create/edit pages


# app-ziti-console-v3.4.0
# ziti-console-lib-v0.4.0
*
## Feature/Improvements
* [Issue #399](https://github.com/openziti/ziti-console/issues/399) - New Edge Router Policy List Page
* [Issue #409](https://github.com/openziti/ziti-console/issues/409) - New Edge Router Policy Create/Edit Form

## Bug Fixes
* [Issue #410](https://github.com/openziti/ziti-console/issues/410) - Clicking outside the "More Actions" drop down does not close the menu

# app-ziti-console-v3.3.1
# ziti-console-lib-v0.3.1
*
## Feature/Improvements
* Updated README.md files with new banner descriptions and assets

## Bug Fixes
* [Issue #403](https://github.com/openziti/ziti-console/issues/403) - Can't filter by attribute on Service Policies page


# app-ziti-console-v3.3.0
# ziti-console-lib-v0.3.0
*
## Feature/Improvements
* [Issue #384](https://github.com/openziti/ziti-console/issues/384) - New Service Policy List Page
* [Issue #390](https://github.com/openziti/ziti-console/issues/390) - New Service Policy Create/Edit Form
* [Issue #388](https://github.com/openziti/ziti-console/issues/388) - Cert auth and runtime base href

## Bug Fixes
* [Issue #385](https://github.com/openziti/ziti-console/issues/385) - Identity Service Path Visualizer: Improved error handling to prevent unresponsive rendering


# app-ziti-console-v3.2.3
# ziti-console-lib-v0.2.3
*
## Feature/Improvements
* [Issue #376](https://github.com/openziti/ziti-console/pull/376) - Improve handling of error responses from ziti controller

## Bug Fixes
* [Issue #381](https://github.com/openziti/ziti-console/issues/381) - Can't filter by name on the identities list page


# app-ziti-console-v3.2.2
# ziti-console-lib-v0.2.2
*

## Bug Fixes
* [Issue #378](https://github.com/openziti/ziti-console/issues/378) - Can't add new attributes on service-polices page


# app-ziti-console-v3.2.1
# ziti-console-lib-v0.2.1
*
## Feature/Improvements
* [Issue #362](https://github.com/openziti/ziti-console/pull/362) - Mouse over event displays node information in tooltip box

## Bug Fixes
* [Issue #361](https://github.com/openziti/ziti-console/pull/361) - Fix editing and saving of configs on the Config Management page
* [Issue #372](https://github.com/openziti/ziti-console/pull/372) - show the identity service path visualizer menu for all identities


# app-ziti-console-v3.2.0
# ziti-console-lib-v0.2.0
*
## Feature/Improvements
* [Issue #338](https://github.com/openziti/ziti-console/issues/338) - Enable "Re-enroll" edge router feature in ZAC
* [Issue #323](https://github.com/openziti/ziti-console/issues/323) - Allow ZAC extensions to define additional items for the "More Actions" drop down
* [Issue #344](https://github.com/openziti/ziti-console/issues/344) - Service Path "Visualizer" for Identities

## Bug Fixes
* [Issue #315](https://github.com/openziti/ziti-console/issues/315) - v3.1.0 displays version "ZAC:undefined"
* [Issue #316](https://github.com/openziti/ziti-console/issues/316) - reissue endpoint identity failed
* [Issue #320](https://github.com/openziti/ziti-console/issues/320) - Service & Config selections for defining Identity Overrides need to be debounced
* [Issue #349](https://github.com/openziti/ziti-console/issues/349) - ER Token & JWT button are still displayed after enrollments is expired
* [Issue #351](https://github.com/openziti/ziti-console/issues/351) - More options on identity creation form should be hidden until after creation
* [Issue #352](https://github.com/openziti/ziti-console/issues/352) - Tag selector rendering issues
* [Issue #356](https://github.com/openziti/ziti-console/issues/356) - ZAC and controller version don't display on nav bar when running ng build ziti-console

# app-ziti-console-v3.1.0
# ziti-console-lib-v0.1.0
*
## Features/Improvements
* [Issue #299](https://github.com/openziti/ziti-console/issues/299) - New "Simple Service" form for defining a ziti service, service policies, & configs
* [Issue #285](https://github.com/openziti/ziti-console/issues/285) - Summary details for new "Simple Service" creation
*
## Bug Fixes
* [Issue #261](https://github.com/openziti/ziti-console/pull/291) - Issues when creating/editing configs on advanced service form
* [Issue #297](https://github.com/openziti/ziti-console/pull/297) - Download JWT isn't working for routers list page
* [Issue #293](https://github.com/openziti/ziti-console/pull/293) - Issues with simple service form attribute selections
* [Issue #310](https://github.com/openziti/ziti-console/pull/310) - Router name does not populate in delete modal.
* [Issue #310](https://github.com/openziti/ziti-console/pull/307) - Error messages for invalid forwarding config fields in the "Advanced Service" editor are not helpful

# app-ziti-console-v3.0.8
## Bug Fixes

* [Issue #275](https://github.com/openziti/ziti-console/issues/275) - The "Select Edge Controller" dropdown is hidden on the login page after logout

# ziti-console-lib-v0.0.10

## Bug Fixes

* [Issue #265](https://github.com/openziti/ziti-console/issues/265) - Titles and page text don't display if locale region is anything other than en-us
* [Issue #268](https://github.com/openziti/ziti-console/issues/268) - Only 10 Services and Configurations are listing while overriding services to Identity
* [Issue #267](https://github.com/openziti/ziti-console/issues/267) - Minute value in the "Created At" column of Identities and Routers is always showing the same value

# app-ziti-console-v3.0.7

## Features/Improvements
* [Issue #261](https://github.com/openziti/ziti-console/pull/261) - Refactor references in /assets to enable dynamic baseHref configuration

# ziti-console-lib-v0.0.9

## Bug Fixes

* [Issue #258](https://github.com/openziti/ziti-console/issues/258) - SAVE button is pushed off the page if entity name has a large number of characters
* [Issue #237](https://github.com/openziti/ziti-console/issues/237) - Click outside to close table menu

# app-ziti-console-v3.0.6

## Features/Improvements
* [Issue #251](https://github.com/openziti/ziti-console/pull/251) - Check if ZAC origin is has available Edge API's and only show Username/Password screen if so


# ziti-console-lib-v0.0.8

## Bug Fixes

* [Issue #220](https://github.com/openziti/ziti-console/issues/220) - Error growlers are not showing when ZAC is running directly against an edge controller
* [Issue #222](https://github.com/openziti/ziti-console/issues/222) - Drop down menu for list pages appears off screen for items at the bottom
* [Issue #225](https://github.com/openziti/ziti-console/issues/225) - Can't create new certificate authorities
* [Issue #226](https://github.com/openziti/ziti-console/issues/226) - Dashboard - displayed count for Services in the "Summary" section is incorrect
* [Issue #241](https://github.com/openziti/ziti-console/issues/241) - QR Code and JWT icons not showing in list table after re-issuing enrollment tokens for identities

## Features/Improvements
* [Issue #186](https://github.com/openziti/ziti-console/issues/186) - Display items to be deleted in prompt
* [Issue #218](https://github.com/openziti/ziti-console/issues/218) - Enable re-issue of expired tokens


# Release 3.0.3

## Bug Fixes

* [Issue #207](https://github.com/openziti/ziti-console/issues/207) - Entity type name is missing from the "No Items" display on some list pages
* [Issue #208](https://github.com/openziti/ziti-console/issues/208) - Router Role Attributes and Service Role Attributes are not populating while creating Service/Router Policies
* [Issue #212](https://github.com/openziti/ziti-console/issues/212) - Router count on dashboard does not display correctly


# Release 3.0.2
* Issue #203 - Fixed styling inconsistencies between old list tables and new ag-grid tables
* Issue #204 - Updated fields for Identities, and Routers CSV download file
* Issue #205 - Fixed display of Registration Token/QR Code Component

# Release 3.0.1
* New Angular list page and create/edit form for Edge Routers
* Updated new scripts with proper license headers

# Release 3.0.0
* Integration of new Angular shared library ziti-console-lib and Angular project app-ziti-console

# Release 2.9.4
* Fix role attribute view in router list
* Change the UI to work with the new controller requirements for POST content Issue #173

# Release 2.9.3
* Bug #169 Fix Spelling Issue
* Bug #170 Fix Saving External Auth Url on JWT Signer
* Feature #156 Add Roll over descriptions to toggle switches
* Bug #171 Remove Add Option to Sessions
* Feature #141 Tab Index set when form opens

# Release 2.9.2
* Bug #157 Code Fields Scroll to position on change

# Release 2.9.1
* Do not show re-enrollment for identities without initial enrollment

# Release 2.9.0
* Fix the Docker Script Execution

# Release 2.8.8
* Add https to Signal Shutdown reponse

# Release 2.8.7
* Add Bing IP to Https Server Declaration

# Release 2.8.6
* Click name to edit
* Add Roles to Identity Table
* Minor Style fixes
* Overflow table scrolling
* Issue #161 - Fix UI inconsistancy
* Issue #160 - Add setting to bind to specific IP
* Issue #158 - Make Tags more visible
* Issue #163 - Fixed Ccode copy on json field in forms
* Issue #164 - Leave IsAdmin visible regardless of identity type

# Release 2.8.5
* Fix Scroll position for Jwt Signer on Change
* Fix ott download issue
* Fix Issue where code mirror pulls you from selecting attribute

# Release 2.8.4
* Issue #119 - Handle generic kill signals
* Issue #151 - Update UI to fix Service Changing OTT property
* Issue #152 - Change property for ott ca jwt
* Issue #150 - Fix External Clim property

# Release 2.8.3
* Fix selectors on Posture Checks
* Add Script Api Call Reference Fields
* Fix Tag Add Icon Button

# Release 2.8.2
* Fill session credential leak in files
* Fix editable not being exposed to ui

# Release 2.8.1
* Add Enrollment Reset to identity list

# Release 2.7.8
* Show cli command list and web service call list for quick service creation
* Change the command list to have an array of operations
* Create a csh/bat download for cli commands

# Release 2.7.7
* Differentiate the enter key on login vs adding controller

# Release 2.7.6
* Fix a group of basic security concerns

# Release 2.7.5
* Fix issue with server exposing settings
* Fix issues with setting controller data after login to another controller

# Release 2.7.4
* Fix drag issue on service policies
* Initial implementation of viewing operations in simple identity creation
* Remove GTag it should not be in the open source project

# Release 2.7.3
* Quick add Simple Identity feature
* Quick add Simple Tunnel Service Feature

# Release 2.7.2
* Fix duplicate files downloading for identity jwts
* Make tables maintain a width for names if things fall off
* Localize Identities Screen
* Fix Dragging on Api Sessions & Sessions
* Remove Animation on Dragging Tables
* Fix Sorting session by creation
* Add Color settings to settings file
* Add Custom logo to settings file
* Add External Claims Info to CA
* Visibily Seperate Kid & Jwks on Jwt Signers

# Release 2.7.1
* Fix bug where suggested hash vales did not perpend the hash on selection

# Release 2.7.0
* Fix issues with identity/service overrides

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
