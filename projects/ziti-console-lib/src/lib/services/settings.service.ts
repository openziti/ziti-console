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

import {Injectable, Inject, InjectionToken} from '@angular/core';
import {firstValueFrom, map, tap} from "rxjs";
import {catchError} from "rxjs/operators";
import {isEmpty, defer} from "lodash";
import { HttpBackend, HttpClient } from "@angular/common/http";
import {SettingsServiceClass} from "./settings-service.class";
import {GrowlerService} from "../features/messaging/growler.service";
import {GrowlerModel} from "../features/messaging/growler.model";
import moment from "moment/moment";

export const SETTINGS_SERVICE = new InjectionToken<SettingsServiceClass>('SETTINGS_SERVICE');

const DEFAULTS = {
    "session": {},
    "jwtToken": null,
    "edgeControllers": [],
    "haCluster": {
        "enabled": false,
        "controllers": []
    },
    "controllerSessions": {},
    "editable": true,
    "update": false,
    "location": "../ziti",
    "protocol": "http",
    "host": "localhost",
    "port": 1408,
    "portTLS": 8443,
    "rejectUnauthorized": false,
    "mail": {
        "host": "",
        "port": 25,
        "secure": false,
        "auth": {
            "user": "",
            "pass": ""
        }
    },
    "from": "",
    "to": "",
}

const DEFAULT_API_VERSIONS: any = {
    "edge": {
      "v1": {
        "apiBaseUrls": [
          `${window.origin}/edge/client/v1`
        ],
        "path": "/edge/client/v1"
      }
    },
    "edge-client": {
      "v1": {
        "apiBaseUrls": [
          `${window.origin}/edge/client/v1`
        ],
        "path": "/edge/client/v1"
      }
    },
    "edge-management": {
      "v1": {
        "apiBaseUrls": [
          `${window.origin}/edge/management/v1`
        ],
        "path": "/edge/management/v1"
      }
    }
  };

@Injectable({
    providedIn: 'root'
})
export class SettingsService extends SettingsServiceClass {

    override allowControllerAdd = true;

    constructor(override httpBackend: HttpBackend, override growlerService: GrowlerService) {
        super(httpBackend, growlerService);
    }

    init() {
        this.get();
        this.version();

        if (this.settings.port && !isNaN(this.settings.port)) this.port = this.settings.port;
        if (this.settings.portTLS && !isNaN(this.settings.portTLS)) this.portTLS = this.settings.portTLS;
        if (this.settings.rejectUnauthorized && !isNaN(this.settings.rejectUnauthorized)) this.rejectUnauthorized = this.settings.rejectUnauthorized;
        if (this.settings.selectedEdgeController) return this.initApiVersions(this.settings.selectedEdgeController);
        else return Promise.resolve();
    }

    override loadSettings() {
        //this is a no-op for the default settings service
    }

    override hasSession() {
        const hasSessionId = !isEmpty(this.settings?.session?.id);
        return hasSessionId;
    }

    override controllerSave(name: string, url: string) {
        url = url.split('#').join('').split('?').join('');
        if (url.endsWith('/')) url = url.substr(0, url.length - 1);
        if (!url.startsWith('https://') && !url.startsWith('http://')) url = 'https://' + url;
        const callUrl = url + "/edge/management/v1/version?rejectUnauthorized=" + this.rejectUnauthorized;
        firstValueFrom(this.httpClient.get(callUrl).pipe(catchError((err: any) => {
            throw "Edge Controller not Online: " + err?.message;
        }))).then((body: any) => {
            try {
                if (body.error) {
                  let growlerData = new GrowlerModel(
                    'error',
                    'Error',
                    'Invalid Edge Controller: ' + body.error,
                  );
                  this.growlerService.show(growlerData);
                } else {
                    if (body?.data?.apiVersions?.edge?.v1 != null) {
                        this.apiVersions = body.data.apiVersions;
                        let found = false;
                        if (this.settings.edgeControllers?.length > 0) {
                            for (let i = 0; i < this.settings.edgeControllers.length; i++) {
                                if (this.settings.edgeControllers[i].url == url) {
                                    found = true;
                                    this.settings.edgeControllers[i].name = name;
                                    this.settings.edgeControllers[i].url = url;
                                    break;
                                }
                            }
                        }
                        if (!found) {
                            let isDefault = false;
                            if (!this.settings.edgeControllers) this.settings.edgeControllers = [];
                            if (this.settings.edgeControllers?.length === 0) isDefault = true;
                            this.settings.edgeControllers.push({
                                name: name,
                                url: url,
                                default: isDefault
                            });
                        }
                        this.settings.selectedEdgeController = url;
                        this.set(this.settings);

                    } else {
                      let growlerData = new GrowlerModel(
                        'error',
                        'Error',
                        'Invalid Edge Controller: ' + JSON.stringify(body),
                      );
                      this.growlerService.show(growlerData);
                    }
                }
            } catch (e) {
                let growlerData = new GrowlerModel(
                  'error',
                  'Error',
                  'Invalid Edge Controller: ' + e,
                );
                this.growlerService.show(growlerData);
            }
        }).catch(err => {
            let growlerData = new GrowlerModel(
              'error',
              'Error',
              'Invalid Edge Controller: ' + err,
            );
            this.growlerService.show(growlerData);
        });
    }

    public initApiVersions(url: string) {
        url = url.split('#').join('').split('?').join('');
        if (url.endsWith('/')) url = url.substr(0, url.length - 1);
        if (!url.startsWith('https://') && !url.startsWith('http://')) url = 'https://' + url;
        const callUrl = url + "/edge/management/v1/version?rejectUnauthorized=false";
        return firstValueFrom(this.httpClient.get(callUrl)
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
                    this.apiVersions = DEFAULT_API_VERSIONS;
                    const growlerData = new GrowlerModel(
                        'error',
                        'Error',
                        `Edge Controller`,
                        `Failed to connect to Edge Controller: ${err?.message}`,
                    );
                    const res: any = {data: this.apiVersions};
                    return Promise.resolve(res);
                }),
                map((body: any) => {
                    return body?.data?.apiVersions
                })));
    }

    /**
     * Add an HA controller to the cluster
     */
    addHAController(url: string, name: string): void {
        const haCluster = this.settings.haCluster || { enabled: false, controllers: [] };
        const exists = haCluster.controllers.find((c: any) => c.url === url);

        if (!exists) {
            haCluster.controllers.push({
                url,
                name,
                isOnline: true,
                lastHealthCheck: null
            });
            haCluster.enabled = haCluster.controllers.length > 1;

            this.settings.haCluster = haCluster;
            this.set(this.settings);
        }
    }

    /**
     * Remove an HA controller from the cluster
     */
    removeHAController(url: string): void {
        const haCluster = this.settings.haCluster || { enabled: false, controllers: [] };
        haCluster.controllers = haCluster.controllers.filter((c: any) => c.url !== url);
        haCluster.enabled = haCluster.controllers.length > 1;

        this.settings.haCluster = haCluster;

        // Also remove the session if exists
        if (this.settings.controllerSessions && this.settings.controllerSessions[url]) {
            delete this.settings.controllerSessions[url];
        }

        this.set(this.settings);
    }

    /**
     * Get all active sessions for HA controllers
     */
    getActiveSessions(): Map<string, string> {
        const sessions = new Map<string, string>();
        const controllerSessions = this.settings.controllerSessions || {};

        Object.keys(controllerSessions).forEach(url => {
            if (controllerSessions[url]) {
                sessions.set(url, controllerSessions[url]);
            }
        });

        return sessions;
    }

    /**
     * Set session token for an HA controller
     */
    setControllerSession(url: string, sessionToken: string): void {
        if (!this.settings.controllerSessions) {
            this.settings.controllerSessions = {};
        }

        this.settings.controllerSessions[url] = sessionToken;
        this.set(this.settings);
    }

    /**
     * Get session token for a specific controller
     */
    getControllerSession(url: string): string | null {
        const sessions = this.settings.controllerSessions || {};
        return sessions[url] || null;
    }

    /**
     * Clear all HA controller sessions
     */
    clearControllerSessions(): void {
        this.settings.controllerSessions = {};
        this.set(this.settings);
    }

    /**
     * Check if HA is enabled
     */
    isHAEnabled(): boolean {
        const haCluster = this.settings.haCluster || { enabled: false, controllers: [] };
        return haCluster.enabled && haCluster.controllers.length > 1;
    }

    /**
     * Get all HA controllers
     */
    getHAControllers(): any[] {
        const haCluster = this.settings.haCluster || { enabled: false, controllers: [] };
        return haCluster.controllers || [];
    }

    /**
     * Set JWT token for authentication
     */
    setJwtToken(token: string): void {
        this.settings.jwtToken = token;
        this.set(this.settings);
    }

    /**
     * Get JWT token
     */
    getJwtToken(): string | null {
        return this.settings.jwtToken || null;
    }

    /**
     * Clear JWT token
     */
    clearJwtToken(): void {
        this.settings.jwtToken = null;
        this.set(this.settings);
    }

    /**
     * Check if JWT token exists and is not expired
     */
    hasValidJwtToken(): boolean {
        const token = this.settings.jwtToken;
        if (!token) {
            console.log('[JWT] No JWT token found');
            return false;
        }

        try {
            // Decode JWT to check expiration (without verification)
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.log('[JWT] Token is not JWT format (not 3 parts):', token.substring(0, 20) + '...');
                return false;
            }

            const payload = JSON.parse(atob(parts[1]));
            const exp = payload.exp;

            if (!exp) {
                console.log('[JWT] JWT has no expiration, treating as valid');
                return true; // No expiration claim, assume valid
            }

            const isValid = exp * 1000 > Date.now();
            console.log('[JWT] JWT expiration check:', isValid, 'expires:', new Date(exp * 1000));
            // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
            return isValid;
        } catch (e) {
            console.error('[JWT] Failed to parse JWT token:', e);
            return false;
        }
    }
}
