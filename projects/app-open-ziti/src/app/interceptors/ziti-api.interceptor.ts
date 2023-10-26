import {Injectable, Inject} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {map} from 'rxjs/operators';

import {BehaviorSubject, filter, finalize, Observable, of, switchMap, take} from 'rxjs';
import {SettingsServiceClass, LoginServiceClass, SETTINGS_SERVICE, LOGIN_SERVICE} from "open-ziti-console-lib";
import moment from "moment/moment";
import {Router} from "@angular/router";

/** Pass untouched request through to the next request handler. */
@Injectable({
    providedIn: 'root'
})
export class ZitiApiInterceptor implements HttpInterceptor {
    private refreshTokenInProgress = false;
    private refreshTokenSubject = new BehaviorSubject(null);

    constructor(@Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
                @Inject(LOGIN_SERVICE) private loginService: LoginServiceClass,
                private router: Router) {

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
                // I need to request a new token
                this.refreshTokenInProgress = true;
                this.refreshTokenSubject.next(null);
                return this.refreshAuthToken().pipe(
                    switchMap((token) => {
                        if (token) {
                            this.refreshTokenSubject.next(token);
                            return next.handle(this.addAuthToken(req));
                        } else {
                            throw ('Error refreshing token');
                        }
                    }),
                    finalize(() => (this.refreshTokenInProgress = false))
                );
            }
        }
    }

    private refreshAuthToken() {
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

    private addAuthToken(request: any) {
        const session = this.settingsService.settings.session;
        return request.clone({setHeaders: {"zt-session": session.id, 'content-type': 'application/json', accept: 'application/json'}});
    }
}

