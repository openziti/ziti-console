import {Injectable, Inject, InjectionToken} from '@angular/core';
import {firstValueFrom, map, tap} from "rxjs";
import {catchError} from "rxjs/operators";
import {isEmpty, defer} from "lodash";
import {HttpBackend, HttpClient} from "@angular/common/http";
import {SettingsServiceClass} from "./settings-service.class";
import {GrowlerService} from "../features/messaging/growler.service";
import {GrowlerModel} from "../features/messaging/growler.model";

export const SETTINGS_SERVICE = new InjectionToken<SettingsService>('SETTINGS_SERVICE');

// @ts-ignore
const {service, growler, context, page, settings} = window;
const DEFAULTS = {
    "session": {},
    "edgeControllers": [],
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
          "https://7caca86d-20ae-4996-9475-ce96926fe19e.staging.netfoundry.io:443/edge/client/v1"
        ],
        "path": "/edge/client/v1"
      }
    },
    "edge-client": {
      "v1": {
        "apiBaseUrls": [
          "https://7caca86d-20ae-4996-9475-ce96926fe19e.staging.netfoundry.io:443/edge/client/v1"
        ],
        "path": "/edge/client/v1"
      }
    },
    "edge-management": {
      "v1": {
        "apiBaseUrls": [
          "https://7caca86d-20ae-4996-9475-ce96926fe19e.staging.netfoundry.io:443/edge/management/v1"
        ],
        "path": "/edge/management/v1"
      }
    }
  };

@Injectable({
    providedIn: 'root'
})
export class SettingsService extends SettingsServiceClass {

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

    override controllerSave(name: string, url: string) {
        url = url.split('#').join('').split('?').join('');
        if (url.endsWith('/')) url = url.substr(0, url.length - 1);
        if (!url.startsWith('https://')) url = 'https://' + url;
        const callUrl = url + "/edge/management/v1/version?rejectUnauthorized=" + this.rejectUnauthorized;
        firstValueFrom(this.httpClient.get(callUrl).pipe(catchError((err: any) => {
            throw "Edge Controller not Online: " + err?.message;
        }))).then((body: any) => {
            try {
                if (body.error) {
                    growler.error("Invalid Edge Controller: " + body.error);
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
                        growler.error("Invalid Edge Controller: " + JSON.stringify(body));
                    }
                }
            } catch (e) {
                growler.error("Invalid Edge Controller: " + e);
            }
        }).catch(err => {
            growler.error(err);
        });
    }

    public initApiVersions(url: string) {
        url = url.split('#').join('').split('?').join('');
        if (url.endsWith('/')) url = url.substr(0, url.length - 1);
        if (!url.startsWith('https://')) url = 'https://' + url;
        const callUrl = url + "/edge/management/v1/version?rejectUnauthorized=false";
        return firstValueFrom(this.httpClient.get(callUrl)
            .pipe(
                tap((body: any) => {
                    try {
                        if (body.error) {
                            growler.error("Invalid Edge Controller: " + body.error);
                        } else {
                            this.apiVersions = body.data.apiVersions;
                        }
                    } catch (e) {
                        growler.error("Invalid Edge Controller: " + body);
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
}
