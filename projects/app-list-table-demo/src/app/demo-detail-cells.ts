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

import {Component, Input} from '@angular/core';
import {CommonModule} from '@angular/common';

/** In-cell control that toggles a row's two named detail panels. */
@Component({
    selector: 'demo-toggle-cell',
    standalone: true,
    imports: [CommonModule],
    template: `
        <span class="demo-toggle-row">
            <button type="button" class="demo-chip" [class.on]="appsOpen" (click)="toggleApps()">
                Apps {{ appsOpen ? '▾' : '▸' }}
            </button>
            <button type="button" class="demo-chip" [class.on]="connOpen" (click)="toggleConn()">
                Connections {{ connOpen ? '▾' : '▸' }}
            </button>
        </span>
    `,
    styles: [`
        .demo-toggle-row { display: inline-flex; gap: 0.4rem; }
        .demo-chip {
            font: inherit; cursor: pointer; padding: 0.15rem 0.5rem; border-radius: 0.35rem;
            border: 1px solid var(--lt-border, #d0d5dd); background: var(--lt-control-bg, #fff);
            color: var(--lt-cell-text, #1d2939);
        }
        .demo-chip.on { border-color: var(--lt-link, #0027ab); color: var(--lt-link, #0027ab); }
    `],
})
export class DemoToggleCellComponent {
    @Input() appsOpen = false;
    @Input() connOpen = false;
    @Input() toggleApps: () => void = () => undefined;
    @Input() toggleConn: () => void = () => undefined;
}

/** A host-rendered detail block shown full width under its row. */
@Component({
    selector: 'demo-detail-panel',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="demo-detail">
            <strong>{{ title }}</strong> <span class="demo-detail-parent">for {{ parentId }}</span>
            <ul>
                @for (item of items; track item) {
                    <li>{{ item }}</li>
                }
            </ul>
        </div>
    `,
    styles: [`
        .demo-detail {
            padding: 0.75rem 1.25rem; background: var(--lt-row-alt-bg, #f8fafc);
            border-left: 3px solid var(--lt-link, #0027ab);
        }
        .demo-detail-parent { color: var(--lt-icon, #667085); }
        .demo-detail ul { margin: 0.4rem 0 0; padding-left: 1.1rem; }
    `],
})
export class DemoDetailPanelComponent {
    @Input() title = '';
    @Input() parentId = '';
    @Input() items: string[] = [];
}

/** Custom header content: a label with an inline status legend. */
@Component({
    selector: 'demo-legend-header',
    standalone: true,
    imports: [CommonModule],
    template: `
        <span class="demo-legend">
            {{ label }}
            <span class="demo-legend-key"><i class="dot up"></i>Online</span>
            <span class="demo-legend-key"><i class="dot down"></i>Offline</span>
        </span>
    `,
    styles: [`
        .demo-legend { display: inline-flex; align-items: center; gap: 0.5rem; }
        .demo-legend-key { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.72rem; color: var(--lt-icon, #667085); }
        .dot { width: 0.5rem; height: 0.5rem; border-radius: 50%; display: inline-block; }
        .dot.up { background: #12b76a; }
        .dot.down { background: #d0d5dd; }
    `],
})
export class DemoLegendHeaderComponent {
    @Input() label = '';
}
