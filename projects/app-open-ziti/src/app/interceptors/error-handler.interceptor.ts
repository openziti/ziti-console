import {
    HttpEvent,
    HttpHandler,
    HttpInterceptor,
    HttpRequest,
} from '@angular/common/http';
import { Injectable, Inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {GrowlerService, GrowlerModel, SettingsServiceClass, SETTINGS_SERVICE} from "open-ziti-console-lib";

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
