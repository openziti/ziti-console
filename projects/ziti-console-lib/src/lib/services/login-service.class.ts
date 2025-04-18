import { Inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import {InjectionToken} from '@angular/core';
import { SETTINGS_SERVICE } from "./settings.service";
import { SettingsServiceClass } from "./settings-service.class";
import {GrowlerService} from "../features/messaging/growler.service";

export const ZAC_LOGIN_SERVICE = new InjectionToken<any>('ZAC_LOGIN_SERVICE');


export abstract class LoginServiceClass {

    public checkingControllerOrigin = false;
    public originIsController;
    public loginDialogOpen = false;
    public isCertBasedAuth = false;
    public certBasedAttempted = false;
    public serviceUrl = '';
    public loginInProgress = false;

    abstract init();
    abstract login(prefix: string, url: string, username: string, password: string, doNav?, type?, token?, isTest?);
    abstract observeLogin(serviceUrl: string, username: string, password: string, doNav?, type?, token?, isTest?);
    abstract clearSession();
    abstract checkOriginForController(): Promise<any>;
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

    decodeJwt(token: string): any {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid JWT token');
        }

        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
    }
}
