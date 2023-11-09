import {URLS} from "./app-urls.constants";

export const OPEN_ZITI_NAVIGATOR = {
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
                    selectedRoutes: [URLS.ZITI_SERVICES]
                },
                {
                    label: 'Routers',
                    route: URLS.ZITI_ROUTERS,
                    iconClass: 'icon-network-hub',
                    selectedRoutes: [URLS.ZITI_ROUTERS]
                }
            ]
        },
        {
            label: 'Access Rules',
            menuItems: [
                {
                    label: 'Policies',
                    route: URLS.ZITI_SERVICE_POLICIES,
                    iconClass: 'icon-servicepolicy',
                    selectedRoutes: [URLS.ZITI_SERVICE_POLICIES]
                },
                {
                    label: 'Posture Checks',
                    route: URLS.ZITI_POSTURE_CHECKS,
                    iconClass: 'icon-posture',
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
