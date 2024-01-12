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

import {BehaviorSubject, filter, finalize, Observable, of, switchMap, take} from 'rxjs';
import {SettingsService, LoginServiceClass, SETTINGS_SERVICE, ZAC_LOGIN_SERVICE} from "ziti-console-lib";
import moment from "moment/moment";
import {Router} from "@angular/router";

/** Pass untouched request through to the next request handler. */
@Injectable()
export class ZitiApiInterceptor implements HttpInterceptor {
    private refreshTokenInProgress = false;
    private refreshTokenSubject = new BehaviorSubject(null);

    constructor(@Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
                @Inject(ZAC_LOGIN_SERVICE)private loginService: LoginServiceClass,
                private router: Router) {}

    intercept(req: HttpRequest<any>, next: HttpHandler):
        Observable<HttpEvent<any>> {
        return next.handle(req).pipe(map((event: any) => {
            if (event?.body?.error) {
                this.router.navigate['/login'];
            }
            return event;
        }));
    }

    private addAuthToken(request: any) {
        const session = this.settingsService.settings.session;
        return request.clone({setHeaders: {"zt-session": session.id, 'content-type': 'application/json', accept: 'application/json'}, withCredentials: true});
    }
}

