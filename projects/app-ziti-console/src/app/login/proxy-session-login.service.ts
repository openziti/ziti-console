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

import {Inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {LoginServiceClass, GrowlerService, GrowlerModel, SETTINGS_SERVICE} from 'ziti-console-lib';
import {Router} from '@angular/router';
import {from, lastValueFrom, Observable} from 'rxjs';
import {ProxySessionSettingsService} from '../services/proxy-session-settings.service';
import {readCsrfToken} from '../auth-mode';

/**
 * Login service for proxy-session mode. Posts to /zac-session/login, which runs the
 * controller password or OIDC flow and keeps the token in a server-side session
 * (httpOnly cookie); nothing token-bearing is stored in the browser.
 */
@Injectable({providedIn: 'root'})
export class ProxySessionLoginService extends LoginServiceClass {
    override certBasedAttempted = true;

    constructor(
        override httpClient: HttpClient,
        @Inject(SETTINGS_SERVICE) override settingsService: ProxySessionSettingsService,
        override router: Router,
        override growlerService: GrowlerService
    ) {
        super(httpClient, settingsService, router, growlerService);
    }

    init() {
        if (window.location.pathname.endsWith('/callback')) return Promise.resolve(false);
        return this.settingsService.refreshSessionStatus();
    }

    login(prefix: string, url: string, username: string, password: string, doNav = true, type?, token?): Promise<any> {
        return lastValueFrom(this.observeLogin(url, username, password, doNav, type, token)).then(() => {
            if (doNav) this.router.navigate(['/dashboard']);
            return {success: true};
        });
    }

    observeLogin(url: string, username: string, password: string, doNav = true, type?, token?): Observable<any> {
        // selectedEdgeController is the same-origin /c/<id> path; extract the id so
        // the proxy authenticates against (and pins the session to) that controller.
        const controllerId = (url || '').match(/\/c\/([^/]+)/)?.[1];
        return from(
            lastValueFrom(this.httpClient.post('/zac-session/login',
                {controllerId, username, password, type, token},
                {headers: {'content-type': 'application/json'}}
            )).then(async (body: any) => {
                if (body?.success) {
                    await this.settingsService.refreshSessionStatus();
                    this.settingsService.set(this.settingsService.settings);
                    return [true];
                }
                throw {error: body?.error || 'Login failed'};
            }).catch((err: any) => {
                const msg = err?.error?.error || err?.error || err?.message || 'Unable to login to the controller';
                this.growlerService.show(new GrowlerModel('error', 'Error', 'Login Failed', msg));
                throw {error: msg};
            })
        );
    }

    hasSession(): boolean {
        return this.settingsService.hasProxySession;
    }

    logout() {
        const headers: any = {};
        const csrf = readCsrfToken();
        if (csrf) headers['x-zac-csrf'] = csrf;
        this.httpClient.post('/zac-session/logout', {}, {headers}).subscribe({
            next: () => this.finishLogout(),
            error: () => this.finishLogout(),
        });
    }

    clearSession(): Promise<any> {
        this.finishLogout();
        return Promise.resolve(true);
    }

    // Use the proxy's controller list + picker (populated by the settings service),
    // not origin-as-controller - so multiple controllers are selectable.
    checkOriginForController(): Promise<any> {
        return Promise.resolve(false);
    }

    private finishLogout() {
        this.settingsService.hasProxySession = false;
        localStorage.removeItem('ziti.settings');
        window.location.href = window.location.origin + '/login';
    }
}
