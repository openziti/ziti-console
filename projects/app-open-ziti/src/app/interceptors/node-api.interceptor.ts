import {Injectable, Inject} from '@angular/core';
import {HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {map} from 'rxjs/operators';

import {BehaviorSubject, filter, finalize, Observable, of, switchMap, take} from 'rxjs';
import {SettingsService, LoginServiceClass, SETTINGS_SERVICE, LOGIN_SERVICE} from "open-ziti-console-lib";
import moment from "moment/moment";
import {Router} from "@angular/router";

/** Pass untouched request through to the next request handler. */
@Injectable()
export class ZitiApiInterceptor implements HttpInterceptor {
    private refreshTokenInProgress = false;
    private refreshTokenSubject = new BehaviorSubject(null);

    constructor(@Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
                @Inject(LOGIN_SERVICE)private loginService: LoginServiceClass,
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

