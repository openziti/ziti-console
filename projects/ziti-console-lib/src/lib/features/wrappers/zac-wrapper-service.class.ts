import {EventEmitter, Inject, Injectable, InjectionToken} from "@angular/core";
import {Router} from "@angular/router";
import {ZITI_DOMAIN_CONTROLLER, ZitiDomainControllerService} from "../../services/ziti-domain-controller.service";
import {ZITI_URLS} from "../../ziti-console.constants";
import {SETTINGS_SERVICE, SettingsService} from "../../services/settings.service";
import {HttpClient} from "@angular/common/http";
import {Subscription} from "rxjs";
import {GrowlerService} from "../messaging/growler.service";
import {LoggerService} from "../messaging/logger.service";
import {ValidationService} from "../../services/validation.service";

export const ZAC_WRAPPER_SERVICE = new InjectionToken<ZacWrapperServiceClass>('ZAC_WRAPPER_SERVICE');

// @ts-ignore
const {$, tags} = window;

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
        protected growlerService: GrowlerService,
        protected loggerService: LoggerService,
        protected validationService: ValidationService
    ) {}

    public abstract initZac();
    public abstract loadCurrentPage()
    public abstract initZACButtonListener();
    protected abstract initZacListeners();

    initZACPersonalSettings() {
        if (!this.settingsService?.supportedFeatures?.tags) {
            localStorage.setItem("hideTags", "yes");
        } else {
            localStorage.removeItem("hideTags")
        }
        if (localStorage.getItem("primaryColor")!=null) {
            document.documentElement.style.setProperty("--primary", localStorage.getItem("primaryColor"));
        }
        if (localStorage.getItem("secondaryColor")!=null) {
            document.documentElement.style.setProperty("--secondary", localStorage.getItem("secondaryColor"));
        }
        var mode = localStorage.getItem("Transitions");
        if (mode=="off") {
            document.documentElement.style.setProperty("--transition", "0s");
        } else {
            document.documentElement.style.setProperty("--transition", "0.5s");
        }
        $(document).ready((e) => {
            $(".personal").show();
            if (!this.settingsService?.supportedFeatures?.tags) {
                $("#HideTags").parent().hide();
                $('<div></div>').insertBefore($("#HideTags").parent().siblings()[3]);
            }
        });
    }

    resetZacEvents() {
        $("input").off("keyup");
        $("select").off("keyup");
        $(".toggle").off("click");
        $("body").off("keyup");
        $("#SServiceName").off('keyup');
        $("#SServiceHost").off('keyup');
        $("#CreateButton").off('click');
        $("#CreateIdButton").off('click');
        $("#IdentityDownload").off('click');
        $("#DoneIdButton").off('click');
        $("#DoneServiceButton").off('click');
        $("#InlineAddIdentityButton").off('click');
        $("#InlineAddServiceButton").off('click');
        $("#AlertButton").off('click');
        tags.tagData = [];
    }
}