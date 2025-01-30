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
import {
  SettingsService,
  LoginServiceClass,
  SETTINGS_SERVICE,
  ZAC_LOGIN_SERVICE,
  GrowlerService,
  GrowlerModel,
  LoginDialogComponent
} from "ziti-console-lib";
import {defer} from "lodash";
import {MatDialog} from "@angular/material/dialog";
import {map, Observable, of} from "rxjs";
// @ts-ignore
const {growler} = window;

export const AUTHENTICATION_GUARD = new InjectionToken<any>('AUTHENTICATION_GUARD');

@Injectable({providedIn: 'root'})
export class AuthenticationGuard {
  dialogRef: any = {};

  constructor(
      @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
      @Inject(SETTINGS_SERVICE) private settingsSvc: SettingsService,
      private router: Router,
      private growlerService: GrowlerService,
      private dialogForm: MatDialog,
  ) {
  }

  canActivate(next, state): Observable<boolean> {
    let isAuthorized = this.settingsSvc.hasSession();
    if (isAuthorized) {
      return of(true);
    }
    if (this.loginService.loginDialogOpen) {
      return of(false);
    }
    this.dialogRef = this.dialogForm.open(LoginDialogComponent, {
      data: {},
      autoFocus: false,
    });
    return this.dialogRef.afterClosed().pipe(map((result: any) => {
      if (result?.isLoggedIn) {
        return this.settingsSvc.hasSession();
      } else {
        return false;
      }
    }));
  }
}
