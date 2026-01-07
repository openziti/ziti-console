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

import {Injectable} from '@angular/core';
import {isEmpty, defer} from "lodash";
import {HttpBackend} from "@angular/common/http";
import {SettingsServiceClass, GrowlerService, GrowlerModel} from "ziti-console-lib";
import {firstValueFrom, map, tap} from "rxjs";
import {catchError} from "rxjs/operators";
import {get} from "lodash";

@Injectable({
    providedIn: 'root'
})
export class NodeSettingsService extends SettingsServiceClass {

    override supportedFeatures: any = {
        organization: true,
        tags: true,
        customFields: true,
        mailer: true,
        recipes: true
    }
 
    hasNodeSession = false;
    constructor(override httpBackend: HttpBackend, override growlerService: GrowlerService) {
        super(httpBackend, growlerService);
    }

    async init() {
        this.get();
        this.version();

        if (this.settings.port && !isNaN(this.settings.port)) this.port = this.settings.port;
        if (this.settings.portTLS && !isNaN(this.settings.portTLS)) this.portTLS = this.settings.portTLS;
        if (this.settings.rejectUnauthorized && !isNaN(this.settings.rejectUnauthorized)) this.rejectUnauthorized = this.settings.rejectUnauthorized;
        return Promise.resolve();
    }

    hasSession() {
        return this.hasNodeSession;
    }

    override loadSettings() {
        const nodeServerURL = window.location.origin;
        const apiURL = nodeServerURL + '/api/settings';
        this.httpClient.post(
            apiURL,
            {},
            {
                headers: {
                    "content-type": "application/json"
                }
            }
        ).toPromise().then((result: any) => {
            if (!isEmpty(result?.error)) {
                let growlerData = new GrowlerModel(
                    'error',
                    'Error',
                    `Login Failed`,
                    result.error,
                );
                this.growlerService.show(growlerData);
            } else {
                let selectedController;
                result?.edgeControllers.forEach((controller) => {
                    if (controller.default) {
                        selectedController = controller.url;
                    }
                })
                this.settings.selectedEdgeController = selectedController || get(result, 'edgeControllers[0].url');
                this.settings.edgeControllers = result?.edgeControllers || [];
                this.set(this.settings);
            }
        }).catch((err) => {
            let growlerData = new GrowlerModel(
                'error',
                'Error',
                `Login Failed`,
                `Unable to connect - please make sure the URL is correct and the controller is online`,
            );
            this.growlerService.show(growlerData);
        });
    }

    override controllerSave(name, controllerURL) {
        const nodeServerURL = window.location.origin;
        const apiURL = nodeServerURL + '/api/controllerSave';
        return this.httpClient.post(
            apiURL,
            { url: controllerURL, name: name },
            {
                headers: {
                    "content-type": "application/json"
                }
            }
        ).toPromise().then((result: any) => {
            if (!isEmpty(result.error)) {
                let growlerData = new GrowlerModel(
                    'error',
                    'Error',
                    `Login Failed`,
                    result.error,
                );
                this.growlerService.show(growlerData);
                return result;
            } else {
                this.settings.selectedEdgeController = controllerURL;
                this.settings.edgeControllers = result.edgeControllers;
                this.set(this.settings);
            }
        }).catch((err) => {
            let growlerData = new GrowlerModel(
                'error',
                'Error',
                `Login Failed`,
                `Unable to connect - please make sure the URL is correct and the controller is online`,
            );
            this.growlerService.show(growlerData);
        });
    }

    public initApiVersions(url: string) {
        const options = {
            headers: {
                accept: 'application/json',
            },
            params: {},
            responseType: 'json' as const,
        };
        const callUrl = "/api/version";
        return firstValueFrom(this.httpClient.post(callUrl, {}, options)
            .pipe(
                tap((body: any) => {
                    try {
                        if (body.error) {
                            let growlerData = new GrowlerModel(
                              'error',
                              'Error',
                              'Invalid Edge Controller: ' + body.error,
                            );
                            this.growlerService.show(growlerData);
                        } else {
                            this.apiVersions = body.data.apiVersions;
                            this.zitiSemver = body.data?.version?.replace("v", "");
                        }
                    } catch (e) {
                      let growlerData = new GrowlerModel(
                        'error',
                        'Error',
                        'Invalid Edge Controller: ' + body,
                      );
                      this.growlerService.show(growlerData);
                    }
                }),
                catchError((err: any) => {
                    throw "Edge Controller not Online: " + err?.message;
                }),
                map(body => body.data.apiVersions)));
    }
}
