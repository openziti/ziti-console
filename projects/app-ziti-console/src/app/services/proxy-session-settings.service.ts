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
import {HttpBackend} from '@angular/common/http';
import {SettingsService, GrowlerService} from 'ziti-console-lib';
import {catchError, firstValueFrom, of} from 'rxjs';
import {isEmpty} from 'lodash';

/**
 * Settings service for proxy-session mode. The session lives server-side (httpOnly
 * cookie), so controllers are reached same-origin via the proxy, hasSession() reflects
 * /zac-session/status, and the browser-side JWT token accessors are inert.
 */
@Injectable({providedIn: 'root'})
export class ProxySessionSettingsService extends SettingsService {
    /** Set from /zac-session/status (and by the login service on login/logout). */
    hasProxySession = false;
    /** No manual controller entry - the proxy fixes the upstream. */
    override allowControllerAdd = false;

    constructor(override httpBackend: HttpBackend, override growlerService: GrowlerService) {
        super(httpBackend, growlerService);
    }

    override init() {
        this.get();
        return this.loadControllers()
            .then(() => this.refreshSessionStatus())
            .then(() => undefined);
    }

    // The proxy lists its configured controllers; each url is the same-origin
    // /c/<id> path that routes to that upstream. Populate edgeControllers (drives
    // the login picker) and pick the default.
    loadControllers(): Promise<void> {
        const origin = window.location.origin;
        return firstValueFrom(
            this.httpClient.get('/zac-session/controllers').pipe(catchError(() => of({controllers: []})))
        ).then((r: any) => {
            const list = (r?.controllers || []);
            if (list.length) {
                this.settings.edgeControllers = list.map((c: any) => ({name: c.name, url: origin + c.url, default: !!c.default}));
                const def = list.find((c: any) => c.default) || list[0];
                const current = this.settings.selectedEdgeController;
                if (isEmpty(current) || !this.settings.edgeControllers.some((c: any) => c.url === current)) {
                    this.settings.selectedEdgeController = origin + def.url;
                }
            } else {
                // Fallback: single same-origin controller (shouldn't happen - proxy requires one).
                this.settings.selectedEdgeController = origin;
            }
            this.initApiVersions(this.settings.selectedEdgeController);
            this.set(this.settings);
        });
    }

    override loadSettings() { /* no-op: controller list comes from /zac-session/controllers */ }

    // Auth lives only in the server session / httpOnly cookie.
    override hasSession() { return this.hasProxySession; }
    override getJwtToken(): string | null { return null; }
    override hasValidJwtToken(): boolean { return false; }
    override setJwtToken(_token: string): void { /* no-op */ }

    /** Ask the proxy whether we currently hold a valid server session. */
    refreshSessionStatus(): Promise<boolean> {
        return firstValueFrom(
            this.httpClient.get('/zac-session/status').pipe(catchError(() => of({authenticated: false})))
        ).then((r: any) => {
            this.hasProxySession = !!r?.authenticated;
            return this.hasProxySession;
        });
    }
}
