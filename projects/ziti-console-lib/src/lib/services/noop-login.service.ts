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

    login(prefix: string, url: string, username: string, password: string) {
    }

    logout() {
    }

    observeLogin(serviceUrl: string, username: string, password: string) {
    }

    checkOriginForController(): Promise<any> {
        return Promise.resolve(true);
    }
}