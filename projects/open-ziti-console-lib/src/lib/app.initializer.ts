import {Injector} from "@angular/core";
import {SettingsService, SETTINGS_SERVICE} from "./services/settings.service";
import {LOGIN_SERVICE, LoginServiceClass} from "./services/login-service.class";

export function onAppInit(injector: Injector): () => Promise<any> {
    const loginService = injector.get(LOGIN_SERVICE, LoginServiceClass);
    const settingsService = injector.get(SETTINGS_SERVICE, SettingsService);
    return () => Promise.all([settingsService.init(), loginService.init()]);
}
