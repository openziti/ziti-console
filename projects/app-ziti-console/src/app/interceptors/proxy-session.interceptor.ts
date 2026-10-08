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
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {catchError, Observable, throwError} from 'rxjs';
import {Router} from '@angular/router';
import {SETTINGS_SERVICE} from 'ziti-console-lib';
import {readCsrfToken} from '../auth-mode';
import {ProxySessionSettingsService} from '../services/proxy-session-settings.service';

/**
 * Interceptor for proxy-session mode. Attaches no token (the proxy injects it
 * server-side); rides the httpOnly session cookie and echoes the CSRF cookie as
 * X-ZAC-CSRF on mutations. A 401 on an API call routes to /login once the proxy
 * confirms the session is gone; a 401 that is only a permission error keeps the user in.
 */
@Injectable()
export class ProxySessionInterceptor implements HttpInterceptor {
    constructor(
        private router: Router,
        @Inject(SETTINGS_SERVICE) private settingsService: ProxySessionSettingsService
    ) {}

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const method = req.method.toUpperCase();
        const mutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

        const apiRequest = this.isApiRequest(req);
        const setHeaders: any = {};
        if (mutating && apiRequest) {
            const csrf = readCsrfToken();
            if (csrf) setHeaders['x-zac-csrf'] = csrf;
        }
        // withCredentials ONLY for same-origin API calls. Setting it on cross-origin
        // IdP requests (e.g. the OIDC discovery doc) breaks CORS when the IdP replies
        // with Access-Control-Allow-Origin: * - and same-origin cookies ride anyway.
        const request = req.clone({setHeaders, withCredentials: apiRequest});

        return next.handle(request).pipe(
            catchError((err: HttpErrorResponse) => {
                if (err?.status === 401 && apiRequest && !this.isAuthRoute()) {
                    // The settings service bypasses interceptors, so this check cannot loop.
                    this.settingsService.refreshSessionStatus().then((authenticated) => {
                        if (!authenticated) this.router.navigate(['/login']);
                    });
                }
                return throwError(() => err);
            })
        );
    }

    // Same-origin only: the CSRF token must never ride along to another host, even one
    // whose path happens to contain /edge/.
    private isApiRequest(req: HttpRequest<any>): boolean {
        let u: URL;
        try {
            u = new URL(req.url || '', window.location.href);
        } catch (e) {
            return false;
        }
        if (u.origin !== window.location.origin) return false;
        return /\/(edge|fabric)\//.test(u.pathname) || /\/zac-session(\/|$)/.test(u.pathname);
    }

    private isAuthRoute(): boolean {
        const p = window.location.pathname;
        return p.endsWith('/login') || p.endsWith('/callback');
    }
}
