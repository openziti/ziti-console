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

import {ListHeaderCellComponent} from './list-header-cell.component';
import {ListColumn} from '../list-column';

class LegendComponent {}

describe('ListHeaderCellComponent', () => {
    let component: ListHeaderCellComponent;

    beforeEach(() => {
        component = new ListHeaderCellComponent();
    });

    it('defaults headerInputs to the column itself', () => {
        const column: ListColumn = {key: 'status', label: 'Status'};
        component.column = column;
        expect(component.headerInputs).toEqual({column});
    });

    it('uses the column headerInputs mapper when present', () => {
        const column: ListColumn = {
            key: 'status',
            label: 'Status',
            headerCell: LegendComponent as any,
            headerInputs: (col) => ({label: col.label, states: ['up', 'down']}),
        };
        component.column = column;
        expect(component.headerInputs).toEqual({label: 'Status', states: ['up', 'down']});
    });

    it('reports enableSorting from either sortable or enableSorting', () => {
        component.column = {key: 'a', label: 'A'};
        expect(component.enableSorting).toBeFalse();
        component.column = {key: 'a', label: 'A', sortable: true};
        expect(component.enableSorting).toBeTrue();
        component.column = {key: 'a', label: 'A', enableSorting: true};
        expect(component.enableSorting).toBeTrue();
    });

    it('cycles the sort direction and emits on sort for a sortable column', () => {
        const emitted: any[] = [];
        component.column = {key: 'name', label: 'Name', sortable: true};
        component.sortChanged.subscribe((e) => emitted.push(e));
        component.sort();
        expect(component.sortDir).toBe('asc');
        component.sort();
        expect(component.sortDir).toBe('desc');
        expect(emitted).toEqual([
            {colId: 'name', dir: 'asc'},
            {colId: 'name', dir: 'desc'},
        ]);
    });

    it('does not sort a non-sortable column', () => {
        const emitted: any[] = [];
        component.column = {key: 'name', label: 'Name'};
        component.sortChanged.subscribe((e) => emitted.push(e));
        component.sort();
        expect(component.sortDir).toBeUndefined();
        expect(emitted).toEqual([]);
    });
});
