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
import {HttpBackend, HttpClient} from "@angular/common/http";
import {BehaviorSubject, firstValueFrom, map, tap} from "rxjs";
import {catchError} from "rxjs/operators";
import {GrowlerService} from "../features/messaging/growler.service";

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

@Injectable({
    providedIn: 'root'
})
export abstract class SettingsServiceClass {

    name = "settings";
    settings: any = {};
    versionData: any = {};
    settingsChange = new BehaviorSubject<any>({})
    rejectUnauthorized = false;
    port = DEFAULTS.port;
    portTLS = DEFAULTS.portTLS;
    apiVersions: any[] = [];
    protocol = DEFAULTS.protocol;
    host = DEFAULTS.host;
    httpClient: HttpClient;

    public supportedFeatures: any = {
        organization: false,
        tags: false,
        customFields: false,
        mailer: false,
        recipes: false
    }

    constructor(protected httpBackend: HttpBackend, protected growlerService: GrowlerService) {
        this.httpClient = new HttpClient(httpBackend);
    }

    public abstract init();
    public abstract controllerSave(name: string, url: string);
    public abstract initApiVersions(url);
    public abstract loadSettings();

    public get() {
        const tmp = localStorage.getItem('ziti.settings');
        if (tmp) {
            this.settings = JSON.parse(tmp);
        } else {
            this.settings = {...DEFAULTS};
            localStorage.setItem('ziti.settings', JSON.stringify(this.settings));
        }
        settings.data = this.settings;
        context.set(this.name, this.settings);
        this.settingsChange.next(this.settings)
    }

    public set(data: any) {
        this.settings = data;
        localStorage.setItem('ziti.settings', JSON.stringify(data));
        context.set(this.name, this.settings);
        this.settingsChange.next(this.settings);
    }

    public version() {
        this.versionData = localStorage.getItem('ziti.version');
        context.set("version", this.versionData);
        this.settings = {...this.settings, version: this.versionData};
        this.settingsChange.next(this.settings)
    }

    public delete(url: string) {
        service.call("server", {url: url}, this.deleted, "DELETE");
    }

    public deleted(e: any) {
        if (page != null && page.deleting != null && page.deleting == this.versionData.baseUrl) {
            window.location.href = "/login";
        }
    }

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

    public addContoller(name: string, url: string) {
        if (name.trim().length == 0 || url.trim().length == 0) {
            growler.error("Name and URL required");
        } else {
            this.controllerSave(name, url);
        }
    }
}
