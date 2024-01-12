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

import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
} from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {GrowlerService, GrowlerModel, SettingsServiceClass, SETTINGS_SERVICE} from "ziti-console-lib";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    constructor(private growlerService: GrowlerService, @Inject(SETTINGS_SERVICE) private settings: SettingsServiceClass) {}

    intercept(
        request: HttpRequest<any>,
        next: HttpHandler
    ): Observable<HttpEvent<any>> {
        if (!this.settings?.settings?.interceptErrors) {
            return next.handle(request);
        }
        return next.handle(request).pipe(
            catchError((requestError) => {
                if (requestError.status !== 401) {
                    const { error } = requestError;
                    this.growlerService.show(
                        new GrowlerModel(
                            'error',
                            'Error',
                            `HTTP Error - ${requestError.status}`,
                            error && error.message,
                        )
                    );
                }
                return throwError(() => new Error(requestError));
            })
        );
    }
}
