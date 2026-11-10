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
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

import {ListTableComponent} from './list-table.component';
import {ListColumn} from './list-column';
import {DataTableFilterService} from '../data-table/data-table-filter.service';

/** Minimal stand-in for DataTableFilterService so the component can init without
 *  pulling in Router/Location/ActivatedRoute. Only the surface the component touches. */
class FilterServiceStub {
    pageSize = 50;
    currentPage = 1;
    filtersChanged = new BehaviorSubject<any[]>([]);
    filtering = new BehaviorSubject<boolean>(false);
    updateFilter = jasmine.createSpy('updateFilter');
    changePage = jasmine.createSpy('changePage');
    changePageSize = jasmine.createSpy('changePageSize');
    clearAllFilters = jasmine.createSpy('clearAllFilters');
}

describe('ListTableComponent', () => {
    let fixture: ComponentFixture<ListTableComponent>;
    let component: ListTableComponent;
    let filterStub: FilterServiceStub;

    const cols = (): ListColumn[] => [
        {key: 'name', label: 'Name'},
        {key: 'os', label: 'OS'},
        {key: 'type', label: 'Type'},
    ];

    beforeEach(() => {
        // the service persists per-table state in localStorage; start each test clean
        try {
            localStorage.clear();
        } catch {
            /* ignore */
        }
        filterStub = new FilterServiceStub();
        TestBed.configureTestingModule({
            imports: [ListTableComponent],
            providers: [{provide: DataTableFilterService, useValue: filterStub}],
            // the template hosts many lib-* children/directives; we never render it
            // (no detectChanges), and this keeps createComponent from choking regardless
            schemas: [NO_ERRORS_SCHEMA],
        });
        fixture = TestBed.createComponent(ListTableComponent);
        component = fixture.componentInstance;
    });

    /** Set inputs then run ngOnInit, without detectChanges (so no DOM/children render). */
    function init(opts: {columns?: ListColumn[]; rowData?: any[]; options?: any; tableId?: string} = {}): void {
        if (opts.tableId !== undefined) {
            component.tableId = opts.tableId;
        }
        if (opts.options !== undefined) {
            component.options = opts.options;
        }
        if (opts.columns !== undefined) {
            component.columns = opts.columns;
        }
        if (opts.rowData !== undefined) {
            component.rowData = opts.rowData;
        }
        component.ngOnInit();
    }

    it('creates', () => {
        expect(component).toBeTruthy();
    });

    describe('loading phases', () => {
        it('shows the skeleton on the first load and not once rows have arrived', () => {
            component.isLoading = true;
            expect(component.isInitialLoad).toBeTrue();
            expect(component.showRefreshBar).toBeFalse();

            component.rowData = [{id: 1, name: 'a'}];
            expect(component.hasLoadedOnce).toBeTrue();
            expect(component.isInitialLoad).toBeFalse();
        });

        it('latches hasLoadedOnce and never flips it back on a later empty result', () => {
            component.rowData = [{id: 1}];
            expect(component.hasLoadedOnce).toBeTrue();
            component.rowData = [];
            expect(component.hasLoadedOnce).toBeTrue();
        });

        it('does not show the skeleton when rows are already present', () => {
            component.rowData = [{id: 1}];
            component.isLoading = true; // a reload, not a first load
            expect(component.isInitialLoad).toBeFalse();
        });
    });

    describe('skeleton show-delay', () => {
        it('never shows the skeleton for a first load shorter than the show-delay', fakeAsync(() => {
            component.isLoading = true;
            tick(80);
            expect(component.showSkeleton).toBeFalse();
            component.rowData = [{id: 1}]; // rows arrive before the delay fires
            component.isLoading = false;
            tick(300);
            expect(component.showSkeleton).toBeFalse();
        }));

        it('shows the skeleton once a first load runs past the show-delay', fakeAsync(() => {
            component.isLoading = true;
            tick(160);
            expect(component.showSkeleton).toBeTrue();
        }));

        it('hides the skeleton the moment rows arrive, with no minimum hold', fakeAsync(() => {
            component.isLoading = true;
            tick(160);
            expect(component.showSkeleton).toBeTrue();
            component.rowData = [{id: 1}];
            expect(component.showSkeleton).toBeFalse();
        }));
    });

    describe('refresh bar debounce', () => {
        beforeEach(() => {
            // simulate "rows already loaded" so loads count as refreshes, not first load
            component.rowData = [{id: 1}];
        });

        it('never shows for a reload shorter than the show-delay', fakeAsync(() => {
            component.isLoading = true;
            tick(80);
            component.isLoading = false;
            tick(400);
            expect(component.showRefreshBar).toBeFalse();
        }));

        it('shows after the show-delay for a longer reload', fakeAsync(() => {
            component.isLoading = true;
            tick(149);
            expect(component.showRefreshBar).toBeFalse();
            tick(1);
            expect(component.showRefreshBar).toBeTrue();
            // clear the pending state so fakeAsync has no dangling timers
            component.isLoading = false;
            tick(500);
            expect(component.showRefreshBar).toBeFalse();
        }));

        it('holds the bar for the minimum visible time so it does not blink', fakeAsync(() => {
            component.isLoading = true;
            tick(150); // bar shows now
            expect(component.showRefreshBar).toBeTrue();
            component.isLoading = false; // ended almost immediately after showing
            tick(449);
            expect(component.showRefreshBar).toBeTrue(); // still held
            tick(1);
            expect(component.showRefreshBar).toBeFalse();
        }));

        it('coalesces back-to-back reloads without hiding between them', fakeAsync(() => {
            component.isLoading = true;
            tick(150);
            expect(component.showRefreshBar).toBeTrue();
            component.isLoading = false; // schedules the hide
            tick(100);
            component.isLoading = true; // new reload cancels the hide
            tick(1000);
            expect(component.showRefreshBar).toBeTrue();
            component.isLoading = false;
            tick(500);
            expect(component.showRefreshBar).toBeFalse();
        }));

        it('clears pending timers on destroy', fakeAsync(() => {
            component.isLoading = true; // arms the show timer
            component.ngOnDestroy();
            tick(500);
            expect(component.showRefreshBar).toBeFalse();
        }));
    });

    describe('skeleton helpers', () => {
        it('produces at least one skeleton row and honours the count', () => {
            component.skeletonRowCount = 5;
            expect(component.skeletonRows.length).toBe(5);
            component.skeletonRowCount = 0;
            expect(component.skeletonRows.length).toBe(1);
        });

        it('keeps skeleton bar widths within bounds and stable across calls', () => {
            for (let r = 0; r < 10; r++) {
                for (let c = 0; c < 10; c++) {
                    const w = component.skeletonBarWidth(c, r);
                    expect(w).toBeGreaterThanOrEqual(30);
                    expect(w).toBeLessThanOrEqual(92);
                    expect(component.skeletonBarWidth(c, r)).toBe(w); // deterministic
                }
            }
        });
    });

    describe('columns + chooser', () => {
        it('splits declared columns into visible and hidden', () => {
            init({columns: [{key: 'a', label: 'A'}, {key: 'b', label: 'B', hidden: true}]});
            expect(component.visibleColumns.map((c) => c.key)).toEqual(['a']);
            expect(component.hiddenColumns.map((c) => c.key)).toEqual(['b']);
            expect(component.columnsAtDefault).toBeTrue();
        });

        it('hides and shows a column via the chooser and tracks the default state', () => {
            init({columns: cols()});
            const os = component.allColumns.find((c) => c.key === 'os')!;
            component.toggleColumnVisible(os);
            expect(component.visibleColumns.map((c) => c.key)).toEqual(['name', 'type']);
            expect(component.columnsAtDefault).toBeFalse();
            component.toggleColumnVisible(os);
            expect(component.visibleColumns.map((c) => c.key)).toEqual(['name', 'os', 'type']);
            expect(component.columnsAtDefault).toBeTrue();
        });

        it('refuses to hide the last visible column', () => {
            init({columns: [{key: 'only', label: 'Only'}]});
            const only = component.allColumns[0];
            expect(component.isLastVisibleColumn(only)).toBeTrue();
            component.toggleColumnVisible(only);
            expect(component.visibleColumns.length).toBe(1);
        });

        it('counts only user-hidden columns beyond the defaults in the badge', () => {
            init({columns: [{key: 'a', label: 'A'}, {key: 'b', label: 'B'}, {key: 'c', label: 'C', hidden: true}]});
            expect(component.hiddenColumnCount).toBe(0); // c is hidden by default
            component.toggleColumnVisible(component.allColumns.find((col) => col.key === 'a')!);
            expect(component.hiddenColumnCount).toBe(1); // a hidden by the user (b still visible)
        });
    });

    describe('tree mode', () => {
        const tree = () => [
            {id: 'g1', name: 'g1', children: [{id: 's1', name: 's1', leaf: true}]},
            {id: 'g2', name: 'g2', leaf: true},
        ];

        it('renders only roots until a node is expanded', () => {
            init({columns: cols(), options: {tree: true}, rowData: tree()});
            expect(component.isTreeMode).toBeTrue();
            expect(component.flatRows.map((r) => r.id)).toEqual(['g1', 'g2']);
        });

        it('expands and collapses a node, flattening its children in order', () => {
            init({columns: cols(), options: {tree: true}, rowData: tree()});
            const g1 = component.flatRows.find((r) => r.id === 'g1');
            expect(component.canExpand(g1)).toBeTrue();
            component.toggleNode(g1);
            expect(component.flatRows.map((r) => r.id)).toEqual(['g1', 's1', 'g2']);
            component.toggleNode(g1);
            expect(component.flatRows.map((r) => r.id)).toEqual(['g1', 'g2']);
        });

        it('treats a leaf as non-expandable', () => {
            init({columns: cols(), options: {tree: true}, rowData: tree()});
            const g2 = component.flatRows.find((r) => r.id === 'g2');
            expect(component.canExpand(g2)).toBeFalse();
        });
    });

    describe('selection', () => {
        beforeEach(() => init({columns: cols(), rowData: [{id: 1}, {id: 2}, {id: 3}]}));

        it('toggles a single row and reports the selection', () => {
            const selected: any[] = [];
            component.selectionChanged.subscribe((rows) => (selected.length = 0, selected.push(...rows)));
            component.toggleItem(component.rowData[0]);
            expect(component.rowData[0].selected).toBeTrue();
            expect(selected.map((r) => r.id)).toEqual([1]);
            expect(component.someSelected).toBeTrue();
        });

        it('select-all toggles every row and clears again', () => {
            component.toggleAll();
            expect(component.rowData.every((r) => r.selected)).toBeTrue();
            expect(component.allToggled).toBeTrue();
            expect(component.someSelected).toBeFalse(); // all on, not indeterminate
            component.toggleAll();
            expect(component.rowData.some((r) => r.selected)).toBeFalse();
        });
    });

    describe('pagination', () => {
        it('computes total pages from the total count and page size', () => {
            init({columns: cols()});
            filterStub.pageSize = 25; // set after init: ngOnInit restores page size from storage
            component.totalCount = 60;
            expect(component.totalPages).toBe(3);
        });

        it('builds a windowed page list with gap sentinels for long lists', () => {
            init({columns: cols()});
            filterStub.pageSize = 10;
            filterStub.currentPage = 5;
            component.totalCount = 100; // 10 pages
            const w = component.pageWindow;
            expect(w[0]).toBe(1);
            expect(w[w.length - 1]).toBe(10);
            expect(w).toContain(0); // at least one gap sentinel
            expect(w).toContain(5); // current page present
        });

        it('disables prev on the first page and next on the last', () => {
            init({columns: cols()});
            component.startCount = 1;
            component.endCount = 25;
            component.totalCount = 100;
            expect(component.prevDisabled).toBeTrue();
            expect(component.nextDisabled).toBeFalse();

            component.startCount = 76;
            component.endCount = 100;
            expect(component.prevDisabled).toBeFalse();
            expect(component.nextDisabled).toBeTrue();
        });

        it('only changes to a valid, different page', () => {
            init({columns: cols()});
            filterStub.currentPage = 2;
            filterStub.pageSize = 10; // 10 pages
            component.totalCount = 100;
            component.goToPage(2); // same page - ignored
            component.goToPage(0); // out of range - ignored
            expect(filterStub.changePage).not.toHaveBeenCalled();
            component.goToPage(4);
            expect(filterStub.changePage).toHaveBeenCalledWith(4);
        });
    });

    describe('clear filters', () => {
        it('clears the search box and drops every active filter (not the no-op clearFilters)', () => {
            init({columns: cols(), tableId: 'services'});
            component.searchString = 'abc';
            component.clearTableFilters();
            expect(component.searchString).toBe('');
            expect(filterStub.clearAllFilters).toHaveBeenCalled();
        });
    });

    describe('auto-refresh page hook', () => {
        it('defaults to off (0) so pages are unchanged unless they opt in', () => {
            init({columns: cols(), tableId: 'services'});
            expect(component.autoRefreshSeconds).toBe(0);
        });

        it('lets a page set the starting interval', () => {
            component.autoRefreshSeconds = 30;
            init({columns: cols(), tableId: 'services'});
            expect(component.autoRefreshSeconds).toBe(30);
        });
    });

    describe('row hover', () => {
        it('emits the row on hover and null on leave, and does not re-emit the same row', () => {
            init({columns: cols(), rowData: [{name: 'a'}, {name: 'b'}]});
            const seen: any[] = [];
            component.rowHover.subscribe((v) => seen.push(v));
            const row = component.rowData[0];

            component.onRowHover(row);
            component.onRowHover(row); // same row -> no second emit
            component.onRowLeave(row);

            expect(seen).toEqual([row, null]);
        });
    });

    describe('sort', () => {
        it('sets the sort direction on the target column and clears the others', () => {
            init({columns: cols()});
            component.onHeaderSort({colId: 'name', dir: 'asc'});
            expect(component.allColumns.find((c) => c.key === 'name')!.sortDir).toBe('asc');
            expect(component.allColumns.find((c) => c.key === 'os')!.sortDir).toBeUndefined();

            component.onHeaderSort({colId: 'os', dir: 'desc'});
            expect(component.allColumns.find((c) => c.key === 'name')!.sortDir).toBeUndefined();
            expect(component.allColumns.find((c) => c.key === 'os')!.sortDir).toBe('desc');
        });
    });

    describe('detail panels', () => {
        class AppsPanel {}
        class ConnPanel {}
        const twoPanels = () => ({
            detailPanels: [
                {key: 'apps', component: AppsPanel as any},
                {key: 'connections', component: ConnPanel as any},
            ],
        });

        it('toggles each panel independently, several open on one row at once', () => {
            init({columns: cols(), options: twoPanels(), rowData: [{id: 1}, {id: 2}]});
            const row = component.rowData[0];
            expect(component.isDetailOpen(row, 'apps')).toBeFalse();

            component.toggleDetail(row, 'apps');
            component.toggleDetail(row, 'connections');
            expect(component.isDetailOpen(row, 'apps')).toBeTrue();
            expect(component.isDetailOpen(row, 'connections')).toBeTrue();

            component.toggleDetail(row, 'apps');
            expect(component.isDetailOpen(row, 'apps')).toBeFalse();
            expect(component.isDetailOpen(row, 'connections')).toBeTrue(); // the other stays open
        });

        it('scopes open panels to their own row', () => {
            init({columns: cols(), options: twoPanels(), rowData: [{id: 1}, {id: 2}]});
            component.toggleDetail(component.rowData[0], 'apps');
            expect(component.isDetailOpen(component.rowData[1], 'apps')).toBeFalse();
        });

        it('emits detailToggled on open and on close', () => {
            init({columns: cols(), options: twoPanels(), rowData: [{id: 1}]});
            const events: any[] = [];
            component.detailToggled.subscribe((e) => events.push(e));
            const row = component.rowData[0];
            component.toggleDetail(row, 'apps');
            component.toggleDetail(row, 'apps');
            expect(events).toEqual([
                {row, key: 'apps', open: true},
                {row, key: 'apps', open: false},
            ]);
        });

        it('keeps a panel open across a rowData refresh (new row object, same id)', () => {
            init({columns: cols(), options: twoPanels(), rowData: [{id: 1}]});
            component.toggleDetail(component.rowData[0], 'apps');
            // a background refresh replaces the row object with a fresh one of the same id
            component.rowData = [{id: 1}];
            expect(component.isDetailOpen(component.rowData[0], 'apps')).toBeTrue();
            expect(component.hasOpenDetails(component.rowData[0])).toBeTrue();
        });

        it('opens a panel on a nested row, keyed by its branch-unique tree key', () => {
            const data = [{id: 'g1', name: 'g1', children: [{id: 's1', name: 's1', leaf: true}]}];
            init({columns: cols(), options: {tree: true, ...twoPanels()}, rowData: data});
            const g1 = component.flatRows.find((r) => r.id === 'g1');
            component.toggleNode(g1);
            const s1 = component.flatRows.find((r) => r.id === 's1');
            expect(s1.__treeRowKey).toBeTruthy();
            component.toggleDetail(s1, 'apps');
            expect(component.isDetailOpen(s1, 'apps')).toBeTrue();
            expect(component.hasOpenDetails(s1)).toBeTrue();
        });

        it('treats an unavailable panel as not open', () => {
            const opts = {detailPanels: [{key: 'apps', component: AppsPanel as any, available: (r: any) => r.id !== 1}]};
            init({columns: cols(), options: opts, rowData: [{id: 1}, {id: 2}]});
            component.toggleDetail(component.rowData[0], 'apps'); // id 1 -> unavailable
            expect(component.hasOpenDetails(component.rowData[0])).toBeFalse();
            component.toggleDetail(component.rowData[1], 'apps'); // id 2 -> available
            expect(component.hasOpenDetails(component.rowData[1])).toBeTrue();
        });

        it('builds panel inputs from the parent row context', () => {
            const opts = {detailPanels: [{key: 'apps', component: AppsPanel as any, inputs: (ctx: any) => ({parentId: ctx.row.id})}]};
            init({columns: cols(), options: opts, rowData: [{id: 7}]});
            expect(component.detailInputs(opts.detailPanels[0] as any, component.rowData[0], 0)).toEqual({parentId: 7});
        });
    });

    describe('controlled selection', () => {
        it('derives row.selected and select-all from the selection input (row objects)', () => {
            init({columns: cols(), rowData: [{id: 1}, {id: 2}, {id: 3}]});
            component.selection = [{id: 1}, {id: 2}, {id: 3}];
            expect(component.rowData.every((r) => r.selected)).toBeTrue();
            expect(component.allToggled).toBeTrue();
        });

        it('accepts bare ids and leaves select-all off when only some are selected', () => {
            init({columns: cols(), rowData: [{id: 1}, {id: 2}]});
            component.selection = [1];
            expect(component.rowData[0].selected).toBeTrue();
            expect(component.rowData[1].selected).toBeFalse();
            expect(component.allToggled).toBeFalse();
            expect(component.someSelected).toBeTrue();
        });

        it('lets a host clear the selection and reset select-all', () => {
            init({columns: cols(), rowData: [{id: 1}, {id: 2}]});
            component.selection = [1, 2];
            expect(component.allToggled).toBeTrue();
            component.selection = []; // a page "Clear" button
            expect(component.rowData.some((r) => r.selected)).toBeFalse();
            expect(component.allToggled).toBeFalse();
        });

        it('re-stamps the selection across a rowData refresh', () => {
            init({columns: cols(), rowData: [{id: 1}, {id: 2}]});
            component.selection = [1];
            component.rowData = [{id: 1}, {id: 2}]; // refreshed objects, same ids
            expect(component.rowData[0].selected).toBeTrue();
            expect(component.rowData[1].selected).toBeFalse();
        });

        it('stays uncontrolled (table-owned) when selection is never set', () => {
            init({columns: cols(), rowData: [{id: 1}, {id: 2}]});
            component.toggleAll();
            expect(component.allToggled).toBeTrue();
            expect(component.rowData.every((r) => r.selected)).toBeTrue();
        });
    });
});
