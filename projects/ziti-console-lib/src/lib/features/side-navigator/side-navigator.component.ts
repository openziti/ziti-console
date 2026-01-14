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
  standalone: false
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
    let bestMatch: any = null;
    let bestMatchScore = -1;

    for (const group of this.currentNav.groups) {
      for (const item of group.menuItems) {
        const matchScore = this.getRouteMatchScore(url, item);
        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestMatch = item;
        }
      }
    }

    this.selectedNavItem = bestMatch;
  }

  private getRouteMatchScore(currentUrl: string, navItem: any): number {
    if (!navItem.route) {
      return -1;
    }

    let highestScore = -1;

    if (navItem.selectedRoutes && Array.isArray(navItem.selectedRoutes)) {
      for (const route of navItem.selectedRoutes) {
        const score = this.calculateMatchScore(currentUrl, route);
        if (score > highestScore) {
          highestScore = score;
        }
      }
    } else {
      highestScore = this.calculateMatchScore(currentUrl, navItem.route);
    }

    return highestScore;
  }

  private calculateMatchScore(currentUrl: string, navRoute: string): number {
    const cleanUrl = currentUrl.split('?')[0].split('#')[0];

    const normalizedUrl = cleanUrl.replace(/^\/|\/$/g, '');
    const normalizedRoute = navRoute.replace(/^\/|\/$/g, '');

    const urlSegments = normalizedUrl.split('/');
    const routeSegments = normalizedRoute.split('/');

    if (routeSegments.length > urlSegments.length) {
      return -1;
    }

    const allSegmentsMatch = routeSegments.every((segment, index) => segment === urlSegments[index]);

    if (!allSegmentsMatch) {
      return -1; // No match
    }

    return routeSegments.length;
  }


  navItemSelected(navItem: any): boolean {
    return this.selectedNavItem === navItem;
  }

  isNavItemDisabled(navItem: any) {

  }

  doNavAction(event, navItem: any) {
    const isCommandOrCtrl = event.metaKey || event.ctrlKey;

    if (isCommandOrCtrl) {
      // No-Op allow the native browser behavior (ie. open in new window)
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
