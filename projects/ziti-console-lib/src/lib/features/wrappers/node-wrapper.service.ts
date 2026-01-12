import {ZacWrapperService, COMPONENTS} from "./zac-wrapper.service";
import {EventEmitter, Inject, Injectable} from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {Router} from "@angular/router";
import {ZITI_DOMAIN_CONTROLLER, ZitiDomainControllerService} from "../../services/ziti-domain-controller.service";
import {ZITI_URLS} from "../../ziti-console.constants";
import {Subscription} from "rxjs";
import {SETTINGS_SERVICE, SettingsService} from "../../services/settings.service";

import {get, set, isEmpty} from "lodash";
import {GrowlerService} from "../messaging/growler.service";
import {LoggerService} from "../messaging/logger.service";
import {ValidationService} from "../../services/validation.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../services/ziti-data.service";

@Injectable({providedIn: 'root'})
export class NodeWrapperService extends ZacWrapperService {

    constructor(
        @Inject(ZITI_DOMAIN_CONTROLLER) override zitiDomainController: ZitiDomainControllerService,
        @Inject(ZITI_URLS) override URLS:any,
        @Inject(SETTINGS_SERVICE) override settingsService: SettingsService,
        override http: HttpClient,
        override router: Router,
        override growlerService: GrowlerService,
        override loggerService: LoggerService,
        override validationService: ValidationService
    ) {
        super(zitiDomainController, URLS, settingsService, http, router, growlerService, loggerService, validationService);
    }

    override initZac() {
        if (this.zacInit) {
            return;
        }
        const appInit = get(window, 'app.init');
        this.initZacListeners();
        this.zacInit = true;
    }
}
