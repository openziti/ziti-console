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

import {Inject, Injectable, Injector} from '@angular/core';
import {SETTINGS_SERVICE} from './settings.service';
import {SettingsServiceClass} from './settings-service.class';
import {ZitiOidcService, OidcSessionUnrecoverableError} from './ziti-oidc.service';
import {ZAC_LOGIN_SERVICE} from './login-service.class';
import {GrowlerService} from '../features/messaging/growler.service';
import {GrowlerModel} from '../features/messaging/growler.model';
import {jwtExpMs, jwtIatMs} from './oidc-utils';

const DEFAULT_ACCESS_TOKEN_LIFETIME_MS = 30 * 60 * 1000;
const MIN_REFRESH_LEAD_MS = 60 * 1000;
const MIN_SCHEDULE_DELAY_MS = 5 * 1000;
const MONITOR_INTERVAL_MS = 60 * 1000;
const INITIAL_RETRY_MS = 30 * 1000;
const MAX_RETRY_MS = 5 * 60 * 1000;

/**
 * Keeps OIDC sessions alive by refreshing the access token before it expires, and
 * self-monitors for sessions that can no longer be renewed (refresh token expired or
 * revoked), logging the user out and returning them to the login page.
 */
@Injectable({
    providedIn: 'root'
})
export class SessionRefreshService {

    private refreshTimer: any = null;
    private monitorInterval: any = null;
    private retryDelayMs = INITIAL_RETRY_MS;
    private running = false;

    private readonly onWake = () => {
        if (document.visibilityState === 'visible') {
            this.checkSessionState();
        }
    };
    private readonly onStorage = (event: StorageEvent) => {
        if (event.key !== 'ziti.settings') {
            return;
        }
        this.settingsService.get();
        if (this.hasOidcSession()) {
            this.scheduleNextRefresh();
        } else {
            this.stop();
        }
    };

    constructor(
        @Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
        private oidcService: ZitiOidcService,
        private growlerService: GrowlerService,
        private injector: Injector
    ) {}

    start(): void {
        if (!this.hasOidcSession()) {
            return;
        }
        if (!this.running) {
            this.running = true;
            document.addEventListener('visibilitychange', this.onWake);
            window.addEventListener('focus', this.onWake);
            window.addEventListener('storage', this.onStorage);
            this.monitorInterval = setInterval(() => this.checkSessionState(), MONITOR_INTERVAL_MS);
        }
        this.checkSessionState();
        this.scheduleNextRefresh();
    }

    stop(): void {
        this.running = false;
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
        clearInterval(this.monitorInterval);
        this.monitorInterval = null;
        this.retryDelayMs = INITIAL_RETRY_MS;
        document.removeEventListener('visibilitychange', this.onWake);
        window.removeEventListener('focus', this.onWake);
        window.removeEventListener('storage', this.onStorage);
    }

    async refreshNow(): Promise<boolean> {
        const session = this.settingsService.settings?.session;
        if (session?.authMode !== 'oidc' || !session?.refreshToken) {
            return false;
        }
        const usedRefreshToken = session.refreshToken;
        try {
            const tokens = await this.oidcService.refreshTokens(
                session.controllerDomain,
                usedRefreshToken,
                session.oidcClientId,
                this.settingsService.edgeOidcPath || '/oidc'
            );
            this.persistTokens(tokens);
            this.retryDelayMs = INITIAL_RETRY_MS;
            this.scheduleNextRefresh();
            return true;
        } catch (err) {
            if (err instanceof OidcSessionUnrecoverableError) {
                // another tab may have rotated the refresh token already - adopt its session
                // before declaring the session dead
                this.settingsService.get();
                const latest = this.settingsService.settings?.session;
                if (latest?.refreshToken && latest.refreshToken !== usedRefreshToken
                    && (jwtExpMs(this.settingsService.getJwtToken()) || 0) > Date.now()) {
                    this.scheduleNextRefresh();
                    return true;
                }
                this.handleUnrecoverable();
                return false;
            }
            // transient failure (network/5xx) - keep the session and retry with backoff
            this.scheduleRetry();
            return false;
        }
    }

    private persistTokens(tokens: any): void {
        const settings = this.settingsService.settings;
        settings.session = {
            ...settings.session,
            id: tokens.accessToken,
            expiresAt: new Date(tokens.expiresAt).toISOString(),
            refreshToken: tokens.refreshToken,
            refreshExpiresAt: tokens.refreshExpiresAt,
            oidcClientId: tokens.clientId
        };
        this.settingsService.set(settings);
        this.settingsService.setJwtToken(tokens.accessToken);
    }

    private scheduleNextRefresh(): void {
        clearTimeout(this.refreshTimer);
        if (!this.running || !this.hasOidcSession()) {
            return;
        }
        const token = this.settingsService.getJwtToken();
        const exp = jwtExpMs(token);
        const iat = jwtIatMs(token);
        const lifetime = exp && iat ? exp - iat : DEFAULT_ACCESS_TOKEN_LIFETIME_MS;
        const refreshAt = exp ? exp - Math.max(lifetime * 0.25, MIN_REFRESH_LEAD_MS) : Date.now();
        const delay = Math.max(refreshAt - Date.now(), MIN_SCHEDULE_DELAY_MS);
        this.refreshTimer = setTimeout(() => this.refreshNow(), delay);
    }

    private scheduleRetry(): void {
        clearTimeout(this.refreshTimer);
        if (!this.running) {
            return;
        }
        this.refreshTimer = setTimeout(() => this.refreshNow(), this.retryDelayMs);
        this.retryDelayMs = Math.min(this.retryDelayMs * 2, MAX_RETRY_MS);
    }

    private checkSessionState(): void {
        if (!this.running || !this.hasOidcSession()) {
            return;
        }
        const session = this.settingsService.settings.session;
        const refreshExp = session.refreshExpiresAt ?? jwtExpMs(session.refreshToken);
        if (refreshExp && refreshExp <= Date.now()) {
            this.handleUnrecoverable();
            return;
        }
        const accessExp = jwtExpMs(this.settingsService.getJwtToken());
        if (!accessExp || accessExp - Date.now() < MIN_REFRESH_LEAD_MS) {
            this.refreshNow();
        }
    }

    private hasOidcSession(): boolean {
        const session = this.settingsService.settings?.session;
        return session?.authMode === 'oidc' && !!session?.refreshToken;
    }

    private handleUnrecoverable(): void {
        this.stop();
        this.growlerService.show(new GrowlerModel(
            'warning',
            'Session Expired',
            'Session Expired',
            'Please log in again.'
        ));
        this.injector.get(ZAC_LOGIN_SERVICE).logout();
    }
}
