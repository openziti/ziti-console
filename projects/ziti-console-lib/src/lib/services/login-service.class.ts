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

import { Inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import {InjectionToken} from '@angular/core';
import { SETTINGS_SERVICE } from "./settings.service";
import { SettingsServiceClass } from "./settings-service.class";
import {GrowlerService} from "../features/messaging/growler.service";

export const ZAC_LOGIN_SERVICE = new InjectionToken<any>('ZAC_LOGIN_SERVICE');


export abstract class LoginServiceClass {

    abstract init();
    abstract login(prefix: string, url: string, username: string, password: string);
    abstract observeLogin(serviceUrl: string, username: string, password: string);
    abstract hasSession(): boolean;
    abstract clearSession();
    abstract logout();

    constructor(
        protected httpClient: HttpClient,
        @Inject(SETTINGS_SERVICE) protected settingsService: SettingsServiceClass,
        protected router: Router,
        protected growlerService: GrowlerService
    ) { }

    public getHttpOptions() {
        const options: any = {
            headers: {
                accept: '*',
            },
            params: {},
            responseType: 'text' as const,
        };
        return options;
    }
}
