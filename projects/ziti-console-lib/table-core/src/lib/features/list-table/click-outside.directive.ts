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

import {Directive, ElementRef, EventEmitter, Inject, NgZone, OnDestroy, OnInit, Output, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

/**
 * Emits `clickOutside` when a click lands outside the host element. A local,
 * dependency-free standalone replacement for `ng-click-outside`, so the table and
 * its cells can be consumed from the package without pulling an undeclared dependency.
 *
 * The document listener runs outside Angular to avoid a change-detection pass on every
 * click anywhere on the page; the emit re-enters the zone so bound handlers run normally.
 */
@Directive({
    selector: '[clickOutside]',
    standalone: true,
})
export class ClickOutsideDirective implements OnInit, OnDestroy {
    @Output() clickOutside = new EventEmitter<Event>();

    constructor(
        private el: ElementRef,
        private ngZone: NgZone,
        @Inject(PLATFORM_ID) private platformId: Object
    ) {
        this.onDocumentClick = this.onDocumentClick.bind(this);
    }

    ngOnInit(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.ngZone.runOutsideAngular(() => {
            document.addEventListener('click', this.onDocumentClick);
        });
    }

    ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }
        this.ngZone.runOutsideAngular(() => {
            document.removeEventListener('click', this.onDocumentClick);
        });
    }

    private onDocumentClick(event: Event): void {
        if (!this.el.nativeElement.contains(event.target)) {
            this.ngZone.run(() => this.clickOutside.emit(event));
        }
    }
}
