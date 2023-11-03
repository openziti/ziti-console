import {Component, Inject, InjectionToken, Input} from '@angular/core';
import {NavigationEnd, Router} from "@angular/router";
import {ZITI_NAVIGATOR} from "../../../ziti-console.constants";

@Component({
    selector: 'lib-side-navbar',
    templateUrl: './side-navbar.component.html',
    styleUrls: ['./side-navbar.component.scss']
})
export class SideNavbarComponent {
    @Input() version = '';
    open = true;
    isOpened = false;
    url = '';

    constructor(
        private router: Router,
        @Inject(ZITI_NAVIGATOR) public currentNav: any
    ) {
    }

    ngOnInit(): void {
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.url = event.url.split('?')[0];
            }
        });
    }

    toggleList(event: any) {
        event.stopPropagation();
        this.isOpened = !this.isOpened;
    }
}

