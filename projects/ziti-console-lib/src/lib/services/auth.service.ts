import {Inject, Injectable} from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { HttpClient } from '@angular/common/http';
import {GrowlerModel} from "../features/messaging/growler.model";
import {GrowlerService} from "../features/messaging/growler.service";
import {APP_BASE_HREF} from "@angular/common";
import {NavigationEnd, Router} from "@angular/router";

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    basePath = '/';
    constructor(
        private oauthService: OAuthService, private http: HttpClient,
        private growlerService: GrowlerService,
        private router: Router
    ) {
        router.events.subscribe((event: any) => {
            if (event => event instanceof NavigationEnd) {
                if (!event?.snapshot?.routeConfig?.path) {
                    return;
                }
                const pathSegments = event.snapshot.routeConfig.path.split('/');
                this.basePath = pathSegments[0];
            }
        });
    }

    public resetOAuthService(configKey = 'oauth_callback_config', tokenTypeKey = 'oauth_callback_target_token') {
        const urlWithoutHash = window.location.href.split('?')[0];
        // Update the URL without the hash
        window.history.pushState({}, '', urlWithoutHash);
        localStorage.removeItem(configKey);
        localStorage.removeItem(tokenTypeKey);
        this.oauthService.logOut();
        this.oauthService.configure({});
    }

    public configureOAuth(extJwtSigner, callbackUrl = '/callback', configKey?, tokenTypeKey?): Promise<any> {
        let basePath = document.querySelector('base')?.getAttribute('href') || '/';
        basePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
        const scopes = extJwtSigner.scopes || [];
        const scope = scopes.join(' ');
        const redirectPath = basePath + callbackUrl;
        const oauthConfig = {
            issuer: extJwtSigner.externalAuthUrl,
            redirectUri: window.location.origin + redirectPath,
            clientId: extJwtSigner.clientId,
            responseType: 'code',
            scope: scope,
            showDebugInformation: true,
            customQueryParams: {
                audience: extJwtSigner.audience
            },
            strictDiscoveryDocumentValidation: false,
            usePKCE: true,
        };

        localStorage.setItem(configKey || 'oauth_callback_config', JSON.stringify(oauthConfig));
        if (extJwtSigner.targetToken) {
            localStorage.setItem(tokenTypeKey || 'oauth_callback_target_token', extJwtSigner.targetToken);
        }
        this.oauthService.configure(oauthConfig);
        return this.oauthService.loadDiscoveryDocumentAndTryLogin().then((initSuccess) => {
            if (initSuccess) {
                this.login();
            } else {
                const growlerData = new GrowlerModel(
                    'error',
                    'Error',
                    `Login Error`,
                    'Unable to initialize OAuth login',
                );
                this.growlerService.show(growlerData);
            }
            return {success: initSuccess, message: ''};
        }).catch((error) => {
            const errorMessage = 'Unable to initialize OAuth login: ' + (error?.message ? error.message : error);
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Login Error`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            this.resetOAuthService();
            return {success: false, message: errorMessage};
        });
    }

    login() {
        this.oauthService.initLoginFlow();
    }

    logout() {
        this.oauthService.logOut();
    }

    get accessToken() {
        return this.oauthService.getAccessToken();
    }

}
