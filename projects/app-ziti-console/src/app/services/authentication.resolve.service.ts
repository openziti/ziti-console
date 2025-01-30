import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import {map, of} from "rxjs";
import {MatDialog} from "@angular/material/dialog";
import {
    LoginServiceClass,
    ZAC_LOGIN_SERVICE,
    SETTINGS_SERVICE,
    SettingsService,
    GrowlerService,
    LoginDialogComponent
} from "ziti-console-lib";

@Injectable({ providedIn: 'root' })
export class AuthenticationResolveService {
    dialogRef: any = {};
    constructor(
        @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
        @Inject(SETTINGS_SERVICE) private settingsSvc: SettingsService,
        private router: Router,
        private growlerService: GrowlerService,
        private dialogForm: MatDialog,
    ) {}

    async resolve(route: ActivatedRouteSnapshot): Promise<any> {
        let isAuthenticated = this.settingsSvc.hasSession();
        if (isAuthenticated) {
            return Promise.resolve(true);
        }
        if (this.loginService.loginDialogOpen) {
            return Promise.resolve(false);
        }
        this.dialogRef = this.dialogForm.open(LoginDialogComponent, {
            data: {},
            autoFocus: false,
        });
        return this.dialogRef.afterClosed().toPromise((result: any) => {
            if (result?.isLoggedIn) {
                return this.settingsSvc.hasSession();
            } else {
                return false;
            }
        });
    }
}
