import {Component, Inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ZAC_WRAPPER_SERVICE, ZacWrapperServiceClass} from "./zac-wrapper-service.class";
import {delay, invoke, isEmpty, defer, set, get} from 'lodash';
import {Subscription} from "rxjs";
import {SettingsService, SETTINGS_SERVICE} from "../../services/settings.service";
import {LoggerService} from "../messaging/logger.service";

import $ from 'jquery';
const context = window['context'];

@Component({
    selector: 'app-zac-wrapper',
    templateUrl: './zac-wrapper.component.html',
    styleUrls: ['./zac-wrapper.component.scss'],
})
export class ZacWrapperComponent implements OnInit, OnDestroy {

  loading = false;
  pageHtml: any = '';
  subscription = new Subscription();
  title = 'Ziti Console';
  waitingForSession = true;
  pageLoading = false;
  @ViewChild('zacContainer') zacContainer: any;

  constructor(
      @Inject(ZAC_WRAPPER_SERVICE) private wrapperService: ZacWrapperServiceClass,
      @Inject(SETTINGS_SERVICE) private settingsService: SettingsService,
      private loggerService: LoggerService
  ) {
  }

  ngOnInit(): void {
    this.loading = true;
    this.wrapperService.initZac();
    this.subscription.add(
    this.wrapperService.pageChanged.subscribe(() => {
      if (this.waitingForSession) {
        return;
      }
      this.loadPage();
    }));
    this.settingsService.settingsChange.subscribe((results:any) => {
        if (this.waitingForSession && !this.pageLoading) {
            this.pageLoading = true;
            delay(async () => {
              await this.loadPage();
              this.waitingForSession = false;
              this.pageLoading = false;
            }, 200)
        }
    });
    defer(() => {
      this.wrapperService.initZACButtonListener();
    })
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
    this.pageHtml = undefined;
  }

  async loadPage() {
    this.loading = true;
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
      }catch(err) {
        this.loggerService.error('error initializing page scripts');
      } finally {
        this.loading = false;
      }
    });
  }
}
