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

import {Component, Inject, ViewChild, ElementRef} from '@angular/core';
import {SettingsService, SETTINGS_SERVICE} from "../../../services/settings.service";

import {cloneDeep} from 'lodash';
import { Router } from '@angular/router';
import { ZacWrapperServiceClass } from '../../wrappers/zac-wrapper-service.class';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {ZAC_WRAPPER_SERVICE} from "../../wrappers/zac-wrapper-service.class";
import { ZAC_LOGIN_SERVICE, LoginServiceClass } from '../../../services/login-service.class';

import {defer} from "lodash";
import {ConsoleEventsService} from "../../../services/console-events.service";

// @ts-ignore
const {header, app, commands, modal, $} = window;
@Component({
  selector: 'lib-side-toolbar',
  templateUrl: './side-toolbar.component.html',
  styleUrls: ['./side-toolbar.component.scss']
})
export class SideToolbarComponent {
  hideNav:boolean | undefined;
  menuOpen = false;
  sideBarInit = false;
  addAnyOpen = false;

  @ViewChild('apijson') apijson: ElementRef;
  @ViewChild('identityqr') identityqr: ElementRef;
  constructor(
      @Inject(SETTINGS_SERVICE) private settingsService: SettingsService,
      private router: Router,
      @Inject(ZAC_WRAPPER_SERVICE) private zacService: ZacWrapperServiceClass,
      @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
      private consoleEvents: ConsoleEventsService,
  ) {}

  ngOnInit() {
    this.zacService.initZac();
    app.init();
    this.zacService.initZACButtonListener();
    this.settingsService.initApiVersions(this.settingsService?.settings?.selectedEdgeController);
    this.settingsService.settingsChange.subscribe((results:any) => {
      this.hideNav = results.hideNav;
      this.initSideBar();
    });
  }

  initSideBar() {
    if (this.sideBarInit) {
      return;
    }
    window['header'].init();
    window['locale'].init();
    window['modal'].init();
    this.sideBarInit = true;
  }

  toggleNav() {
    this.hideNav = !this.hideNav;
    const settings = {
      ...this.settingsService.settings, hideNav: this.hideNav
    }
    this.settingsService.set(settings);
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu() {
    this.menuOpen = false;
  }

  doLogout() {
    this.loginService.logout();
  }

  closeAdd() {
    this.addAnyOpen = false;
  }

  showAdd() {
    modal?.close();
    this.addAnyOpen = true;
    this.consoleEvents.closeSideModal.emit(true);
    header.showAdd();
    this.apijson.nativeElement.innerHTML = `<textarea id="ApiJson"></textarea>`;
    this.identityqr.nativeElement.innerHTML = '';
    $("#InlineAddIdentityButton").off('click');
    $("#InlineAddServiceButton").off('click');
    $("#CreateButton").off('click');
    $("#CreateIdButton").off('click');
    $("#CreateButton").click(window['app'].createSService);
    $("#CreateIdButton").click(window['app'].createId);
    $("#InlineAddIdentityButton").click(window['app'].showInlineId);
    $("#InlineAddServiceButton").click(window['app'].showInlineService);
    defer(() => {
      commands.init();
    });
  }

  get mailSupported() {
    return this.settingsService?.supportedFeatures?.mailer;
  }

  get orgSupported() {
    return this.settingsService?.supportedFeatures?.organization;
  }
}
