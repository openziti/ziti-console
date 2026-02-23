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
import {BehaviorSubject, Observable, Subscription} from "rxjs";
import {GrowlerModel, GrowlerService, SettingsServiceClass, ZitiDomainControllerService, ZitiSessionData, SETTINGS_SERVICE} from "ziti-console-lib";
import { HttpClient } from '@angular/common/http';

import {isEmpty, unset} from 'lodash';
import {Router} from "@angular/router";

@Injectable({
    providedIn: 'root'
})
export class SimpleZitiDomainControllerService implements ZitiDomainControllerService {

    zitiSessionData: ZitiSessionData = {
        zitiDomain: '',
        zitiSessionId: '',
        expiresAt: ''
    }
    subscription: Subscription = new Subscription();
    zitiSettings = new BehaviorSubject(this.zitiSessionData);
    constructor(
        @Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
        private http: HttpClient,
        private growlerService: GrowlerService,
        private router: Router,
    ) {

        this.subscription.add(this.settingsService.settingsChange.subscribe((results: any) => {
            if (isEmpty(results)) {
                return;
            }
            this.zitiSessionData.zitiSessionId = results.session.id;
            this.zitiSessionData.zitiDomain = results.session.controllerDomain;
            this.zitiSettings.next({...this.zitiSessionData});
        }));
    }

    handleUnauthorized() {
        unset(this.settingsService.settings, 'session');
        this.settingsService.set(this.settingsService.settings);
        this.router.navigate(['/login']);
        const model = new GrowlerModel(
            'error',
            'Error',
            `Unauthorized`,
            `Your current session is invalid. Returning to the login page.`,
        );
        this.growlerService.show(model);
    }
}
