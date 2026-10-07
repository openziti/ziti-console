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
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {catchError, Observable, throwError} from 'rxjs';
import {Router} from '@angular/router';
import {readCsrfToken} from '../auth-mode';

/**
 * Interceptor for proxy-session mode. Attaches no token (the proxy injects it
 * server-side); rides the httpOnly session cookie and echoes the CSRF cookie as
 * X-ZAC-CSRF on mutations. A 401 on an API call routes to /login.
 */
@Injectable()
export class ProxySessionInterceptor implements HttpInterceptor {
    constructor(private router: Router) {}

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
                if (err?.status === 401 && this.isApiRequest(req) && !this.isAuthRoute()) {
                    this.router.navigate(['/login']);
                }
                return throwError(() => err);
            })
        );
    }

    private isApiRequest(req: HttpRequest<any>): boolean {
        const u = req.url || '';
        // Same-origin only: never attach our credentials/CSRF to a third-party URL.
        let path: string;
        if (/^https?:\/\//i.test(u)) {
            try {
                const parsed = new URL(u);
                if (parsed.origin !== window.location.origin) return false;
                path = parsed.pathname;
            } catch (e) {
                return false;
            }
        } else {
            path = u.startsWith('/') ? u : '/' + u;
        }
        return /\/(edge|fabric)\//.test(path) || path.indexOf('/zac-session') === 0;
    }

    private isAuthRoute(): boolean {
        const p = window.location.pathname;
        return p.endsWith('/login') || p.endsWith('/callback');
    }
}
