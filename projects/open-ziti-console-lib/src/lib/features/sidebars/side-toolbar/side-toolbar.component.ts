import {Component, Inject, ViewChild, ElementRef} from '@angular/core';
import {SettingsService, SETTINGS_SERVICE} from "../../../services/settings.service";

import {cloneDeep} from 'lodash';
import { Router } from '@angular/router';
import { ZacWrapperServiceClass } from '../../wrappers/zac-wrapper-service.class';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {ZAC_WRAPPER_SERVICE} from "../../wrappers/zac-wrapper-service.class";
import { LOGIN_SERVICE, LoginServiceClass } from '../../../services/login-service.class';

import {defer} from "lodash";

// @ts-ignore
const {header, app, commands} = window
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
      @Inject(LOGIN_SERVICE) private loginService: LoginServiceClass
  ) {}

  ngOnInit() {
    this.zacService.initZac();
    app.init();
    this.zacService.initZACButtonListener();
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
    this.addAnyOpen = true;
    header.showAdd();
    this.apijson.nativeElement.innerHTML = `<textarea id="ApiJson"></textarea>`;
    this.identityqr.nativeElement.innerHTML = '';
    window['$']("#InlineAddIdentityButton").off('click');
    window['$']("#InlineAddServiceButton").off('click');
    window['$']("#CreateButton").off('click');
    window['$']("#CreateIdButton").off('click');
    window['$']("#CreateButton").click(window['app'].createSService);
    window['$']("#CreateIdButton").click(window['app'].createId);
    window['$']("#InlineAddIdentityButton").click(window['app'].showInlineId);
    window['$']("#InlineAddServiceButton").click(window['app'].showInlineService);
    defer(() => {
      commands.init();
    });
  }
}
