import { Inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import {InjectionToken} from '@angular/core';
import { SETTINGS_SERVICE } from "./settings.service";
import { SettingsServiceClass } from "./settings-service.class";
import {GrowlerService} from "../features/messaging/growler.service";

export const LOGIN_SERVICE = new InjectionToken<any>('LOGIN_SERVICE');


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
