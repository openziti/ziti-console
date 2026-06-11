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

import {Injectable, Inject} from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import {map} from 'rxjs/operators';

import {BehaviorSubject, filter, finalize, from, Observable, of, switchMap, take, EMPTY, catchError, throwError} from 'rxjs';
import {
    SettingsServiceClass,
    LoginServiceClass,
    SETTINGS_SERVICE,
    ZAC_LOGIN_SERVICE,
    GrowlerModel,
    GrowlerService,
    SessionRefreshService
} from "ziti-console-lib";
import moment from "moment/moment";
import {Router} from "@angular/router";

/** Pass untouched request through to the next request handler. */
@Injectable({
    providedIn: 'root'
})
export class ZitiApiInterceptor implements HttpInterceptor {

    doingCertRefresh = false;
    doingTokenRefresh = false;
    retryRequestQue: any[] = [];

    constructor(@Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
                @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
                private router: Router,
                private growlerService: GrowlerService,
                private sessionRefreshService: SessionRefreshService,
                ) {

    }

    private handleErrorResponse(err: HttpErrorResponse, req?, next?: HttpHandler): Observable<any> {
        if (err.status === 401) {
            if (this.doingCertRefresh || this.doingTokenRefresh) {
                return new Observable((observer) => {
                    this.retryRequestQue.push({ req, next, observer });
                });
            }
            const session = this.settingsService.settings?.session;
            if (session?.authMode === 'oidc' && session?.refreshToken) {
                this.doingTokenRefresh = true;
                return from(this.sessionRefreshService.refreshNow()).pipe(
                    switchMap((refreshed) => {
                        this.doingTokenRefresh = false;
                        if (!refreshed) {
                            // refreshNow handles unrecoverable sessions (logout + redirect);
                            // flush queued requests with the original error
                            this.retryRequestQue.forEach(({observer}) => observer.error(err));
                            this.retryRequestQue = [];
                            return throwError(() => err);
                        }
                        this.retryRequestQue.forEach((failedRequest) => {
                            this.retryFailedRequest(failedRequest);
                        });
                        this.retryRequestQue = [];
                        return next.handle(this.addAuthToken(req));
                    })
                );
            }
            if (this.loginService.isCertBasedAuth || !this.loginService.certBasedAttempted) {
                this.doingCertRefresh = true;
                return this.loginService.observeLogin(this.loginService.serviceUrl, undefined, undefined, false).pipe(
                    switchMap(body => {
                        this.doingCertRefresh = false;
                        this.retryRequestQue.forEach((failedRequest) => {
                            this.retryFailedRequest(failedRequest);
                        });
                        this.retryRequestQue = [];
                        return next.handle(this.addAuthToken(req));
                    })
                ).pipe(catchError(err => {
                    this.doingCertRefresh = false;
                    this.redirectToLogin(err);
                    return throwError(() => err);
                }));
            }
            this.redirectToLogin(err);
            return throwError(() => err);
        }
        return throwError(() => err);
    }

    private retryFailedRequest(queuedRequest: any): void {
        const { req, next, observer } = queuedRequest;
        next.handle(this.addAuthToken(req)).subscribe(
            (response) => observer.next(response),
            (error) => observer.error(error)
        );
    }

    intercept(req: HttpRequest<any>, next: HttpHandler):
        Observable<HttpEvent<any>> {

        if (this.isUnauthenticatedResource(req)) {
            return next.handle(req);
        } else {
            return next.handle(this.addAuthToken(req)).pipe(catchError(err=> this.handleErrorResponse(err, req, next)));
        }
    }

    isUnauthenticatedResource(req: HttpRequest<any>) {
        // Check if request URL matches the primary controller
        const matchesPrimaryController = req.url.indexOf(this.settingsService?.settings?.selectedEdgeController) >= 0;

        // Check if request URL matches any HA controller
        const haControllers = this.settingsService.getHAControllers?.() || [];
        const matchesHAController = haControllers.some((controller: any) =>
            req.url.indexOf(controller.url) >= 0
        );

        const isUnauthenticated = (
            !req.url.startsWith("http")
            || (!matchesPrimaryController && !matchesHAController)
            || req.url.indexOf("authenticate") > 0
            || req.url.indexOf("version") > 0
            || req.url.indexOf("/oidc/") > 0
            || (req.url.indexOf("edge/client/v1/external-jwt-signers") > 0 && req.method)
        );

        return isUnauthenticated;
    }

    // The session can't be recovered silently - clear it and return to the login page
    // (no re-login modal; see openziti/ziti-console#886)
    private redirectToLogin(err) {
        if (this.settingsService?.settings?.session) {
            this.settingsService.settings.session.id = undefined;
            this.settingsService.settings.session.expiresAt = undefined;
            this.settingsService.set(this.settingsService.settings);
        }
        this.growlerService.show(new GrowlerModel(
            'warning',
            'Session Expired',
            'Session Expired',
            'Please log in again.'
        ));
        this.retryRequestQue.forEach(({observer}) => observer.error(err));
        this.retryRequestQue = [];
        this.router.navigate(['/login']);
    }

    private addAuthToken(request: any) {
        const contentType = request.headers.get('Content-Type') || 'application/json';
        let headers: any = {'content-type': contentType};

        // Check if request already has zt-session (from callHAControllers for controller-specific sessions)
        // In this case, keep the existing zt-session and don't override with JWT
        if (request.headers.has('zt-session')) {
            return request;
        }

        // Try to use JWT token first (for OpenZiti v2.0+ and HA compatibility)
        // For OIDC sessions send the Bearer token even when expired - a clean 401
        // drives the refresh flow instead of falling through to a bogus zt-session header
        const jwtToken = this.settingsService.getJwtToken();
        const isOidcSession = this.settingsService.settings?.session?.authMode === 'oidc';
        if (jwtToken && (isOidcSession || this.settingsService.hasValidJwtToken())) {
            headers = {
                "Authorization": `Bearer ${jwtToken}`,
                'content-type': contentType
            };
        } else {
            // Fall back to legacy zt-session for backward compatibility
            const session = this.settingsService.settings.session;
            if (session?.id) {
                headers = {"zt-session": session.id, 'content-type': contentType};
            }
        }

        const acceptHeader = request.headers.get('Accept');
        if (!acceptHeader) {
            headers.accept = 'application/json';
        }

        return request.clone({setHeaders: headers});
    }
}

