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

import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";

import {Router} from "@angular/router";
import {LoginServiceClass, ZAC_LOGIN_SERVICE} from "../../services/login-service.class";
import {SETTINGS_SERVICE} from "../../services/settings.service";
import {SettingsServiceClass} from "../../services/settings-service.class";
import {isEmpty} from "lodash";

@Component({
  selector: 'lib-confirm',
  templateUrl: './login-dialog.component.html',
  styleUrls: ['./login-dialog.component.scss']
})
export class LoginDialogComponent implements OnInit {

  dataObj = {}
  selectedEdgeController = '';
  username = '';
  password = '';
  loginFailed = false;
  edgeControllerList = [];

  constructor(
    @Inject(ZAC_LOGIN_SERVICE) public svc: LoginServiceClass,
    @Inject(SETTINGS_SERVICE) private settingsService: SettingsServiceClass,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private router: Router,
    private dialogRef: MatDialogRef<LoginDialogComponent>
  ) {
    this.dataObj = data;
    this.svc.loginDialogOpen = true;
    this.selectedEdgeController = this.settingsService?.settings?.selectedEdgeController;
  }

  ngOnInit() {
    this.settingsService.settingsChange.subscribe((results: any) => {
      if (this.svc.originIsController) {
        return;
      }
      if (results) this.settingsReturned(results);
    });
  }

  settingsReturned(settings: any) {
    this.edgeControllerList = [];
    if (settings.edgeControllers?.length > 0) {
      this.edgeControllerList = [];
      settings.edgeControllers.forEach((controller) => {
        if (!controller.url) {
          return;
        }
        this.edgeControllerList.push({name:controller.name + ` (${controller.url})`, value: controller.url});
      });
    }
    const serviceUrl = localStorage.getItem("ziti-serviceUrl-value");
    if (!isEmpty(serviceUrl)) {
      const lastUrl: any = JSON.parse(serviceUrl).data;
      this.selectedEdgeController = lastUrl.trim();
    } else {
      this.selectedEdgeController = settings.selectedEdgeController;
    }
  }

  edgeChanged(event?) {
    if (this.selectedEdgeController) {
      this.settingsService.initApiVersions(this.selectedEdgeController)
    }
    this.settingsService.settings.selectedEdgeController = this.selectedEdgeController;
  }

  login() {
      const apiVersions = this.settingsService.apiVersions;
      const prefix = apiVersions && apiVersions["edge-management"]?.v1?.path || '';
      this.loginFailed = false;
      this.svc.login(
          prefix,
          this.selectedEdgeController,
          this.username.trim(),
          this.password,
          false
      ).then((result) => {
        if (result?.error) {
          return;
        }
        this.svc.loginDialogOpen = false;
        this.settingsService.set(this.settingsService.settings);
        this.dialogRef.close({isLoggedIn: true});
      }).catch(() => {
        this.loginFailed = true;
      });
  }

  close() {
    this.svc.loginDialogOpen = false;
    this.dialogRef.close();
  }

  returnToLoginPage() {
    this.svc.loginDialogOpen = false;
    this.dialogRef.close({returnToLogin: true});
  }
}
