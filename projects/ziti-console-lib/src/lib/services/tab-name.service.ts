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

import {Inject, Injectable, InjectionToken} from '@angular/core';
import {SettingsServiceClass} from "./settings-service.class";
import {SETTINGS_SERVICE} from "./settings.service";

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
                {label: 'Recipes', url: '/recipes', hidden: !this.settings.supportedFeatures?.recipies},
                {label: 'Terminators', url: '/terminators'},
                {label: 'Posture Checks', url: '/posture-checks'},
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

    constructor(
        @Inject(ZITI_TAB_OVERRIDES) private interceptor: TabInterceptorService,
        @Inject(SETTINGS_SERVICE) private settings: SettingsServiceClass
    ) {
    }

    getTabs(key: string) {
        const val =  this.pageToTabsMap.get(key);
        return this.interceptor.override(key, val)
    }
}
