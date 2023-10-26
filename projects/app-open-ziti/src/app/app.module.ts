import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';

import {AppComponent} from './app.component';
import {PageNotFoundComponent} from './page-not-found/page-not-found.component';
import {HTTP_INTERCEPTORS, HttpClientModule} from "@angular/common/http";
import {LoginComponent} from './login/login.component';
import {FormsModule} from "@angular/forms";
import {environment} from "./environments/environment";

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
    LOGIN_SERVICE
} from "open-ziti-console-lib";

import {AppRoutingModule} from "./app-routing.module";
import {SimpleZitiDomainControllerService} from "./services/simple-ziti-domain-controller.service";
import {BrowserAnimationsModule} from "@angular/platform-browser/animations";
import {MatDialogModule} from "@angular/material/dialog";
import {URLS} from "./app-urls.constants";
import {OPEN_ZITI_NAVIGATOR} from "./app-nav.constants";
import {ZitiApiInterceptor} from "./interceptors/ziti-api.interceptor";
import {LoggerModule, NgxLoggerLevel} from "ngx-logger";
import {ErrorInterceptor} from "./interceptors/error-handler.interceptor";
import {LoggingInterceptor} from "./interceptors/logging.interceptor";
import {ControllerLoginService} from "./login/controller-login.service";
import {NodeLoginService} from "./login/node-login.service";
import {NodeSettingsService} from "./services/node-settings.service";
import {NoopHttpInterceptor} from "./interceptors/noop-http.interceptor";

let loginService, zitiDataService, settingsService, wrapperService, apiInterceptor;
if (environment.nodeIntegration) {
    loginService = NodeLoginService;
    zitiDataService = NodeDataService;
    settingsService = NodeSettingsService;
    wrapperService = NodeWrapperService;
    apiInterceptor = NoopHttpInterceptor;
}else {
    loginService = ControllerLoginService;
    zitiDataService = ZitiControllerDataService;
    settingsService = SettingsService;
    wrapperService = ZacWrapperService;
    apiInterceptor = ZitiApiInterceptor;
}

@NgModule({
    declarations: [
        AppComponent,
        PageNotFoundComponent,
        LoginComponent,
    ],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        MatDialogModule,
        HttpClientModule,
        AppRoutingModule,
        OpenZitiConsoleLibModule,
        GrowlerModule,
        LoggerModule.forRoot({level: NgxLoggerLevel.DEBUG, serverLogLevel: NgxLoggerLevel.ERROR}),
    ],
    exports: [],
    providers: [
        {provide: ZITI_DOMAIN_CONTROLLER, useClass: SimpleZitiDomainControllerService},
        {provide: ZAC_WRAPPER_SERVICE, useClass: wrapperService},
        {provide: ZITI_URLS, useValue: URLS},
        {provide: ZITI_NAVIGATOR, useValue: OPEN_ZITI_NAVIGATOR},
        {provide: ZITI_TAB_OVERRIDES, useClass: NoopTabInterceptorService},
        {provide: HTTP_INTERCEPTORS, useClass: apiInterceptor, multi: true},
        {provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true},
        {provide: HTTP_INTERCEPTORS, useClass: LoggingInterceptor, multi: true},
        {provide: DEACTIVATE_GUARD, useClass: DeactivateGuardService},
        {provide: ZITI_DATA_SERVICE, useClass: zitiDataService},
        {provide: LOGIN_SERVICE, useClass: loginService},
        {provide: SETTINGS_SERVICE, useClass: settingsService},
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
