import {Component, Inject, OnInit} from '@angular/core';
import {OAuthService} from "angular-oauth2-oidc";
import {ActivatedRoute, Router} from "@angular/router";
import {isEmpty} from "lodash";
import {GrowlerModel} from "../../features/messaging/growler.model";
import {GrowlerService} from "../../features/messaging/growler.service";
import {LoginServiceClass, ZAC_LOGIN_SERVICE} from "../../services/login-service.class";
import {SettingsServiceClass} from "../../services/settings-service.class";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../services/ziti-data.service";
import {SETTINGS_SERVICE} from "../../services/settings.service";

@Component({
    selector: 'lib-callback',
    template: '<lib-loading-indicator [isLoading]="true"></lib-loading-indicator>',
    standalone: false
})
export class CallbackComponent implements OnInit {
    constructor(
        private oauthService: OAuthService,
        @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
        private growlerService: GrowlerService,
        private router: Router,
        private route: ActivatedRoute,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        @Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,

    ) {

    }

    ngOnInit() {
        try {
            const configString = localStorage.getItem('oauth_callback_config');
            const tokenType = localStorage.getItem('oauth_callback_target_token');
            const oauthConfig = JSON.parse(configString);
            const redirectRoute = this.route.snapshot.queryParamMap.get('redirectRoute');
            if (!isEmpty(oauthConfig)) {
                this.oauthService.configure(oauthConfig);
                this.oauthService.loadDiscoveryDocument().then((loadResult) => {
                    console.log(loadResult);
                    this.oauthService.tryLogin().then((result) => {
                        if (result) {
                            // Handle post-login
                            let token;
                            if (tokenType === 'ID') {
                                token = this.oauthService.getIdToken();
                            } else {
                                token = this.oauthService.getAccessToken();
                            }
                            const prefix = '/edge/client/v1';
                            const url = this.settingsService.settings.selectedEdgeController;
                            let doNav = true;
                            let isTest = false;
                            if (!isEmpty(redirectRoute)) {
                                
                                doNav = false;
                                isTest = true;
                            }
                            const claimsObj = this.loginService.decodeJwt(token);
                            const claimsStr = JSON.stringify(claimsObj, null, 2);
                            this.loginService.login(prefix, url, undefined, undefined, doNav, 'ext-jwt', token, isTest).then((result) => {
                                if (!isEmpty(redirectRoute)) {
                                    this.router.navigate([redirectRoute], {
                                        queryParams: {
                                            oidcAuthResult: 'success',
                                            oidcAuthTokenClaims: claimsStr
                                        }
                                    });
                                }
                            }).catch((error) => {
                                let errorMessage = this.zitiService.getErrorMessage(error);
                                if (error.statusText) {
                                    errorMessage = error.statusText + ': ' + errorMessage;
                                }
                                if (error.status) {
                                    errorMessage = error.status + ' ' + errorMessage;
                                }
                                errorMessage = 'Failed to get ziti session ID from controller using OIDC token: ' + errorMessage;
                                const growlerData = new GrowlerModel(
                                    'error',
                                    'Error',
                                    `Login Error`,
                                    'Unable to initialize OAuth login. ' + errorMessage,
                                );
                                this.growlerService.show(growlerData);
                                if (!isEmpty(redirectRoute)) {
                                    this.router.navigate([redirectRoute], {
                                        queryParams: {
                                            oidcAuthResult: 'failed',
                                            oidcAuthErrorMessageDetail: errorMessage,
                                            oidcAuthErrorMessageSource: 'Ziti Controller Error',
                                            oidcAuthTokenClaims: claimsStr
                                        }
                                    });
                                } else {
                                    this.router.navigate(['/login']);
                                }
                            });
                        } else {
                            const growlerData = new GrowlerModel(
                                'error',
                                'Error',
                                `Login Error`,
                                'Unable to initialize OAuth login',
                            );
                            this.growlerService.show(growlerData);
                            this.router.navigate(['/login'], {
                                queryParams: {
                                    oidcAuthResult: 'failed',
                                    oidcAuthErrorMessageDetail: 'Unable to initialize OAuth login. Empty response of OAuth service.',
                                    oidcAuthErrorMessageSource: 'OAuth Provider Error',
                                }
                            });
                        }
                    }).catch((error) => {
                        console.log(error);
                        const errorMessage = `${error.params ? error.params.error + ': ' + error.params.error_description : ''}`;
                        const growlerData = new GrowlerModel(
                            'error',
                            'Error',
                            `Login Error`,
                            'Unable to initialize OAuth login. ' + errorMessage,
                        );
                        this.growlerService.show(growlerData);
                        if (!isEmpty(redirectRoute)) {
                            this.router.navigate([redirectRoute], {
                                queryParams: {
                                    oidcAuthResult: 'failed',
                                    oidcAuthErrorMessageDetail: errorMessage,
                                    oidcAuthErrorMessageSource: 'OAuth Provider Error',
                                }
                            });
                        }
                    });
                }).catch((error) => {
                    const errorMessage = `${error.params ? error.params.error + ': ' + error.params.error_description : ''}`;
                    const growlerData = new GrowlerModel(
                        'error',
                        'Error',
                        `Login Error`,
                        'Unable to initialize OAuth login. ' + errorMessage,
                    );
                    this.growlerService.show(growlerData);
                    if (!isEmpty(redirectRoute)) {
                        this.router.navigate([redirectRoute], {
                            queryParams: {
                                oidcAuthResult: 'failed',
                                oidcAuthErrorMessageDetail: errorMessage,
                                oidcAuthErrorMessageSource: 'OAuth Provider Error',
                            }
                        });
                    }
                });
            }
        } catch (e) {
            this.router.navigate(['/login']);
        }
    }
}
