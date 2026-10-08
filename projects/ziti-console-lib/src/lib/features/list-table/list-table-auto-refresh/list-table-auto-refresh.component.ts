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

import {Component, EventEmitter, Input, OnDestroy, Output} from '@angular/core';

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
    private timer?: ReturnType<typeof setInterval>;

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
        this.open = !this.open;
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
