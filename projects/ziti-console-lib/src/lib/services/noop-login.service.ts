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

import {Injectable, Inject} from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import {LoginServiceClass} from "./login-service.class";
import {SETTINGS_SERVICE} from "./settings.service";
import {SettingsServiceClass} from "./settings-service.class";
import {GrowlerService} from "../features/messaging/growler.service";

@Injectable({
    providedIn: 'root'
})
export class NoopLoginService extends LoginServiceClass {

    constructor(
        override httpClient: HttpClient,
        @Inject(SETTINGS_SERVICE) override settingsService: SettingsServiceClass,
        override router: Router,
        override growlerService: GrowlerService
    ) {
        super(httpClient, settingsService, router, growlerService);
    }

    override init() {}

    clearSession() {
    }

    hasSession(): boolean {
        return false;
    }

    login(prefix: string, url: string, username: string, password: string) {
    }

    logout() {
    }

    observeLogin(serviceUrl: string, username: string, password: string) {
    }
}
