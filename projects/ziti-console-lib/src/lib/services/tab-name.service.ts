import {Inject, Injectable, InjectionToken} from '@angular/core';

export const ZITI_TAB_OVERRIDES = new InjectionToken<string>('ZITI_TAB_OVERRIDES');

export interface TabInterceptorService {
    override(key: string, tabs: any[]): any[];
}

export class NoopTabInterceptorService implements TabInterceptorService {
    override(key: string, tabs: any[]): any[] {
        return tabs;
    }
}

@Injectable({
    providedIn: 'root'
})
export class TabNameService {

    pageToTabsMap = new Map<string, any[]>(
        [
            ["identities", [
                {label: 'Identities', url: '/identities'},
                {label: 'Recipes', url: '/recipes', hidden: window['hideAdvancedZitiFeatures']},
                {label: 'Terminators', url: '/terminators'},
                {label: 'Posture Checks', url: '/config-posture-checks'},
            ]
            ],
            ["services", [
                {label: 'Services', url: '/services'},
                {label: 'Configurations', url: '/configs'},
                {label: 'Config Types', url: '/config-types'},
            ]
            ]
        ]
    );

    constructor(@Inject(ZITI_TAB_OVERRIDES) private interceptor: TabInterceptorService) {
    }

    getTabs(key: string) {
        const val =  this.pageToTabsMap.get(key);
        return this.interceptor.override(key, val)
    }
}
