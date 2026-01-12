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

import {Component, OnInit, Inject} from '@angular/core';
import {SettingsServiceClass, LoginServiceClass, SETTINGS_SERVICE, ZITI_DOMAIN_CONTROLLER, ZAC_LOGIN_SERVICE} from "ziti-console-lib";
import { SimpleZitiDomainControllerService} from './services/simple-ziti-domain-controller.service';
import { Router } from '@angular/router';
import {MatDialog} from "@angular/material/dialog";
import {VERSION} from "ziti-console-lib";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnInit {
    title = 'Ziti Admin Console';
    version = '';
    isAuthorized = false;
    displayNav = true;
    displayTool = true;
    showModal = false;
    loading = true;
    darkmodeEnabled = false;

    constructor(
        @Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
        @Inject(ZITI_DOMAIN_CONTROLLER) private zitiControllerService: SimpleZitiDomainControllerService,
        @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
        private router: Router,
        private dialogRef: MatDialog
    ) {}

    ngOnInit() {
        this.loading = true;
        this.settingsService.settingsChange.subscribe((results:any) => {
            this.version = results.version;
            this.displayNav = !(results.hideNav ?? true);
            this.displayTool = !(results.hideTool ?? true);
            this.loading = false;
            this.checkSession();
            this.handleUserSettings();
        });
        this.checkOriginForController();
    }

    async checkSession() {
        this.isAuthorized = this.settingsService.hasSession();
        const url = window.location.href;
        const path = url.split("?")[0];
        if (!this.isAuthorized && path.indexOf('callback') < 0) {
            this.loginService.loginDialogOpen = false;
            this.dialogRef.closeAll();
            this.router.navigate(['/login']);
        }
        return Promise.resolve();
    }

    checkOriginForController() {
        this.loginService.checkOriginForController().then((result) => {
            this.loginService.originIsController = result;
        });
    }

    handleUserSettings() {
        if (localStorage.getItem("mode")!=null&&localStorage.getItem("mode")=="dark") {
            this.darkmodeEnabled = true;
            this.loadDarkModeStyles();
          }
          if (localStorage.getItem("primaryColor")!=null) {
            document.documentElement.style.setProperty("--primary", localStorage.getItem("primaryColor"));
          }
          if (localStorage.getItem("secondaryColor")!=null) {
            document.documentElement.style.setProperty("--secondary", localStorage.getItem("secondaryColor"));
          }
    }

    loadDarkModeStyles() {
        const head = document.getElementsByTagName('head')[0];
        let themeLink = document.getElementById(
            'client-theme'
        ) as HTMLLinkElement;
        if (themeLink) {
            themeLink.href = `./assets/styles/dark.css?v=${VERSION.version}`;
        } else {
            const style = document.createElement('link');
            style.id = 'client-theme';
            style.rel = 'stylesheet';
            style.type = 'text/css';
            style.href = `./assets/styles/dark.css?v=${VERSION.version}`; //<--add assets

            head.appendChild(style);
        }
    }
}
