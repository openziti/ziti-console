import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import {
    SETTINGS_SERVICE,
    SettingsService,
} from "ziti-console-lib";

@Injectable({ providedIn: 'root' })
export class AuthenticationResolveService {
    constructor(
        @Inject(SETTINGS_SERVICE) private settingsSvc: SettingsService,
        private router: Router,
    ) {}

    async resolve(route: ActivatedRouteSnapshot): Promise<any> {
        if (this.settingsSvc.hasSession()) {
            return true;
        }
        this.router.navigate(['/login']);
        return false;
    }
}
