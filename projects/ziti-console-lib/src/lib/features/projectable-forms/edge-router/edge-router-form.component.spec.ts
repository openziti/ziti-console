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

import {NO_ERRORS_SCHEMA} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ActivatedRoute, Router} from '@angular/router';
import {Location} from '@angular/common';
import {MatDialog} from '@angular/material/dialog';
import {BehaviorSubject, of, Subject} from 'rxjs';
import {EdgeRouterFormComponent} from './edge-router-form.component';
import {EDGE_ROUTER_EXTENSION_SERVICE, EdgeRouterFormService} from './edge-router-form.service';
import {SETTINGS_SERVICE} from '../../../services/settings.service';
import {ZITI_DATA_SERVICE} from '../../../services/ziti-data.service';
import {GrowlerService} from '../../messaging/growler.service';
import {DEFAULT_APP_CONFIG} from '../../../ziti-console.constants';
import {SHAREDZ_EXTENSION} from '../../extendable/extensions-noop.service';
import {ManagementPermissionsService} from '../../../services/management-permissions.service';

describe('EdgeRouterFormComponent link listener', () => {
    let fixture: ComponentFixture<EdgeRouterFormComponent>;
    let component: EdgeRouterFormComponent;
    let extService: any;

    function setDisabledComponents(keys: string[]) {
        extService.disabledComponents = keys.map((key) => ({key}));
    }

    beforeEach(() => {
        extService = {
            disabledComponents: [],
            formDataChanged: new Subject(),
            updateFormData: jasmine.createSpy('updateFormData'),
            extendAfterViewInits: jasmine.createSpy('extendAfterViewInits'),
        };
        TestBed.configureTestingModule({
            declarations: [EdgeRouterFormComponent],
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                {provide: SETTINGS_SERVICE, useValue: {settingsChange: new BehaviorSubject({}), settings: {}}},
                {provide: ZITI_DATA_SERVICE, useValue: {}},
                {provide: EdgeRouterFormService, useValue: {associatedServices: [], associatedIdentities: []}},
                {provide: EDGE_ROUTER_EXTENSION_SERVICE, useValue: extService},
                {provide: SHAREDZ_EXTENSION, useValue: extService},
                {provide: DEFAULT_APP_CONFIG, useValue: {isOpenZiti: false}},
                {provide: GrowlerService, useValue: {}},
                {provide: Router, useValue: {getCurrentNavigation: () => ({previousNavigation: null}), events: new Subject()}},
                {provide: ActivatedRoute, useValue: {params: of({}), queryParams: of({})}},
                {provide: Location, useValue: {}},
                {provide: MatDialog, useValue: {}},
                {
                    provide: ManagementPermissionsService,
                    useValue: {
                        isSaveDisabled: () => false,
                        canRead: () => true,
                        canDelete: () => true,
                        useStrictReadonlyFormUi: () => false,
                        stateVersion$: new Subject(),
                    },
                },
            ],
        });
        fixture = TestBed.createComponent(EdgeRouterFormComponent);
        component = fixture.componentInstance;
    });

    describe('isLinkListenerActive', () => {
        it('is false when the extension reports no disabled components', () => {
            setDisabledComponents([]);
            expect(component.isLinkListenerActive).toBeFalse();
        });

        it('is true when the extension reports the link-listener-active key', () => {
            setDisabledComponents(['link-listener-active']);
            expect(component.isLinkListenerActive).toBeTrue();
        });

        it('ignores unrelated disabled-component keys', () => {
            setDisabledComponents(['customer-hosted', 'tunneler-disabled']);
            expect(component.isLinkListenerActive).toBeFalse();
        });

        it('is independent of formData.linkListener, which the router no longer drives', () => {
            setDisabledComponents([]);
            component.formData = {linkListener: true};
            expect(component.isLinkListenerActive).toBeFalse();
        });

        it('follows the extension state as it changes', () => {
            setDisabledComponents([]);
            expect(component.isLinkListenerActive).toBeFalse();
            setDisabledComponents(['link-listener-active']);
            expect(component.isLinkListenerActive).toBeTrue();
        });
    });

    describe('link listener row', () => {
        function render(keys: string[]) {
            setDisabledComponents(keys);
            component.formView = 'simple';
            component.showMore = true;
            component.formData = {id: 'er1', name: 'router'};
            fixture.detectChanges();
            const host: HTMLElement = fixture.nativeElement;
            return {
                row: host.querySelector('.link-listener-row') as HTMLElement | null,
                toggle: host.querySelector('.link-listener-row .toggle') as HTMLElement | null,
                on: host.querySelector('.link-listener-row .on-label') as HTMLElement | null,
                off: host.querySelector('.link-listener-row .off-label') as HTMLElement | null,
                label: host.querySelector('.link-listener-row .config-container-label') as HTMLElement | null,
            };
        }

        it('is not rendered unless the router is customer-hosted', () => {
            expect(render([]).row).toBeNull();
        });

        describe('when customer-hosted', () => {
            it('shows the labelled row with the read-only tooltip', () => {
                const {row, label} = render(['customer-hosted']);
                expect(row).not.toBeNull();
                expect(label?.textContent?.trim()).toBe('LINK LISTENER ENABLED');
                expect(row?.getAttribute('matTooltip')).toBe("This value is reported by the router and can't be changed here.");
            });

            it('shows NO and an unchecked, disabled switch when the listener is not active', () => {
                const {toggle, on, off} = render(['customer-hosted']);
                expect(toggle?.classList).not.toContain('on');
                expect(toggle?.classList).toContain('disabled');
                expect(toggle?.getAttribute('role')).toBe('switch');
                expect(toggle?.getAttribute('aria-disabled')).toBe('true');
                expect(toggle?.getAttribute('aria-checked')).toBe('false');
                expect(on?.hidden).toBeTrue();
                expect(off?.hidden).toBeFalse();
            });

            it('shows YES and a checked, disabled switch when the listener is active', () => {
                const {toggle, on, off} = render(['customer-hosted', 'link-listener-active']);
                expect(toggle?.classList).toContain('on');
                expect(toggle?.classList).toContain('disabled');
                expect(toggle?.getAttribute('aria-checked')).toBe('true');
                expect(on?.hidden).toBeFalse();
                expect(off?.hidden).toBeTrue();
            });

            it('does not toggle when clicked', () => {
                const {toggle} = render(['customer-hosted']);
                toggle?.click();
                fixture.detectChanges();
                expect(toggle?.classList).not.toContain('on');
                expect(component.formData.linkListener).toBeUndefined();
            });
        });
    });
});
