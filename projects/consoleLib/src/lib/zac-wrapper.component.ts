import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ZacWrapperService} from "./zac-wrapper.service";
import {invoke} from 'lodash';
import {Subscription} from "rxjs";

@Component({
    selector: 'app-zac-wrapper',
    templateUrl: './zac-wrapper.component.html',
    styleUrls: ['./zac-wrapper.component.scss'],
})
export class ZacWrapperComponent implements OnInit, OnDestroy {

  pageHtml: any = '';
  subscription = new Subscription();
  title = 'Ziti Console';

  @ViewChild('zacContainer') zacContainer: any;

  constructor(private wrapperService: ZacWrapperService) {
  }

  ngOnInit(): void {
    this.wrapperService.initZac();
    this.subscription.add(
    this.wrapperService.pageChange.subscribe(() => {
      this.loadPage();
    }));

  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  async loadPage() {
    this.pageHtml = await this.wrapperService.loadCurrentPage();
    this.executePageScripts();
  }

  executePageScripts() {
    setTimeout(() => {
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
      setTimeout(() => {
        invoke(window, 'app.init');

      }, 30);
    });
  }
}
