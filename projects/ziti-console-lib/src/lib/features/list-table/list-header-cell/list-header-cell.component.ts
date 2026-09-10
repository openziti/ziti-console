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

import {Component, EventEmitter, Input, Output} from '@angular/core';
import {ListColumn, ListSortDir} from '../list-column';

/** Header cell for {@link ListTableComponent}: label, 3-state sort (asc/desc), and hide. */
@Component({
    selector: 'lib-list-header-cell',
    templateUrl: './list-header-cell.component.html',
    styleUrls: ['./list-header-cell.component.scss'],
    standalone: false,
})
export class ListHeaderCellComponent {
    @Input() column!: ListColumn;
    @Input() sortDir: ListSortDir;

    @Output() sortChanged = new EventEmitter<{colId: string; dir: ListSortDir}>();
    @Output() hideColumn = new EventEmitter<ListColumn>();

    get enableSorting(): boolean {
        return !!(this.column?.sortable || this.column?.enableSorting);
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

    hide(event: MouseEvent): void {
        event.stopPropagation();
        this.hideColumn.emit(this.column);
    }
}
