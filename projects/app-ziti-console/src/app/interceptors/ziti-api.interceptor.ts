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
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {map} from 'rxjs/operators';

import {BehaviorSubject, filter, finalize, Observable, of, switchMap, take, EMPTY, catchError, throwError} from 'rxjs';
import {
    SettingsServiceClass,
    LoginServiceClass,
    SETTINGS_SERVICE,
    ZAC_LOGIN_SERVICE,
    GrowlerModel,
    GrowlerService,
    LoginDialogComponent
} from "ziti-console-lib";
import moment from "moment/moment";
import {Router} from "@angular/router";
import {MatDialog} from "@angular/material/dialog";

import {defer} from 'lodash';

// @ts-ignore
const {growler} = window;

/** Pass untouched request through to the next request handler. */
@Injectable({
    providedIn: 'root'
})
export class ZitiApiInterceptor implements HttpInterceptor {

    dialogRef: any;
    doingCertRefresh = false;
    retryRequestQue: any[] = [];

    constructor(@Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
                @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
                private router: Router,
                private growlerService: GrowlerService,
                private dialogForm: MatDialog,
                ) {

    }

    private handleErrorResponse(err: HttpErrorResponse, req?, next?: HttpHandler): Observable<any> {
        if (err.status === 401) {
            if (this.doingCertRefresh || this.loginService.loginDialogOpen) {
                return new Observable((observer) => {
                    this.retryRequestQue.push({ req, next, observer });
                });
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
                    this.retryRequestQue = [];
                    this.showLoginDialog(err);
                    return throwError(() => err);
                }));
            }
            this.showLoginDialog(err);
            return new Observable((observer) => {
                this.retryRequestQue.push({ req, next, observer });
            });
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

        if (!req.url.startsWith("http")
            || req.url.indexOf("authenticate") > 0
            || req.url.indexOf("version") > 0
        ) {
            return next.handle(req);
        } else {
            return next.handle(this.addAuthToken(req)).pipe(catchError(err=> this.handleErrorResponse(err, req, next)));
        }
    }

    showLoginDialog(err) {
        this.loginService.loginDialogOpen = true;
        this.dialogRef = this.dialogForm.open(LoginDialogComponent, {
            data: {},
            autoFocus: false,
        });
        this.dialogRef.afterClosed().toPromise().then((result: any) => {
            if (result?.isLoggedIn) {
                this.retryRequestQue.forEach((failedRequest) => {
                    this.retryFailedRequest(failedRequest);
                });
                this.retryRequestQue = [];
                return true;
            } else if (result?.returnToLogin) {
                // User is unauthorized. redirect user back to login page
                growler.disabled = true;
                defer(() => {
                    this.dialogRef.closeAll();
                    growler.disabled = false;
                });
                if (this.settingsService?.settings?.session) {
                    this.settingsService.settings.session.id = undefined;
                    this.settingsService.settings.session.expiresAt = undefined;
                    this.settingsService.set(this.settingsService.settings);
                }
                this.router.navigate(['/login']);
                this.retryRequestQue = [];
                return err.message;
            } else {
                this.retryRequestQue = [];
                return false;
            }
        });
    }

    private addAuthToken(request: any) {
        const session = this.settingsService.settings.session;
        const contentType = request.headers.get('Content-Type') || 'application/json';
        const headers: any = {"zt-session": session.id, 'content-type': contentType};
        const acceptHeader = request.headers.get('Accept');
        if (!acceptHeader) {
            headers.accept = 'application/json';
        }
        return request.clone({setHeaders: headers});
    }
}

