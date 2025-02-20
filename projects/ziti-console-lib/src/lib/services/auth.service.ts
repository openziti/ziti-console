import { Injectable } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { HttpClient } from '@angular/common/http';
import {GrowlerModel} from "../features/messaging/growler.model";
import {GrowlerService} from "../features/messaging/growler.service";

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    constructor(
        private oauthService: OAuthService, private http: HttpClient,
        private growlerService: GrowlerService,
    ) {
    }

    public configureOAuth(issuer, clientId, audience, scopes?): Promise<any> {
        const oauthConfig = {
            issuer: issuer,
            redirectUri: window.location.origin + '/zac/callback',
            clientId: clientId,
            responseType: 'code',
            scope: scopes,
            showDebugInformation: true,
            customQueryParams: {
                audience: audience
            }
        };
        localStorage.setItem('oauth_callback_config', JSON.stringify(oauthConfig));
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
            return initSuccess;
        }).catch((error) => {
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Login Error`,
                'Unable to initialize OAuth login: ' + (error?.message ? error.message : error),
            );
            this.growlerService.show(growlerData);
            return false;
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
