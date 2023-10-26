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
                },
                {
                    label: 'Services',
                    route: URLS.ZITI_SERVICES,
                    iconClass: 'icon-services',
                },
                {
                    label: 'Routers',
                    route: URLS.ZITI_ROUTERS,
                    iconClass: 'icon-network-hub',
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
                    sublabel: '(AppWANs)',
                },
                {
                    label: 'Posture Checks',
                    route: URLS.ZITI_POSTURE_CHECKS,
                    iconClass: 'icon-posture',
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
                },
                {
                    label: 'Sessions',
                    route: URLS.ZITI_SESSIONS,
                    iconClass: 'icon-time',
                },
            ]
        }
    ]
}
