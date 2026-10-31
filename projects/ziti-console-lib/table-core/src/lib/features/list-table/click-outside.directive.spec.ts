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

import {ElementRef, NgZone} from '@angular/core';
import {ClickOutsideDirective} from './click-outside.directive';

/**
 * Unit tests for the local replacement of `ng-click-outside`. The directive drives the table's
 * toolbar popovers (filter pills, column chooser, action menus), so the inside/outside boundary
 * and listener teardown are the behaviors that matter.
 */
describe('ClickOutsideDirective', () => {
    let host: HTMLElement;
    let child: HTMLElement;
    let outside: HTMLElement;
    let zone: NgZone;
    let spy: jasmine.Spy;

    function make(platformId: Object = 'browser'): ClickOutsideDirective {
        const d = new ClickOutsideDirective(new ElementRef(host), zone, platformId);
        d.clickOutside.subscribe(spy);
        return d;
    }

    function click(el: HTMLElement): void {
        el.dispatchEvent(new MouseEvent('click', {bubbles: true}));
    }

    beforeEach(() => {
        zone = new NgZone({enableLongStackTrace: false});
        spy = jasmine.createSpy('clickOutside');
        host = document.createElement('div');
        child = document.createElement('span');
        host.appendChild(child);
        outside = document.createElement('div');
        document.body.appendChild(host);
        document.body.appendChild(outside);
    });

    afterEach(() => {
        host.remove();
        outside.remove();
    });

    it('emits once when a click lands outside the host element', () => {
        const d = make();
        d.ngOnInit();
        click(outside);
        expect(spy).toHaveBeenCalledTimes(1);
        d.ngOnDestroy();
    });

    it('passes the originating event to subscribers', () => {
        const d = make();
        d.ngOnInit();
        click(outside);
        expect(spy.calls.mostRecent().args[0] instanceof Event).toBeTrue();
        d.ngOnDestroy();
    });

    it('does not emit when the click is on the host or a descendant', () => {
        const d = make();
        d.ngOnInit();
        click(host);
        click(child);
        expect(spy).not.toHaveBeenCalled();
        d.ngOnDestroy();
    });

    it('re-enters the Angular zone to emit (so bound handlers run change detection)', () => {
        const d = make();
        d.ngOnInit();
        spyOn(zone, 'run').and.callThrough();
        click(outside);
        expect(zone.run).toHaveBeenCalled();
        d.ngOnDestroy();
    });

    it('stops listening after ngOnDestroy', () => {
        const d = make();
        d.ngOnInit();
        d.ngOnDestroy();
        click(outside);
        expect(spy).not.toHaveBeenCalled();
    });

    it('is a no-op on a non-browser platform (SSR safety)', () => {
        const d = make('server');
        d.ngOnInit();
        click(outside);
        expect(spy).not.toHaveBeenCalled();
        expect(() => d.ngOnDestroy()).not.toThrow();
    });
});
