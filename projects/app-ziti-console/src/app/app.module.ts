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

import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {PageNotFoundComponent} from './page-not-found/page-not-found.component';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import {LoginComponent} from './login/login.component';
import {FormsModule} from "@angular/forms";
import { OAuthModule } from 'angular-oauth2-oidc';
import {environment} from "./environments/environment";
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import {
    NoopTabInterceptorService,
    OpenZitiConsoleLibModule,
    SettingsService,
    ZacWrapperServiceClass,
    ZacWrapperService,
    NodeWrapperService,
    GrowlerModule,
    DeactivateGuardService,
    ZitiDataService,
    NodeDataService,
    ZitiControllerDataService,
    SETTINGS_SERVICE,
    ZITI_DATA_SERVICE,
    ZAC_WRAPPER_SERVICE,
    ZITI_DOMAIN_CONTROLLER,
    ZITI_NAVIGATOR,
    ZITI_TAB_OVERRIDES,
    ZITI_URLS,
    DEACTIVATE_GUARD,
    ZAC_LOGIN_SERVICE,
    EDGE_ROUTER_EXTENSION_SERVICE,
    SERVICE_EXTENSION_SERVICE,
    ExtensionsNoopService,
    IDENTITY_EXTENSION_SERVICE,
    SERVICE_POLICY_EXTENSION_SERVICE,
    EDGE_ROUTER_POLICY_EXTENSION_SERVICE,
    SERVICE_EDGE_ROUTER_POLICY_EXTENSION_SERVICE
} from "ziti-console-lib";

import {AppRoutingModule} from "./app-routing.module";
import {SimpleZitiDomainControllerService} from "./services/simple-ziti-domain-controller.service";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {MatDialogModule} from "@angular/material/dialog";
import {URLS} from "./app-urls.constants";
import {CLASSIC_ZITI_NAVIGATOR, OPEN_ZITI_NAVIGATOR} from "./app-nav.constants";
import {ZitiApiInterceptor} from "./interceptors/ziti-api.interceptor";
import {LoggerModule, NgxLoggerLevel} from "ngx-logger";
import {ErrorInterceptor} from "./interceptors/error-handler.interceptor";
import {LoggingInterceptor} from "./interceptors/logging.interceptor";
import {ControllerLoginService} from "./login/controller-login.service";
import {NodeLoginService} from "./login/node-login.service";
import {NodeSettingsService} from "./services/node-settings.service";
import {NoopHttpInterceptor} from "./interceptors/noop-http.interceptor";
import {NodeApiInterceptor} from "./interceptors/node-api.interceptor";

let loginService, zitiDataService, settingsService, wrapperService, apiInterceptor;
if (environment.nodeIntegration) {
    loginService = NodeLoginService;
    zitiDataService = NodeDataService;
    settingsService = NodeSettingsService;
    wrapperService = NodeWrapperService;
    apiInterceptor = NodeApiInterceptor;
}else {
    loginService = ControllerLoginService;
    zitiDataService = ZitiControllerDataService;
    settingsService = SettingsService;
    wrapperService = ZacWrapperService;
    apiInterceptor = ZitiApiInterceptor;
}

@NgModule({ declarations: [
        AppComponent,
        PageNotFoundComponent,
        LoginComponent
    ],
    exports: [],
    bootstrap: [AppComponent], imports: [BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        MatDialogModule,
        AppRoutingModule,
        OpenZitiConsoleLibModule,
        GrowlerModule,
        LoggerModule.forRoot({ level: NgxLoggerLevel.DEBUG, serverLogLevel: NgxLoggerLevel.ERROR }),
        OAuthModule.forRoot()], providers: [
        { provide: ZITI_DOMAIN_CONTROLLER, useClass: SimpleZitiDomainControllerService },
        { provide: ZAC_WRAPPER_SERVICE, useClass: wrapperService },
        { provide: ZITI_URLS, useValue: URLS },
        { provide: ZITI_NAVIGATOR, useValue: CLASSIC_ZITI_NAVIGATOR },
        { provide: ZITI_TAB_OVERRIDES, useClass: NoopTabInterceptorService },
        { provide: HTTP_INTERCEPTORS, useClass: apiInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: LoggingInterceptor, multi: true },
        { provide: DEACTIVATE_GUARD, useClass: DeactivateGuardService },
        { provide: ZITI_DATA_SERVICE, useClass: zitiDataService },
        { provide: ZAC_LOGIN_SERVICE, useClass: loginService },
        { provide: SETTINGS_SERVICE, useClass: settingsService },
        { provide: EDGE_ROUTER_EXTENSION_SERVICE, useClass: ExtensionsNoopService },
        { provide: IDENTITY_EXTENSION_SERVICE, useClass: ExtensionsNoopService },
        { provide: SERVICE_EXTENSION_SERVICE, useClass: ExtensionsNoopService },
        { provide: SERVICE_POLICY_EXTENSION_SERVICE, useClass: ExtensionsNoopService },
        { provide: EDGE_ROUTER_POLICY_EXTENSION_SERVICE, useClass: ExtensionsNoopService },
        { provide: SERVICE_EDGE_ROUTER_POLICY_EXTENSION_SERVICE, useClass: ExtensionsNoopService },
        provideHttpClient(withInterceptorsFromDi()),
        providePrimeNG({
            theme: {
                preset: Aura
            }
        }),
    ] })
export class AppModule {
}
