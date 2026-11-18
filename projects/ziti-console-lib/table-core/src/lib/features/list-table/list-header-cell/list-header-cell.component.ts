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
import {CommonModule} from '@angular/common';
import {ListColumn, ListSortDir} from '../list-column';

/** Header cell for {@link ListTableComponent}: label and 3-state sort (asc/desc). */
@Component({
    selector: 'lib-list-header-cell',
    templateUrl: './list-header-cell.component.html',
    styleUrls: ['./list-header-cell.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class ListHeaderCellComponent implements OnDestroy {
    @Input() column!: ListColumn;
    @Input() sortDir: ListSortDir;

    @Output() sortChanged = new EventEmitter<{colId: string; dir: ListSortDir}>();

    /** How long a sort click waits before committing, so a second click (a double-click, which
     *  the table turns into fit-to-content) can cancel it instead of sorting on the way to fitting.
     *  Short enough not to feel laggy, long enough to catch an intentional double-click. */
    private static readonly SORT_CLICK_DELAY = 230;
    private sortTimer?: ReturnType<typeof setTimeout>;

    get enableSorting(): boolean {
        return !!(this.column?.sortable || this.column?.enableSorting);
    }

    /** `@Input()`s for a column's custom `headerCell`, defaulting to the column itself. */
    get headerInputs(): Record<string, unknown> {
        return this.column?.headerInputs ? this.column.headerInputs(this.column) : {column: this.column};
    }

    ngOnDestroy(): void {
        this.clearSortTimer();
    }

    /** The second press of a double-click (detail > 1) cancels a pending sort, so double-clicking a
     *  header fits the column (handled by the table) without also toggling its sort. A lone click
     *  commits the sort once the short double-click window passes. */
    onHeaderClick(event: MouseEvent): void {
        if (!this.enableSorting) {
            return;
        }
        this.clearSortTimer();
        if (event.detail > 1) {
            return;
        }
        this.sortTimer = setTimeout(() => {
            this.sortTimer = undefined;
            this.sort();
        }, ListHeaderCellComponent.SORT_CLICK_DELAY);
    }

    sort(): void {
        if (!this.enableSorting) {
            return;
        }
        const dir: ListSortDir = !this.sortDir || this.sortDir === 'desc' ? 'asc' : 'desc';
        this.sortDir = dir;
        this.column.onSort?.(this.column.key, dir);
        this.sortChanged.emit({colId: this.column.key, dir});
    }

    private clearSortTimer(): void {
        if (this.sortTimer) {
            clearTimeout(this.sortTimer);
            this.sortTimer = undefined;
        }
    }
}
