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

import {ComponentFixture, TestBed, fakeAsync, tick} from '@angular/core/testing';
import {RouterTestingModule} from '@angular/router/testing';
import {provideNoopAnimations} from '@angular/platform-browser/animations';

import {ListColumn} from './list-column';
import {ListTableComponent} from './list-table.component';

/**
 * Behavior coverage for the standalone table. Exercises the controller surface a host relies on -
 * sort state, selection (including nested rows), row-hover, and tree expand / lazy-load - rather
 * than the DOM, so the tests stay meaningful without coupling to template markup.
 */
describe('ListTableComponent', () => {
    let fixture: ComponentFixture<ListTableComponent>;
    let component: ListTableComponent;

    const columns: ListColumn[] = [
        {key: 'name', label: 'Name', sortable: true},
        {key: 'type', label: 'Type'},
    ];

    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [ListTableComponent, RouterTestingModule.withRoutes([])],
            providers: [provideNoopAnimations()],
        }).compileComponents();

        fixture = TestBed.createComponent(ListTableComponent);
        component = fixture.componentInstance;
        component.tableId = 'spec';
        component.columns = columns;
        component.rowData = [
            {name: 'alpha', type: 'Service'},
            {name: 'beta', type: 'Router'},
        ];
        fixture.detectChanges();
    });

    afterEach(() => localStorage.clear());

    it('creates and builds its visible columns from the inputs', () => {
        expect(component).toBeTruthy();
        expect(component.visibleColumns.map((c) => c.key)).toEqual(['name', 'type']);
    });

    describe('row hover', () => {
        it('emits the row on hover and null on leave, and does not re-emit the same row', () => {
            const seen: any[] = [];
            component.rowHover.subscribe((v) => seen.push(v));
            const row = component.rowData[0];

            component.onRowHover(row);
            component.onRowHover(row); // same row -> no second emit
            component.onRowLeave(row);

            expect(seen).toEqual([row, null]);
        });
    });

    describe('selection', () => {
        it('toggleItem flips the row and emits selectionChanged + the action', () => {
            const selections: any[][] = [];
            const actions: any[] = [];
            component.selectionChanged.subscribe((s) => selections.push(s));
            component.actionRequested.subscribe((a) => actions.push(a));
            const row = component.rowData[0];

            component.toggleItem(row);
            expect(row.selected).toBeTrue();
            expect(actions.pop()).toEqual({action: 'toggleItem', item: row});
            expect(selections.pop()).toEqual([row]);

            component.toggleItem(row);
            expect(row.selected).toBeFalse();
            expect(selections.pop()).toEqual([]);
        });

        it('toggleAll selects every top-level row and reports them', () => {
            const selections: any[][] = [];
            component.selectionChanged.subscribe((s) => selections.push(s));

            component.toggleAll();

            expect(component.rowData.every((r) => r.selected)).toBeTrue();
            expect(selections.pop()!.length).toBe(2);
        });

        it('reports selected nested rows even while their parent is collapsed', () => {
            component.options = {tree: true, selectChildren: true};
            component.rowData = [
                {name: 'group', children: [{name: 'c1'}, {name: 'c2'}]},
            ];
            fixture.detectChanges();

            const selections: any[][] = [];
            component.selectionChanged.subscribe((s) => selections.push(s));

            // select a child directly in the data (parent stays collapsed)
            const child = component.rowData[0].children[1];
            component.toggleItem(child);

            expect(selections.pop()).toContain(child);
        });
    });

    describe('sort', () => {
        it('sets the sort direction on the target column and clears the others', () => {
            component.onHeaderSort({colId: 'name', dir: 'asc'});
            expect(component.allColumns.find((c) => c.key === 'name')!.sortDir).toBe('asc');
            expect(component.allColumns.find((c) => c.key === 'type')!.sortDir).toBeUndefined();

            component.onHeaderSort({colId: 'type', dir: 'desc'});
            expect(component.allColumns.find((c) => c.key === 'name')!.sortDir).toBeUndefined();
            expect(component.allColumns.find((c) => c.key === 'type')!.sortDir).toBe('desc');
        });
    });

    describe('tree rows', () => {
        beforeEach(() => {
            component.options = {tree: true};
        });

        it('expands a row with eager children, then collapses it', () => {
            component.rowData = [
                {name: 'group', children: [{name: 'c1'}, {name: 'c2'}]},
            ];
            fixture.detectChanges();

            const events: Array<{row: any; expanded: boolean}> = [];
            component.nodeToggled.subscribe((e) => events.push(e));
            const root = component.flatRows[0];
            const collapsedCount = component.flatRows.length;

            component.toggleNode(root);
            expect(events.pop()).toEqual({row: root, expanded: true});
            expect(component.flatRows.length).toBeGreaterThan(collapsedCount);

            component.toggleNode(root);
            expect(events.pop()!.expanded).toBeFalse();
            expect(component.flatRows.length).toBe(collapsedCount);
        });

        it('lazily loads children on first expand', fakeAsync(() => {
            component.loadChildren = () => Promise.resolve([{name: 'lazy-1'}, {name: 'lazy-2'}]);
            component.rowData = [{name: 'group'}];
            fixture.detectChanges();
            const root = component.flatRows[0];

            component.toggleNode(root);
            expect(root.__treeLoading).toBeTrue();

            tick();
            expect(root.__treeLoading).toBeFalse();
            expect(root.__treeLoaded).toBeTrue();
            expect(root.children.length).toBe(2);
        }));

        it('flags a failed lazy load for retry and leaves the row collapsed', fakeAsync(() => {
            component.loadChildren = () => Promise.reject(new Error('unreachable'));
            component.rowData = [{name: 'group'}];
            fixture.detectChanges();
            const root = component.flatRows[0];

            component.toggleNode(root);
            tick();

            expect(root.__treeLoading).toBeFalse();
            expect(root.__treeLoadError).toBeTrue();
        }));
    });
});
