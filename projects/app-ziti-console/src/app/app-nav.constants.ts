/*
    Copyright NetFoundry Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import {URLS} from "./app-urls.constants";
import {environment} from "./environments/environment";

export const ZITI_CONSOLE_NAVIGATOR = {
    groups: [
        {
            label: '',
            menuItems: [
                {
                    label: 'Dashboard',
                    route: URLS.ZITI_DASHBOARD,
                    iconClass: 'icon-dashboard',
                    selectedRoutes: [URLS.ZITI_DASHBOARD]
                }
            ]
        },
        {
            label: 'Core Components',
            menuItems: [
                {
                    label: 'Identities',
                    route: URLS.ZITI_IDENTITIES,
                    iconClass: 'icon-identity',
                    selectedRoutes: [URLS.ZITI_IDENTITIES]
                },
                {
                    label: 'Services',
                    route: URLS.ZITI_SERVICES,
                    iconClass: 'icon-services',
                    selectedRoutes: [URLS.ZITI_SERVICES, URLS.ZITI_CONFIGS, URLS.ZITI_TERMINATORS, URLS.ZITI_CONFIG_TYPES]
                },
                {
                    label: 'Routers',
                    route: URLS.ZITI_ROUTERS,
                    iconClass: 'icon-routers',
                    selectedRoutes: [URLS.ZITI_ROUTERS, URLS.ZITI_TRANSIT_ROUTERS]
                }
            ]
        },
        {
            label: 'Access Rules',
            menuItems: [
                {
                    label: 'Policies',
                    route: URLS.ZITI_SERVICE_POLICIES,
                    iconClass: 'icon-policies',
                    selectedRoutes: [URLS.ZITI_SERVICE_POLICIES, URLS.ZITI_ROUTER_POLICIES, URLS.ZITI_SERVICE_ROUTER_POLICIES]
                },
                {
                    label: 'Posture Checks',
                    route: URLS.ZITI_POSTURE_CHECKS,
                    iconClass: 'icon-posturechecks',
                    selectedRoutes: [URLS.ZITI_POSTURE_CHECKS]
                }
            ]
        },
        {
            label: 'Management',
            menuItems: [
                {
                    label: 'Authentication',
                    route: URLS.ZITI_CERT_AUTHORITIES,
                    iconClass: 'icon-CAs',
                    selectedRoutes: [URLS.ZITI_CERT_AUTHORITIES, URLS.ZITI_AUTH_POLICIES, URLS.ZITI_JWT_SIGNERS]
                },
                {
                    label: 'Sessions',
                    route: URLS.ZITI_SESSIONS,
                    iconClass: 'icon-time',
                    selectedRoutes: [URLS.ZITI_SESSIONS, URLS.ZITI_API_SESSIONS]
                },
            ]
        }
    ]
}

export const CLASSIC_ZITI_NAVIGATOR = {
    groups: [
        {
            label: '',
            menuItems: [
                {
                    label: 'Dashboard',
                    route: URLS.ZITI_DASHBOARD,
                    iconClass: 'icon-dashboard',
                    selectedRoutes: [URLS.ZITI_DASHBOARD]
                },
                {
                    label: 'Identities',
                    route: URLS.ZITI_IDENTITIES,
                    iconClass: 'icon-identity',
                    selectedRoutes: [URLS.ZITI_IDENTITIES]
                },
                {
                    label: 'Recipies',
                    route: URLS.ZITI_RECIPES,
                    iconClass: 'icon-template',
                    selectedRoutes: [URLS.ZITI_RECIPES],
                    hidden: !environment.nodeIntegration
                },
                {
                    label: 'Services',
                    route: URLS.ZITI_SERVICES,
                    iconClass: 'icon-services',
                    selectedRoutes: [URLS.ZITI_SERVICES]
                },
                {
                    label: 'Configurations',
                    route: URLS.ZITI_CONFIGS,
                    iconClass: 'icon-services',
                    selectedRoutes: [URLS.ZITI_CONFIGS]
                },
                {
                    label: 'Policies',
                    route: URLS.ZITI_SERVICE_POLICIES,
                    iconClass: 'icon-servicepolicy',
                    selectedRoutes: [URLS.ZITI_SERVICE_POLICIES]
                },
                {
                    label: 'Routers',
                    route: URLS.ZITI_ROUTERS,
                    iconClass: 'icon-network-hub',
                    selectedRoutes: [URLS.ZITI_ROUTERS]
                },
                {
                    label: 'Authentication',
                    route: URLS.ZITI_CERT_AUTHORITIES,
                    iconClass: 'icon-certificates',
                    selectedRoutes: [URLS.ZITI_CERT_AUTHORITIES]
                },
                {
                    label: 'Sessions',
                    route: URLS.ZITI_SESSIONS,
                    iconClass: 'icon-time',
                    selectedRoutes: [URLS.ZITI_SESSIONS]
                },
            ]
        }
    ]
}
