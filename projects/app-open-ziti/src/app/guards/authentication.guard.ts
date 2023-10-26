import {CanActivateFn, Router} from '@angular/router';
import {Inject, Injectable, InjectionToken} from "@angular/core";
import {SettingsService, LoginServiceClass, SETTINGS_SERVICE, LOGIN_SERVICE} from "open-ziti-console-lib";
// @ts-ignore
const {growler} = window;

export const AUTHENTICATION_GUARD = new InjectionToken<any>('AUTHENTICATION_GUARD');

@Injectable({providedIn: 'root'})
export class AuthenticationGuard {
  constructor(
      @Inject(LOGIN_SERVICE) private loginService: LoginServiceClass,
      @Inject(SETTINGS_SERVICE) private settingsSvc: SettingsService,
      private router: Router
  ) {
  }

  canActivate(next, state) {
    const isAuthorized = this.loginService.hasSession();
    if (!isAuthorized) {
      // messaging.error('not authorized');
      this.router.navigate(['/login']);
    }

    return isAuthorized;
  }
}
