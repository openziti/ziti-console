import {Component, inject, ViewChild, ViewContainerRef} from "@angular/core";
import {ExtensionService, SHAREDZ_EXTENSION} from "./extensions-noop.service";

@Component({
  template: ` `
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
