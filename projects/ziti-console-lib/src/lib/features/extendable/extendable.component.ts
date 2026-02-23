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

import {Component, inject, ViewChild, ViewContainerRef} from "@angular/core";
import {ExtensionService, SHAREDZ_EXTENSION} from "./extensions-noop.service";

@Component({
    template: ` `,
    standalone: false
})
export class ExtendableComponent {
  @ViewChild("beforetitleext", {read: ViewContainerRef}) beforeTitleVC: ViewContainerRef | undefined;
  @ViewChild("aftertitleext", {read: ViewContainerRef}) afterTitleVC: ViewContainerRef | undefined;
  @ViewChild("beforebuttonsext", {read: ViewContainerRef}) beforeButtonsVC: ViewContainerRef | undefined;
  @ViewChild("afterbuttonsext", {read: ViewContainerRef}) afterButtonsVC: ViewContainerRef | undefined;

  extSvc: ExtensionService | undefined;

  constructor() {
    this.extSvc = inject(SHAREDZ_EXTENSION);
  }

  ngAfterViewInit() {
    const vcrs = {
      beforeTitleVC: this.beforeTitleVC,
      afterTitleVC: this.afterTitleVC,
      beforeButtonsVC: this.beforeButtonsVC,
      afterButtonsVC: this.afterButtonsVC
    }
    if (this.extSvc) {
      this.extSvc.extendAfterViewInits(vcrs);
    }
  }
}
