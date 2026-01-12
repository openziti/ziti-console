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

import {Component, Inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router';
import {ZAC_WRAPPER_SERVICE, ZacWrapperServiceClass} from "./zac-wrapper-service.class";
import {cloneDeep, delay, invoke, isEmpty, defer, set, get} from 'lodash';
import {Subscription} from "rxjs";
import {SettingsService, SETTINGS_SERVICE} from "../../services/settings.service";
import {LoggerService} from "../messaging/logger.service";

import $ from 'jquery';
import {LoginServiceClass, ZAC_LOGIN_SERVICE} from "../../services/login-service.class";
const context = window['context'];

@Component({
    selector: 'app-zac-wrapper',
    templateUrl: './zac-wrapper.component.html',
    styleUrls: ['./zac-wrapper.component.scss'],
    standalone: false
})
export class ZacWrapperComponent implements OnInit, OnDestroy {

  loading = false;
  pageHtml: any = '';
  subscription = new Subscription();
  title = 'Ziti Console';
  waitingForSession = true;
  pageLoading = false;
  settings: any = {};
  @ViewChild('zacContainer') zacContainer: any;

  constructor(
      @Inject(ZAC_WRAPPER_SERVICE) private wrapperService: ZacWrapperServiceClass,
      @Inject(SETTINGS_SERVICE) private settingsService: SettingsService,
      private loggerService: LoggerService,
      @Inject(ZAC_LOGIN_SERVICE) private loginService: LoginServiceClass,
      private router: Router,
  ) {
  }

  ngOnInit(): void {
    this.wrapperService.initZac();
    this.subscription.add(
      this.wrapperService.pageChanged.subscribe(() => {
        if (this.waitingForSession) {
          return;
        }
        this.loadPage();
      })
    );
    this.subscription.add(
        this.wrapperService.zitiUpdated.subscribe(() => {
          if (this.waitingForSession) {
            return;
          }
          this.loadPage();
        })
    );
    this.subscription.add(
      this.settingsService.settingsChange.subscribe(async (results:any) => {
        const hasSession = this.settingsService.hasSession();
        const controllerChanged = this.settings?.session?.controllerDomain !== results?.session?.controllerDomain;
        if (hasSession && (!this.pageLoading || controllerChanged)) {
          this.pageLoading = true;
          this.pageHtml = undefined;
          defer(async () => {
            await this.loadPage();
            this.waitingForSession = false;
            this.pageLoading = false;
          });
        }
        this.settings = cloneDeep(results);
      })
    );
    this.subscription.add(
        this.router.events.subscribe((event: any) => {
          if (event instanceof NavigationEnd) {
            this.loadPage();
          }
        })
    );
    defer(() => {
      this.wrapperService.initZACButtonListener();
    })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.pageHtml = undefined;
  }

  async loadPage() {
    this.pageHtml = await this.wrapperService.loadCurrentPage();
    defer(() => {
      this.wrapperService.resetZacEvents();
      this.executePageScripts();
    });
  }

  executePageScripts() {
    const scripts = this.zacContainer.nativeElement.getElementsByTagName('script');
    for (const script of scripts) {
      const scriptCopy = <HTMLScriptElement>document.createElement('script');
      scriptCopy.type = script.type ? script.type : 'text/javascript';
      if (script.innerHTML) {
        scriptCopy.innerHTML = script.innerHTML;
      } else if (script.src) {
        scriptCopy.src = script.src;
      }
      scriptCopy.async = false;
      script.parentNode.replaceChild(scriptCopy, script);
    }
    defer(() => {
      try{
        set(window, 'context.items', []);
        set(window, 'context.watchers', []);
        set(window, 'context.eventWatchers', []);
        invoke(window, 'app.init');
        context.addListener(get(window, 'page.filterObject.name', 'identities'), this.wrapperService.initZACButtonListener);
        this.wrapperService.initZACPersonalSettings();
      }catch(err) {
        this.loggerService.error('error initializing page scripts');
      } finally {
        this.loading = false;
      }
    });
  }
}
