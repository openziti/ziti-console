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
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpResponse } from '@angular/common/http';
import {map} from 'rxjs/operators';

import {BehaviorSubject, catchError, filter, finalize, Observable, of, switchMap, take, throwError} from 'rxjs';
import {SettingsService, LoginDialogComponent, LoginServiceClass, SETTINGS_SERVICE, ZAC_LOGIN_SERVICE, SettingsServiceClass, GrowlerService} from "ziti-console-lib";

import {Router} from "@angular/router";
import {MatDialog} from "@angular/material/dialog";
import {defer, set} from "lodash";

/** Pass untouched request through to the next request handler. */
@Injectable()
export class NodeApiInterceptor implements HttpInterceptor {
    dialogRef: any;

    constructor(@Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
                @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
                private router: Router,
                private growlerService: GrowlerService,
                private dialogForm: MatDialog,) {}

    intercept(req: HttpRequest<any>, next: HttpHandler):
        Observable<any> {
        return next.handle(req).pipe(
            switchMap((event: HttpEvent<any>) => {
                if (event instanceof HttpResponse) {
                    return this.handleResponse(event);
                }
                return of(event);
            })
        );
    }

    private handleResponse(event: any): Observable<any> {
        const body = event?.body;
        if (body?.errorObj?.code === 'UNAUTHORIZED') {
            if (this.loginService.loginDialogOpen) {
                return of(event);
            }
            this.dialogRef = this.dialogForm.open(LoginDialogComponent, {
                data: {},
                autoFocus: false,
            });
            this.dialogRef.afterClosed().pipe(switchMap((result: any) => {
                if (result?.returnToLogin) {
                    defer(() => {
                        this.dialogRef.closeAll();
                    });
                    if (this.settingsService?.settings?.session) {
                        localStorage.removeItem('ziti.settings');
                        set(this.settingsService, 'hasNodeSession', false);
                        this.settingsService.settings.session.id = undefined;
                        this.settingsService.settings.session.expiresAt = undefined;
                        this.settingsService.set(this.settingsService.settings);
                    }
                    this.router.navigate(['/login']);
                }
                return event;
            }));
        }
        return of(event);
    }
}

