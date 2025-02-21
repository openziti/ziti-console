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

    public configureOAuth(issuer, clientId, audience, scopes?): Promise<any> {
        let basePath = document.querySelector('base')?.getAttribute('href') || '/';
        basePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
        const oauthConfig = {
            issuer: issuer,
            redirectUri: window.location.origin + `${basePath}/callback`,
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
