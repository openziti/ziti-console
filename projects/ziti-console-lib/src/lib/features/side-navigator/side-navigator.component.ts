import {Component, EventEmitter, Inject, Input, OnInit, OnDestroy} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router';
import { CommonModule } from '@angular/common';
import {FormsModule} from '@angular/forms';
import {defer} from 'lodash-es';
import {ZITI_NAVIGATOR} from "../../ziti-console.constants";
import {Subscription} from 'rxjs';
import {filter} from 'rxjs/operators';

@Component({
  selector: 'lib-side-navigator',
  templateUrl: './side-navigator.component.html',
  styleUrls: ['./side-navigator.component.scss'],
})
export class SideNavigatorComponent implements OnInit, OnDestroy {

  @Input() version = '';
  currentNetwork: any = {};

  navExpanded = true;
  navHidden = false;
  hideMenuNavBar = false;
  betaFeaturesEnabled = false;

  private routerSubscription?: Subscription;
  private selectedNavItem: any = null;

  constructor(
      private router: Router,
      @Inject(ZITI_NAVIGATOR) public currentNav: any
  ) {}

  ngOnInit() {
    // Set initial selected nav item based on current route
    this.updateSelectedNavItem(this.router.url);

    // Subscribe to router navigation events
    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe((event) => {
      this.updateSelectedNavItem(event.urlAfterRedirects);
    });
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private updateSelectedNavItem(url: string) {
    // Find the matching nav item from all groups
    for (const group of this.currentNav.groups) {
      for (const item of group.menuItems) {
        if (this.isRouteMatch(url, item)) {
          this.selectedNavItem = item;
          return;
        }
      }
    }
    // No match found, clear selection
    this.selectedNavItem = null;
  }

  private isRouteMatch(currentUrl: string, navItem: any): boolean {
    if (!navItem.route) {
      return false;
    }

    // Check if the nav item has a selectedRoutes array
    if (navItem.selectedRoutes && Array.isArray(navItem.selectedRoutes)) {
      return navItem.selectedRoutes.some((route: string) => {
        return this.matchRoute(currentUrl, route);
      });
    }

    // Fallback to checking the main route property
    return this.matchRoute(currentUrl, navItem.route);
  }


  navItemSelected(navItem: any): boolean {
    return this.selectedNavItem === navItem;
  }

  private matchRoute(currentUrl: string, navRoute: string): boolean {
    // Remove query parameters and hash from current URL
    const cleanUrl = currentUrl.split('?')[0].split('#')[0];

    // Remove leading/trailing slashes for consistent comparison
    const normalizedUrl = cleanUrl.replace(/^\/|\/$/g, '');
    const normalizedRoute = navRoute.replace(/^\/|\/$/g, '');

    // Exact match
    if (normalizedUrl === normalizedRoute) {
      return true;
    }

    // Check if current URL starts with the nav route (for child routes like /identities/abcd123)
    // Split by '/' and compare the base segments
    const urlSegments = normalizedUrl.split('/');
    const routeSegments = normalizedRoute.split('/');

    // If the route has fewer segments than the URL, check if the base matches
    if (routeSegments.length <= urlSegments.length) {
      return routeSegments.every((segment, index) => segment === urlSegments[index]);
    }

    return false;
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
