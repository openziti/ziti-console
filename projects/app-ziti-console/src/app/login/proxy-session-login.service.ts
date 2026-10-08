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
import {OAuthService} from 'angular-oauth2-oidc';
import {from, lastValueFrom, Observable} from 'rxjs';
import {ProxySessionSettingsService} from '../services/proxy-session-settings.service';
import {proxyUrl, readCsrfToken} from '../auth-mode';

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
        override growlerService: GrowlerService,
        private oauthService: OAuthService
    ) {
        super(httpClient, settingsService, router, growlerService);
    }

    init() {
        if (window.location.pathname.endsWith('/callback')) return Promise.resolve(false);
        return this.settingsService.refreshSessionStatus().then((authenticated) => {
            // A reload mid-MFA resumes the TOTP prompt for the session the proxy still holds.
            if (!authenticated && this.settingsService.mfaPending) this.pendingMfa = true;
            return authenticated;
        });
    }

    login(prefix: string, url: string, username: string, password: string, doNav = true, type?, token?, isTest?): Promise<any> {
        return lastValueFrom(this.observeLogin(url, username, password, doNav, type, token, isTest)).then(() => {
            if (doNav && !isTest) this.router.navigate(['/dashboard']);
            return {success: true};
        });
    }

    // isTest (the JWT-signer "test authentication" page) only checks the credential: the
    // proxy keeps no session for it, so the admin's own session stays.
    observeLogin(url: string, username: string, password: string, doNav = true, type?, token?, isTest?): Observable<any> {
        // selectedEdgeController is the same-origin /c/<id> path; extract the id so
        // the proxy authenticates against (and pins the session to) that controller.
        const controllerId = (url || '').match(/\/c\/([^/]+)/)?.[1];
        const body: any = {controllerId, username, password, type, token};
        if (isTest) body.test = true;
        return from(
            lastValueFrom(this.httpClient.post(proxyUrl('zac-session/login'), body,
                {headers: {'content-type': 'application/json'}}
            )).then(async (res: any) => {
                // The proxy now holds the session; the IdP tokens the browser got are not needed.
                if (type === 'ext-jwt') this.clearIdpTokens();
                if (res?.mfaRequired) {
                    this.beginMfa(res.authQueries);
                    throw {totpRequired: true};
                }
                if (res?.success) {
                    if (!isTest) {
                        await this.settingsService.refreshSessionStatus();
                        this.settingsService.set(this.settingsService.settings);
                    }
                    return [true];
                }
                throw {error: res?.error || 'Login failed'};
            }).catch((err: any) => {
                if (err?.totpRequired || err?.shown) throw err;
                const msg = err?.error?.error || err?.error || err?.message || 'Unable to login to the controller';
                this.growlerService.show(new GrowlerModel('error', 'Error', 'Login Failed', msg));
                throw {error: msg};
            })
        );
    }

    private beginMfa(authQueries: any[]) {
        const queries = authQueries || [];
        const totpQuery = queries.find((q) => q.typeId === 'MFA' || q.typeId === 'TOTP') || queries[0];
        this.pendingMfa = true;
        if (totpQuery && totpQuery.isTotpEnrolled === false) {
            this.cancelMfaAuth(); // also drops the proxy's half-authenticated session
            this.growlerService.show(new GrowlerModel(
                'error',
                'Error',
                'MFA Enrollment Required',
                'This identity requires MFA but is not yet enrolled. Complete TOTP enrollment with another client before logging in to the console.'
            ));
            throw {error: 'MFA enrollment required', shown: true};
        }
        this.mfaAuthQueries = queries;
    }

    override completeMfaAuth(code: string): Promise<any> {
        return lastValueFrom(this.httpClient.post(proxyUrl('zac-session/mfa'), {code},
            {headers: this.csrfHeaders({'content-type': 'application/json'})}
        )).catch((err: any) => {
            throw err?.error?.invalidCode ? {invalidCode: true} : {error: err?.error?.error || err?.message || 'Verification failed'};
        }).then(async () => {
            super.cancelMfaAuth();
            await this.settingsService.refreshSessionStatus();
            this.router.navigate(['/dashboard']);
            return true;
        });
    }

    // Dropping the half-authenticated session on the proxy, not just the local prompt.
    override cancelMfaAuth(): void {
        const wasPending = this.pendingMfa || this.settingsService.mfaPending;
        super.cancelMfaAuth();
        this.settingsService.mfaPending = false;
        if (wasPending) {
            this.httpClient.post(proxyUrl('zac-session/logout'), {}, {headers: this.csrfHeaders()}).subscribe({error: () => {}});
        }
    }

    hasSession(): boolean {
        return this.settingsService.hasProxySession;
    }

    logout() {
        this.httpClient.post(proxyUrl('zac-session/logout'), {}, {headers: this.csrfHeaders()}).subscribe({
            next: () => this.finishLogout(),
            error: () => {
                this.growlerService.show(new GrowlerModel('error', 'Error', 'Logout Failed',
                    'The server session could not be ended. It expires on its own when idle.'));
                this.finishLogout();
            },
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

    private csrfHeaders(headers: any = {}) {
        const csrf = readCsrfToken();
        if (csrf) headers['x-zac-csrf'] = csrf;
        return headers;
    }

    // Local-only: forget the IdP tokens angular-oauth2-oidc stored, without the IdP logout redirect.
    private clearIdpTokens() {
        try {
            this.oauthService.logOut(true);
        } catch (e) { /* nothing stored */ }
    }

    private finishLogout() {
        this.settingsService.hasProxySession = false;
        this.clearIdpTokens();
        localStorage.removeItem('ziti.settings');
        this.reloadToLogin();
    }

    // A full reload, so no in-memory state from the old session survives.
    protected reloadToLogin() {
        window.location.href = proxyUrl('login');
    }
}
