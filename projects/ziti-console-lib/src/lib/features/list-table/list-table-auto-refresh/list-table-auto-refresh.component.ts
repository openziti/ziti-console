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

import {Component, ElementRef, EventEmitter, Input, OnDestroy, Output, ViewChild} from '@angular/core';

export interface RefreshInterval {
    label: string;
    seconds: number;
}

/** Auto-refresh control: a pill + interval menu. Owns the timer and emits `refresh` each tick. */
@Component({
    selector: 'lib-list-table-auto-refresh',
    templateUrl: './list-table-auto-refresh.component.html',
    styleUrls: ['./list-table-auto-refresh.component.scss'],
    standalone: false,
})
export class ListTableAutoRefreshComponent implements OnDestroy {
    /** Current interval in seconds; 0 means off. */
    @Input() set seconds(value: number) {
        this._seconds = value || 0;
        this.restartTimer();
    }
    get seconds(): number {
        return this._seconds;
    }
    private _seconds = 0;

    /** Skip a tick while a refresh is already in flight. */
    @Input() loading = false;

    @Input() intervals: RefreshInterval[] = [
        {label: '15s', seconds: 15},
        {label: '30s', seconds: 30},
        {label: '1m', seconds: 60},
        {label: '5m', seconds: 300},
    ];

    @Output() refresh = new EventEmitter<void>();
    @Output() secondsChange = new EventEmitter<number>();

    open = false;
    /** Menu geometry, all measured when the menu opens: left offset so labels line up
     *  under the button's value, width so the right edge lands on the button's right
     *  edge, and right padding so the check centers under the chevron. */
    menuLeft = 0;
    menuWidth = 0;
    menuPadRight = 0;
    private timer?: ReturnType<typeof setInterval>;

    @ViewChild('arEl') arEl?: ElementRef<HTMLElement>;
    @ViewChild('valueEl') valueEl?: ElementRef<HTMLElement>;
    @ViewChild('chevronEl') chevronEl?: ElementRef<HTMLElement>;

    get enabled(): boolean {
        return this._seconds > 0;
    }

    get valueLabel(): string {
        if (!this.enabled) {
            return 'Off';
        }
        const match = this.intervals.find((i) => i.seconds === this._seconds);
        return match ? match.label : `${this._seconds}s`;
    }

    toggleMenu(event: MouseEvent): void {
        event.stopPropagation();
        if (this.open) {
            this.open = false;
            return;
        }
        this.alignMenuToValue();
        this.open = true;
    }

    /** Position + size the menu so its labels sit directly under the button's value,
     *  its right edge lands on the button's right edge (one shared border), and the
     *  right-aligned check centers under the chevron. */
    private alignMenuToValue(): void {
        const el = this.arEl?.nativeElement;
        const btn = el?.querySelector('.lt-ar-btn') as HTMLElement | null;
        const value = this.valueEl?.nativeElement?.getBoundingClientRect();
        const chevron = this.chevronEl?.nativeElement?.getBoundingClientRect();
        const container = el?.getBoundingClientRect();
        if (!btn || !value || !chevron || !container) {
            return;
        }
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        // left padding we back out of the value position so labels sit under it
        const itemPadLeft = 0.875 * rem;
        // half the check's box, so we can land its center rather than its edge
        const tickHalf = 0.375 * rem;
        const borderWidth = parseFloat(getComputedStyle(btn).borderRightWidth) || 1;
        this.menuLeft = Math.max(0, value.left - container.left - itemPadLeft);
        this.menuWidth = container.width - this.menuLeft;
        // the check is right-aligned, so its right padding is the gap from the menu's
        // right edge to the chevron center, less the border and half the check box
        const chevronCenter = (chevron.left + chevron.right) / 2;
        this.menuPadRight = Math.max(0, container.right - chevronCenter - borderWidth - tickHalf);
    }

    closeMenu(): void {
        this.open = false;
    }

    isSelected(seconds: number): boolean {
        return this._seconds === seconds;
    }

    select(seconds: number): void {
        this.open = false;
        if (seconds === this._seconds) {
            return;
        }
        this._seconds = seconds;
        this.secondsChange.emit(seconds);
        this.restartTimer();
    }

    private restartTimer(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }
        if (this._seconds > 0) {
            this.timer = setInterval(() => {
                if (!this.loading) {
                    this.refresh.emit();
                }
            }, this._seconds * 1000);
        }
    }

    ngOnDestroy(): void {
        if (this.timer) {
            clearInterval(this.timer);
        }
    }
}
