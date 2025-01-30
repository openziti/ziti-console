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
import {HttpClient} from "@angular/common/http";
import {LoginServiceClass, SettingsServiceClass, GrowlerService, GrowlerModel, SETTINGS_SERVICE} from "ziti-console-lib";
import {firstValueFrom, lastValueFrom, Observable, ObservableInput, of, switchMap, tap} from "rxjs";
import {catchError} from "rxjs/operators";
import {Router} from "@angular/router";
import moment from "moment";
import {debounce, defer, isEmpty, isNil} from "lodash";

@Injectable({
    providedIn: 'root'
})
export class ControllerLoginService extends LoginServiceClass {
    private domain = '';

    constructor(
        override httpClient: HttpClient,
        @Inject(SETTINGS_SERVICE) override settingsService: SettingsServiceClass,
        override router: Router,
        override growlerService: GrowlerService,
    ) {
        super(httpClient, settingsService, router, growlerService);
    }

    async init() {
        return Promise.resolve();
    }

    async login(prefix: string, url: string, username: string, password: string, doNav = true): Promise<any> {
        return this.controllerLogin(prefix, url, username, password, doNav);
    }

    checkOriginForController(): Promise<any> {
        const controllerUrl = window.location.origin;
        return this.settingsService.initApiVersions(controllerUrl).then((result) => {
            if (isNil(result) || isEmpty(result)) {
                return false;
            } else {
                return true;
            }
        }).catch((result) => {
            return false;
        });
    }

    controllerLogin(prefix: string, url: string, username: string, password: string, doNav = true): Promise<any> {
        this.domain = url;
        const serviceUrl = url + prefix;
        return lastValueFrom(this.observeLogin(serviceUrl, username, password, doNav)
        ).then(() => {
            if (doNav) {
                this.router.navigate(['/']);
            }
        });
    }

    observeLogin(serviceUrl: string, username?: string, password?: string, doNav = true) {
        const queryParams = username && password ? '?method=password' : '?method=cert';
        const requestBody = username && password ? { username, password } : undefined;
        const endpoint = serviceUrl + '/authenticate';

        return this.httpClient.post(endpoint + queryParams, requestBody, {
            headers: {
                "content-type": "application/json",
            }
        })
            .pipe(
                switchMap((body: any) => {
                    return this.handleLoginResponse.bind(this)(body, username, password)
                }),
                catchError((err: any) => {
                    let errorMessage, growlerData;
                    if (err.code === "ECONNREFUSED") {
                        errorMessage = `Server Not Accessible. Please make sure controller is online.`;
                        growlerData = new GrowlerModel(
                            'error',
                            'Error',
                            `Login Failed`,
                            errorMessage,
                        );
                    } else {
                        const status = err?.statusText;
                        const code = '- ' + (err?.error?.code || status);
                        errorMessage = `Unable to login to selected edge controller ${code}. Please make sure the selected controller is online and accessible`;
                        growlerData = new GrowlerModel(
                            'error',
                            'Error',
                            `Login Failed`,
                            errorMessage,
                        );
                        if (doNav) {
                            this.router.navigate(['/login']);
                        }
                    }
                    if (doNav) {
                        if (this.settingsService?.settings?.session) {
                            this.settingsService.settings.session.id = undefined;
                        }
                        this.settingsService.set(this.settingsService.settings)
                    }
                    this.growlerService.show(growlerData);
                    throw({error: errorMessage, controllerInvalid: err?.status === 0, statusText: err?.statusText});
                })
            );
    }

    private handleLoginResponse(body: any, username: string, password: string): Observable<any> {
        if (body.error) throw body.error;
        const settings = {
            ...this.settingsService.settings, session: {
                id: body.data?.token,
                controllerDomain: this.domain,
                authorization: 100,
                expiresAt: body.data.expiresAt,
                expirationSeconds: body.data.expirationSeconds,
                username,
                password
            }
        }
        this.settingsService.set(settings);
        return of([body.data?.token]);
    }


    logout() {
        localStorage.removeItem('ziti.settings');
        this.settingsService.settings.session.id = undefined;
        this.settingsService.set(this.settingsService.settings);
        this.router.navigate(['/login']);
    }

    clearSession(): Promise<any>  {
        const serverUrl = this.settingsService.settings.protocol + '://' + this.settingsService.settings.host + ':' + this.settingsService.settings.port;
        const apiUrl = serverUrl + '/login?logout=true';
        const options = this.getHttpOptions();
        return this.httpClient.get(apiUrl, options).toPromise().then((resp: any) => {
            if(isEmpty(resp?.error)) {
                defer(() => {
                    window.location.href = window.location.origin + '/login';
                });
            } else {
                this.growlerService.show(
                    new GrowlerModel(
                        'error',
                        'Error',
                        'Logout Error',
                        resp?.error,
                    )
                );
            }
        }).catch((resp) => {
            return false;
        });
    }
}
