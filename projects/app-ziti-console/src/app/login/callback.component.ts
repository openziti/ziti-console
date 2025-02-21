import {Component, Inject, OnInit} from '@angular/core';
import {OAuthService} from "angular-oauth2-oidc";
import {Router} from "@angular/router";
import {isEmpty} from "lodash";
import {GrowlerModel, GrowlerService, LoginServiceClass, SettingsServiceClass, ZAC_LOGIN_SERVICE, SETTINGS_SERVICE} from "ziti-console-lib";

@Component({
    selector: 'app-callback',
    template: '<lib-loading-indicator [isLoading]="true"></lib-loading-indicator>',
})
export class CallbackComponent implements OnInit {
    constructor(
        private oauthService: OAuthService,
        @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
        private growlerService: GrowlerService,
        private router: Router,
        @Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,

    ) {

    }

    ngOnInit() {
        try {
            const configString = localStorage.getItem('oauth_callback_config');
            const oauthConfig = JSON.parse(configString);
            if (!isEmpty(oauthConfig)) {
                this.oauthService.configure(oauthConfig);
                this.oauthService.loadDiscoveryDocument().then((loadResult) => {
                    this.oauthService.tryLogin().then((result) => {
                        if (result) {
                            // Handle post-login
                            const accessToken = this.oauthService.getAccessToken();
                            const prefix = '/edge/client/v1';
                            const url = this.settingsService.settings.selectedEdgeController;
                            this.loginService.login(prefix, url, undefined, undefined, true, 'ext-jwt', accessToken);
                        } else {
                            const growlerData = new GrowlerModel(
                                'error',
                                'Error',
                                `Login Error`,
                                'Unable to initialize OAuth login',
                            );
                            this.growlerService.show(growlerData);
                            this.router.navigate(['/login']);
                        }
                    });
                });
            }
        } catch (e) {
            this.router.navigate(['/login']);
        }
    }
}