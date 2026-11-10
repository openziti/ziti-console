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

import {ComponentFixture, TestBed} from '@angular/core/testing';

import {HoverActionsCellComponent, ListActionButton} from './hover-actions-cell.component';

/**
 * The cell renders a row's text and its quick-action icon buttons. The tests pin the markup each
 * button state produces (plain / danger / disabled / busy), the id and aria wiring, the click
 * contract (run the action, stop the row from opening), and how the text line falls back.
 */
describe('HoverActionsCellComponent', () => {
    let fixture: ComponentFixture<HoverActionsCellComponent>;
    let component: HoverActionsCellComponent;
    let host: HTMLElement;

    beforeEach(() => {
        TestBed.configureTestingModule({imports: [HoverActionsCellComponent]});
        fixture = TestBed.createComponent(HoverActionsCellComponent);
        component = fixture.componentInstance;
        host = fixture.nativeElement as HTMLElement;
    });

    /** Sets inputs and renders. `buttons` default to one plain Edit button. */
    function render(inputs: Partial<HoverActionsCellComponent> = {}): void {
        Object.assign(component, inputs);
        fixture.detectChanges();
    }

    const button = (over: Partial<ListActionButton> = {}): ListActionButton => ({action: 'edit', label: 'Edit', ...over});

    describe('the text line', () => {
        it('shows the text with a title that keeps it whole', () => {
            render({text: 'edge-01', buttons: []});
            const text = host.querySelector('.lt-hover-text') as HTMLElement;
            expect(text.textContent?.trim()).toBe('edge-01');
            expect(text.getAttribute('title')).toBe('edge-01');
        });

        it('shows a muted dash when there is no text and no html', () => {
            render({text: '', buttons: []});
            const text = host.querySelector('.lt-hover-text') as HTMLElement;
            expect(text.classList).toContain('lt-hover-text--muted');
            expect(text.textContent?.trim()).toBe('—');
        });

        it('renders leading status markup before the text, kept out of the ellipsis', () => {
            render({statusHtml: '<span class="circle true"></span>', text: 'er-01', buttons: []});
            const status = host.querySelector('.lt-hover-status') as HTMLElement;
            expect(status).toBeTruthy();
            expect(status.querySelector('.circle.true')).toBeTruthy();
            expect((host.querySelector('.lt-hover-text') as HTMLElement).textContent?.trim()).toBe('er-01');
        });

        it('renders the text as a link with the href when one is given, keeping the text and its title', () => {
            render({href: '/identities/a1', text: 'id-01', buttons: []});
            const link = host.querySelector('a.lt-hover-link') as HTMLAnchorElement;
            expect(link).toBeTruthy();
            expect(link.getAttribute('href')).toBe('/identities/a1');
            expect(link.textContent?.trim()).toBe('id-01');
            expect(link.getAttribute('title')).toBe('id-01');
        });

        it('stops a plain click from following the link, so the cell click navigates in-app instead', () => {
            render({href: '/identities/a1', text: 'id-01', buttons: []});
            const link = host.querySelector('a.lt-hover-link') as HTMLAnchorElement;
            const event = new MouseEvent('click', {bubbles: true, cancelable: true, button: 0});
            link.dispatchEvent(event);
            expect(event.defaultPrevented).toBe(true);
        });

        it('lets a modified click through, so the browser opens the link in a new tab', () => {
            render({href: '/identities/a1', text: 'id-01', buttons: []});
            const link = host.querySelector('a.lt-hover-link') as HTMLAnchorElement;
            const event = new MouseEvent('click', {bubbles: true, cancelable: true, button: 0, metaKey: true});
            spyOn(event, 'stopPropagation');
            link.dispatchEvent(event);
            expect(event.defaultPrevented).toBe(false);
            expect(event.stopPropagation).toHaveBeenCalled();
        });

        it('renders html in place of the text, and a second subtext line', () => {
            render({html: '<b class="flag">LIVE</b>', subtext: 'det-1', buttons: []});
            expect(host.querySelector('.lt-hover-html .flag')?.textContent).toBe('LIVE');
            const sub = host.querySelector('.lt-hover-sub') as HTMLElement;
            expect(sub.textContent?.trim()).toBe('det-1');
            expect(sub.getAttribute('title')).toBe('det-1');
        });
    });

    describe('the buttons', () => {
        it('draws a button per spec, with the default id, the label as title, and the aria label', () => {
            render({cellId: 'EdgeActions', buttons: [button({ariaLabel: 'Edit edge-01'})]});
            const btn = host.querySelector('.lt-hover-action') as HTMLButtonElement;
            expect(btn.id).toBe('EdgeActions_edit');
            expect(btn.getAttribute('title')).toBe('Edit');
            expect(btn.getAttribute('aria-label')).toBe('Edit edge-01');
            expect(btn.disabled).toBe(false);
        });

        it('prefers an explicit button id over the cell-id default', () => {
            render({cellId: 'EdgeActions', buttons: [button({id: 'CustomEditId'})]});
            expect((host.querySelector('.lt-hover-action') as HTMLButtonElement).id).toBe('CustomEditId');
        });

        it('falls back to the label for the aria label when none is given', () => {
            render({buttons: [button()]});
            expect((host.querySelector('.lt-hover-action') as HTMLButtonElement).getAttribute('aria-label')).toBe('Edit');
        });

        it('marks a danger button so it can turn red on hover', () => {
            render({buttons: [button({action: 'delete', label: 'Delete', danger: true})]});
            expect((host.querySelector('.lt-hover-action') as HTMLButtonElement).classList).toContain('lt-hover-action--danger');
        });

        it('renders an icon-font class on the glyph span', () => {
            render({buttons: [button({icon: 'icon-refresh'})]});
            expect(host.querySelector('.lt-hover-icon')?.classList).toContain('icon-refresh');
        });

        it('injects inline SVG markup for a glyph not in the icon font', () => {
            render({buttons: [button({iconSvg: '<svg class="pen"></svg>'})]});
            expect(host.querySelector('.lt-hover-icon .pen')).toBeTruthy();
        });

        it('shows a spinner and disables the button while the action is busy', () => {
            render({buttons: [button({busy: () => true, busyTitle: 'Reissuing...'})]});
            const btn = host.querySelector('.lt-hover-action') as HTMLButtonElement;
            expect(host.querySelector('.lt-hover-spinner')).toBeTruthy();
            expect(btn.disabled).toBe(true);
            expect(btn.getAttribute('title')).toBe('Reissuing...');
        });

        it('disables a button whose action cannot run yet, and titles it with the reason', () => {
            render({buttons: [button({disabled: () => true, disabledTitle: 'Already enrolled'})]});
            const btn = host.querySelector('.lt-hover-action') as HTMLButtonElement;
            expect(btn.disabled).toBe(true);
            expect(btn.getAttribute('title')).toBe('Already enrolled');
        });

        it('draws no actions wrapper when the row has no buttons', () => {
            render({text: 'edge-01', buttons: []});
            expect(host.querySelector('.lt-hover-actions')).toBeNull();
        });
    });

    describe('clicking a button', () => {
        it('runs the action and stops the click from opening the row', () => {
            const run = jasmine.createSpy('run');
            render({buttons: [button()], run});
            const btn = host.querySelector('.lt-hover-action') as HTMLButtonElement;
            const event = new MouseEvent('click', {bubbles: true, cancelable: true});
            spyOn(event, 'stopPropagation');
            btn.dispatchEvent(event);
            expect(run).toHaveBeenCalledWith('edit');
            expect(event.stopPropagation).toHaveBeenCalled();
        });
    });

    describe('reserve', () => {
        it('puts the reserve class on the host so the icons keep their slot', () => {
            render({reserve: true, buttons: [button()]});
            expect(host.classList).toContain('lt-hover--reserve');
        });
    });

    describe('safe()', () => {
        it('returns null for empty markup and memoizes the same string to one SafeHtml', () => {
            expect(component.safe('')).toBeNull();
            const once = component.safe('<i></i>');
            expect(component.safe('<i></i>')).toBe(once);
        });
    });
});
