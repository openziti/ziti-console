import {Component, EventEmitter, Inject, Input} from '@angular/core';
import {Router} from '@angular/router';
import { CommonModule } from '@angular/common';
import {FormsModule} from '@angular/forms';
import {defer} from 'lodash-es';
import {ZITI_NAVIGATOR} from "../../ziti-console.constants";

@Component({
  selector: 'lib-side-navigator',
  templateUrl: './side-navigator.component.html',
  styleUrls: ['./side-navigator.component.scss'],
})
export class SideNavigatorComponent {

  @Input() version = '';
  currentNetwork: any = {};

  navExpanded = true;
  navHidden = false;
  hideMenuNavBar = false;
  betaFeaturesEnabled = false;

  constructor(
      private router: Router,
      @Inject(ZITI_NAVIGATOR) public currentNav: any
  ) {}


  navItemSelected(navItem: any) {

  }

  isNavItemDisabled(navItem: any) {

  }

  doNavAction(event, navItem: any) {
    const isCommandOrCtrl = event.metaKey || event.ctrlKey;

    if (isCommandOrCtrl) {
      // No-Op allow the native browser behavior (open in new window)
    } else {
      this.router.navigate([navItem.route]);
      event.preventDefault();
    }
  }

  showExpandCollapseIcon = false;
  showExpandCollapseIconChange: EventEmitter<boolean> = new EventEmitter();
  showExpandCollapse(event: any) {
    defer(() => {
      this.showExpandCollapseIcon = true;
      this.showExpandCollapseIconChange.emit(this.showExpandCollapseIcon);
    })
  }

  hideExpandCollapse(event: any) {
    this.showExpandCollapseIcon = false;
    this.showExpandCollapseIconChange.emit(this.showExpandCollapseIcon);
  }

  toggleNavigationExpanded(event: any) {
    this.navExpanded = !this.navExpanded;
  }

  get expandCollapseIconVisible() {
    return this.showExpandCollapseIcon || !this.navExpanded;
  }
}
