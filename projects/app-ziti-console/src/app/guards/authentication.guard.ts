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

import {CanActivateFn, Router} from '@angular/router';
import {Inject, Injectable, InjectionToken} from "@angular/core";
import {SettingsService, LoginServiceClass, SETTINGS_SERVICE, ZAC_LOGIN_SERVICE} from "ziti-console-lib";
// @ts-ignore
const {growler} = window;

export const AUTHENTICATION_GUARD = new InjectionToken<any>('AUTHENTICATION_GUARD');

@Injectable({providedIn: 'root'})
export class AuthenticationGuard {
  constructor(
      @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
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
