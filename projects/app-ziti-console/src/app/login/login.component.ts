import {Inject, Component, OnDestroy, OnInit} from '@angular/core';
import { Router } from '@angular/router';
import {SettingsServiceClass, LoginServiceClass, SETTINGS_SERVICE, ZAC_LOGIN_SERVICE} from "ziti-console-lib";
import {Subscription} from "rxjs";
import {defer, isEmpty, get} from "lodash";

// @ts-ignore
const {growler, context} = window;

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
    edgeControllerList: any[] = [];
    username = '';
    password = '';
    edgeName: string = '';
    edgeUrl: string = '';
    edgeCreate = false;
    userLogin = false;
    selectedEdgeController: any;
    edgeNameError = '';
    edgeUrlError = '';
    backToLogin = false;
    showEdge = false;
    private subscription = new Subscription();

    constructor(
        @Inject(ZAC_LOGIN_SERVICE) private svc: LoginServiceClass,
        @Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
        private router: Router,
        ) { }

    ngOnInit() {
        if (this.svc.hasSession()) {
            this.router.navigate(['/dashboard']);
        }
        this.subscription.add(
        this.settingsService.settingsChange.subscribe((results: any) => {
            if (results) this.settingsReturned(results);
        }));
        this.edgeChanged();
        this.initSettings();
    }

    async login() {
        if(this.selectedEdgeController) {
            context.set("serviceUrl", this.selectedEdgeController);
            const apiVersions = this.settingsService.apiVersions;
            const prefix = apiVersions && apiVersions["edge-management"]?.v1?.path || '';
            this.svc.login(
                prefix,
                this.selectedEdgeController,
                this.username.trim(),
                this.password
            ).then(() => {
                context.set('serviceUrl', this.selectedEdgeController);
                this.settingsService.settings.selectedEdgeController = this.selectedEdgeController;
                this.settingsService.set(this.settingsService.settings);
            });
        }
    }

    next() {
        if (this.edgeCreate) {
            this.create();
        } else {
            this.login();
        }
    }
    create() {
        if (this.isValid()) {
            this.settingsService.addContoller(this.edgeName, this.edgeUrl);
            context.set("serviceUrl", this.edgeUrl);
            this.settingsService.set(this.settingsService.settings);
        } else growler.form();
    }

    isValid() {
        this.edgeNameError = '';
        this.edgeUrlError = '';
        if (this.edgeName.trim().length == 0) this.edgeNameError = '';
        if (this.edgeUrl.trim().length == 0) this.edgeUrlError = '';
        return!(this.edgeNameError || this.edgeUrlError);
    }

    reset() {
        this.edgeNameError = '';
        this.edgeUrlError = '';
        this.edgeCreate = false;
        this.userLogin = true;
    }

    edgeChanged(event?) {
        this.edgeNameError = '';
        this.edgeUrlError = '';
        if (this.selectedEdgeController) {
            this.edgeName = ''
            this.edgeUrl = ''
            this.edgeCreate = false;
            this.userLogin = true;
            this.settingsService.initApiVersions(this.selectedEdgeController)
        } else {
            this.edgeCreate = true;
            this.userLogin = false;
        }
        this.settingsService.settings.selectedEdgeController = this.selectedEdgeController;
    }

    initSettings() {
        this.settingsService.loadSettings();
    }

    settingsReturned(settings: any) {
        this.edgeControllerList = [];
        if (settings.edgeControllers?.length > 0) {
            this.backToLogin = false;
            this.edgeControllerList = [];
            settings.edgeControllers.forEach((controller) => {
                this.edgeControllerList.push({name:controller.name + ` (${controller.url})`, value: controller.url});
            });
            this.reset();
        } else {
            this.backToLogin = true;
            this.edgeCreate = true;
            this.userLogin = false;
        }
        const serviceUrl = localStorage.getItem("ziti-serviceUrl-value");
        if (!isEmpty(serviceUrl)) {
            const lastUrl: any = JSON.parse(serviceUrl).data;
            defer(() => {
                this.selectedEdgeController = lastUrl.trim();
            });
        } else {
            defer(() => {
                this.selectedEdgeController = settings.selectedEdgeController;
            });
        }
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}
