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

import {ZacWrapperService, COMPONENTS} from "./zac-wrapper.service";
import {EventEmitter, Inject, Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {Router} from "@angular/router";
import {ZITI_DOMAIN_CONTROLLER, ZitiDomainControllerService} from "../../services/ziti-domain-controller.service";
import {ZITI_URLS} from "../../ziti-console.constants";
import {Subscription} from "rxjs";
import {SETTINGS_SERVICE, SettingsService} from "../../services/settings.service";

import {get, set, isEmpty} from "lodash";
import {GrowlerService} from "../messaging/growler.service";
import {LoggerService} from "../messaging/logger.service";

@Injectable({providedIn: 'root'})
export class NodeWrapperService extends ZacWrapperService {

    constructor(
        @Inject(ZITI_DOMAIN_CONTROLLER) override zitiDomainController: ZitiDomainControllerService,
        @Inject(ZITI_URLS) override URLS:any,
        @Inject(SETTINGS_SERVICE) override settingsService: SettingsService,
        override http: HttpClient,
        override router: Router,
        override growlerService: GrowlerService,
        override loggerService: LoggerService
    ) {
        super(zitiDomainController, URLS, settingsService, http, router, growlerService, loggerService);
    }

    override initZac() {
        if (this.zacInit) {
            return;
        }
        const appInit = get(window, 'app.init');
        this.initZacListeners();
        this.zacInit = true;
    }
}
