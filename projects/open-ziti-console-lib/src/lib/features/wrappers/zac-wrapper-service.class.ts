import {EventEmitter, Inject, Injectable, InjectionToken} from "@angular/core";
import {Router} from "@angular/router";
import {ZITI_DOMAIN_CONTROLLER, ZitiDomainControllerService} from "../../services/ziti-domain-controller.service";
import {ZITI_URLS} from "../../open-ziti.constants";
import {SETTINGS_SERVICE, SettingsService} from "../../services/settings.service";
import {HttpClient} from "@angular/common/http";
import {Subscription} from "rxjs";
import $ from 'jquery';
import {GrowlerService} from "../messaging/growler.service";

export const ZAC_WRAPPER_SERVICE = new InjectionToken<ZacWrapperServiceClass>('ZAC_WRAPPER_SERVICE');

@Injectable({providedIn: 'root'})
export abstract class ZacWrapperServiceClass {

    rootResourceAddress: string;
    zitiUpdated = new EventEmitter<void>();
    pageChanged = new EventEmitter<void>();
    subscription: Subscription = new Subscription();
    page = '';
    scriptsAdded = false;
    zacInit = false;

    constructor(
        @Inject(ZITI_DOMAIN_CONTROLLER) protected zitiDomainController: ZitiDomainControllerService,
        @Inject(ZITI_URLS) protected URLS: any,
        @Inject(SETTINGS_SERVICE) protected settingsService: SettingsService,
        protected http: HttpClient,
        protected router: Router,
        protected growlerService: GrowlerService
    ) {}

    public abstract initZac();
    public abstract loadCurrentPage()
    public abstract initZACButtonListener();
    protected abstract initZacListeners();

    resetZacEvents() {
        window['$']("input").off("keyup");
        window['$']("select").off("keyup");
        window['$'](".toggle").off("click");
        window['$']("body").off("keyup");
        window['tags'].tagData = [];
    }
}