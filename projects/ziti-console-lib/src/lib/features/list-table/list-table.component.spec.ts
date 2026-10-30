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
            declarations: [ListTableComponent],
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
});
