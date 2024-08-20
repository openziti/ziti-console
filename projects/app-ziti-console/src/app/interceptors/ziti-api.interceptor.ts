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

import {BehaviorSubject, filter, finalize, Observable, of, switchMap, take, EMPTY} from 'rxjs';
import {
    SettingsServiceClass,
    LoginServiceClass,
    SETTINGS_SERVICE,
    ZAC_LOGIN_SERVICE,
    GrowlerModel, GrowlerService
} from "ziti-console-lib";
import moment from "moment/moment";
import {Router} from "@angular/router";
import {MatDialog} from "@angular/material/dialog";

import {defer} from 'lodash';

/** Pass untouched request through to the next request handler. */
@Injectable({
    providedIn: 'root'
})
export class ZitiApiInterceptor implements HttpInterceptor {
    private refreshTokenInProgress = false;
    private refreshTokenSubject = new BehaviorSubject(null);

    constructor(@Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
                @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
                private router: Router,
                private growlerService: GrowlerService,
                private dialogRef: MatDialog
                ) {

    }

    intercept(req: HttpRequest<any>, next: HttpHandler):
        Observable<HttpEvent<any>> {

        if (!req.url.startsWith("http")
            || req.url.indexOf("authenticate") > 0
            || req.url.indexOf("version") > 0
        ) {
            return next.handle(req);
        } else {
            const session = this.settingsService.settings.session;
            const tokenExpirationDate = moment(session.expiresAt);
            const expTime = tokenExpirationDate.diff(moment(), 'seconds');
            if (session?.id && expTime > 10) {
                // I have everything. add token and continue
                return next.handle(this.addAuthToken(req));
            } else if (this.refreshTokenInProgress) {
                // I have already requested a new token,
                // when its finished, continue this request
                return this.refreshTokenSubject.pipe(
                    filter((result) => result),
                    take(1),
                    switchMap(() => next.handle(this.addAuthToken(req)))
                );
            } else {
                this.handleUnauthorized();
                return EMPTY;
            }
        }
    }

    private refreshAuthToken() {
        this.refreshTokenInProgress = true;
        this.refreshTokenSubject.next(null);
        const apiVersions = this.settingsService.apiVersions;
        const prefix = apiVersions["edge-management"].v1.path;
        const url = this.settingsService.settings.selectedEdgeController;
        const controllerId = this.settingsService.settings.session.username.trim();
        const controllerPassword = this.settingsService.settings.session.password;
        if (prefix && url && controllerId && controllerPassword) {
            const serviceUrl = url + prefix;
            return this.loginService.observeLogin(serviceUrl, controllerId, controllerPassword);
        }
        this.router.navigate(['/login']);
        return of(null);
    }

    private handleUnauthorized() {
        const gorwlerData: GrowlerModel = new GrowlerModel('warning', 'Invalid Session', 'Session Expired', 'Your session is no longer valid. Please login to continue.');
        this.growlerService.show(gorwlerData);
        defer(() => {
            this.dialogRef.closeAll();
        });
        this.router.navigate(['/login']);
    }

    private addAuthToken(request: any) {
        const session = this.settingsService.settings.session;
        return request.clone({setHeaders: {"zt-session": session.id, 'content-type': 'application/json', accept: 'application/json'}});
    }
}

