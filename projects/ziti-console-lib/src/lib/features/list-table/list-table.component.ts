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

import {
    AfterViewChecked,
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    NgZone,
    OnDestroy,
    OnInit,
    Output,
    Type,
    ViewChild,
} from '@angular/core';
import _ from 'lodash';
import {Subscription} from 'rxjs';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

import {DataTableFilterService, FilterObj} from '../data-table/data-table-filter.service';
import {ListColumn, ListCellContext, ListLegacyCellShim, ListSortDir} from './list-column';
import {ListTableService} from './list-table.service';
import {ListMenuItem} from './list-menu/list-menu.component';

/**
 * Custom, token-skinnable list table. Columns are declared with {@link ListColumn};
 * sort, filter, and pagination flow through {@link DataTableFilterService}.
 */
@Component({
    selector: 'lib-list-table',
    templateUrl: './list-table.component.html',
    styleUrls: ['./list-table.component.scss'],
    standalone: false,
    providers: [ListTableService],
})
export class ListTableComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
    @Input() set tableId(id: string) {
        this._tableId = id;
        this.svc.tableId = id;
    }
    get tableId(): string {
        return this._tableId;
    }
    private _tableId = '';

    @Input() set columns(value: ListColumn[]) {
        this._rawColumns = value || [];
        if (this._initialized) {
            this.buildColumns();
        }
    }

    @Input() rowData: any[] = [];
    @Input() isLoading = false;
    @Input() options: {noSelect?: boolean; noMenu?: boolean; pager?: 'pages' | 'cursor'} = {noSelect: false, noMenu: false};
    @Input() hasNext = false;
    @Input() hasPrev = false;
    @Input() startCount: any = '-';
    @Input() endCount: any = '-';
    @Input() totalCount: any = '-';
    @Input() filterApplied = false;
    @Input() menuItems: any[] = [];
    @Input() headerActions: any[] = [];
    @Input() noItemsImage = 'nodata';
    @Input() showNoItemsAdd = true;
    @Input() noItemsReadonly = false;
    @Input() accessDenied = false;
    @Input() entityTypeName = '';
    @Input() filterName = 'name';
    @Input() filterColumn = 'name';

    @Output() actionRequested = new EventEmitter<{action: string; item?: any}>();
    @Output() tableReady = new EventEmitter<any>();

    @ViewChild('contextMenu') contextMenu?: ElementRef;
    @ViewChild('filterZone') filterZone?: ElementRef<HTMLElement>;
    @ViewChild('filtersRow') filtersRow?: ElementRef<HTMLElement>;

    /** Full column list (includes hidden), after persisted state. */
    allColumns: ListColumn[] = [];
    /** Currently rendered columns (visible + ordered). */
    visibleColumns: ListColumn[] = [];
    /** Hidden columns, shaped for the shared hidden-columns bar (`headerName`). */
    hiddenColumns: any[] = [];

    entityTypeLabel = '';

    // ---- action menus ----
    openMenu = false;
    openHeaderMenu = false;
    menuLeft = 0;
    menuTop = 0;
    selectedItem: any = {actionList: []};

    // ---- selection ----
    allToggled = false;

    // ---- column chooser (skinned show/hide + reorder panel) ----
    showColumnChooser = false;

    // ---- integrated toolbar: search + filter chips + pagination ----
    searchString = '';
    activeFilters: FilterObj[] = [];
    filtering = false;
    private inputChangedDebounced = _.debounce(() => this.applySearch(), 400);

    // ---- responsive filter overflow: controls that don't fit collapse into "More" ----
    visibleFilterColumns: ListColumn[] = [];
    overflowFilterColumns: ListColumn[] = [];
    showFilterOverflow = false;
    private filterWidths = new Map<string, number>();
    private filtersDirty = true;
    private filterRO?: ResizeObserver;
    private observedToolbar?: HTMLElement;
    private overflowRaf = 0;
    private readonly FILTER_GAP = 8; // px, matches the .lt-filter-zone/.lt-filters gap
    private readonly MORE_BTN_W = 92; // px reserved for the "More" trigger when overflowing

    // ---- resize ----
    private resizing?: {col: ListColumn; startX: number; startWidth: number};
    private readonly onPointerMove = (e: PointerEvent) => this.handleResizeMove(e);
    private readonly onPointerUp = () => this.handleResizeEnd();

    private _rawColumns: ListColumn[] = [];
    private _initialColumns: ListColumn[] = [];
    private _initialized = false;
    private subscription = new Subscription();

    constructor(
        public svc: ListTableService,
        private tableFilterService: DataTableFilterService,
        private el: ElementRef,
        private ngZone: NgZone,
        private sanitizer: DomSanitizer
    ) {}

    ngOnInit(): void {
        this._initialized = true;
        // set directly (no emit) to avoid forcing a second fetch when a host pre-seeded it
        this.tableFilterService.pageSize = this.svc.restorePageSize(this.initialPageSize);
        this.buildColumns();
        this.updateEntityTypeLabel();
        this.subscription.add(
            this.tableFilterService.filtersChanged.subscribe((filters) => {
                // chips: every non-hidden filter except the free-text search (shown in the box)
                this.activeFilters = filters.filter((f) => f.hidden !== true && f.columnId !== this.filterColumn);
                const match = filters.find((f) => f.columnId === this.filterColumn);
                this.searchString = match ? match.value : '';
                // an activated filter changes which controls are pinned and how wide they render
                this.filtersDirty = true;
                this.scheduleFilterOverflow();
            })
        );
        this.subscription.add(
            this.tableFilterService.filtering.subscribe((f) => (this.filtering = f))
        );
        // close the column chooser whenever a filter dropdown (or anything else) opens
        this.subscription.add(
            this.svc.menuOpened$.subscribe((owner) => {
                if (owner !== this) {
                    this.showColumnChooser = false;
                }
            })
        );
        this.tableReady.emit({component: this});
    }

    ngAfterViewInit(): void {
        this.ensureFilterResizeObserver();
    }

    ngAfterViewChecked(): void {
        // the whole table sits behind @if(showTable), so the toolbar may not exist
        // until row data arrives; (re)attach the observer once/whenever it appears
        this.ensureFilterResizeObserver();
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
        this.detachResizeListeners();
        this.filterRO?.disconnect();
        if (this.overflowRaf) {
            cancelAnimationFrame(this.overflowRaf);
        }
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
        }
    }

    get showTable(): boolean {
        return this.isLoading || this.filterApplied || this.rowData?.length > 0;
    }

    /** Columns surfaced as inline filter controls in the toolbar. Text filters are
     *  excluded because the free-text search box already covers the primary text field. */
    get filterableColumns(): ListColumn[] {
        return this.allColumns.filter((c) => c.filterType && c.filterType !== 'TEXTINPUT');
    }

    // -------------------------------------------------- responsive filter overflow
    /** A filter column is "active" when it has an applied filter. */
    isFilterActive(col: ListColumn): boolean {
        return this.activeFilters.some((f) => f.columnId === col.key);
    }

    /** Applied filters that are currently hidden in the overflow dropdown. */
    get hiddenActiveCount(): number {
        return this.overflowFilterColumns.filter((c) => this.isFilterActive(c)).length;
    }

    toggleFilterOverflow(event: MouseEvent): void {
        event.stopPropagation();
        this.showFilterOverflow = !this.showFilterOverflow;
        if (this.showFilterOverflow) {
            this.svc.notifyMenuOpened(this);
        }
    }

    closeFilterOverflow(event?: Event): void {
        // keep open when the click lands in a filter's own Material overlay (e.g. the
        // date-range calendar), which renders outside this popover's DOM subtree
        const target = event?.target as HTMLElement | undefined;
        if (target?.closest?.('.cdk-overlay-container')) {
            return;
        }
        this.showFilterOverflow = false;
    }

    private ensureFilterResizeObserver(): void {
        // observe the toolbar row (not the content-sized zone) so a window resize,
        // which changes the row's available width, actually fires the observer
        const target = this.filterZone?.nativeElement?.parentElement ?? undefined;
        if (!target || typeof ResizeObserver === 'undefined' || target === this.observedToolbar) {
            return;
        }
        // ResizeObserver fires outside Angular's zone; re-enter so the recomputed
        // visible/overflow split actually triggers change detection.
        if (!this.filterRO) {
            this.filterRO = new ResizeObserver(() => this.ngZone.run(() => this.scheduleFilterOverflow()));
        } else {
            this.filterRO.disconnect();
        }
        this.filterRO.observe(target);
        this.observedToolbar = target;
        // compute the split for the newly-observed row (deferred, so it never mutates
        // bound state inside the change-detection pass that called us)
        this.scheduleFilterOverflow();
    }

    private scheduleFilterOverflow(): void {
        if (this.overflowRaf) {
            cancelAnimationFrame(this.overflowRaf);
        }
        this.overflowRaf = requestAnimationFrame(() => {
            this.overflowRaf = 0;
            this.ensureFilterResizeObserver();
            this.recomputeFilterOverflow();
        });
    }

    private recomputeFilterOverflow(): void {
        const cols = this.filterableColumns;
        if (!cols.length) {
            this.visibleFilterColumns = [];
            this.overflowFilterColumns = [];
            return;
        }
        const needMeasure = this.filtersDirty || cols.some((c) => !this.filterWidths.has(c.key));
        if (!needMeasure) {
            this.applyFilterSplit();
            return;
        }
        // render every control inline for one frame so each can be measured, then collapse
        this.visibleFilterColumns = cols;
        this.overflowFilterColumns = [];
        requestAnimationFrame(() => {
            const row = this.filtersRow?.nativeElement;
            if (row) {
                row.querySelectorAll<HTMLElement>('[data-filter-key]').forEach((el) => {
                    const key = el.getAttribute('data-filter-key');
                    if (key) {
                        this.filterWidths.set(key, Math.ceil(el.getBoundingClientRect().width));
                    }
                });
            }
            this.filtersDirty = false;
            this.applyFilterSplit();
        });
    }

    /** Split filter controls into inline vs. overflow, pinning active filters and
     *  dropping inactive (then, only if forced, active) from the right until they fit. */
    private applyFilterSplit(): void {
        const zone = this.filterZone?.nativeElement;
        const cols = this.filterableColumns;
        if (!zone || !cols.length) {
            return;
        }
        // budget = the toolbar row's width minus its fixed siblings (search / divider /
        // Columns) and the gaps between them, i.e. the space filters may take before
        // they'd push the Columns control off the row
        const toolbarLeft = zone.parentElement as HTMLElement | null;
        const siblingWidth = (sel: string): number => {
            const node = toolbarLeft?.querySelector(sel) as HTMLElement | null;
            return node ? Math.ceil(node.getBoundingClientRect().width) : 0;
        };
        const available =
            (toolbarLeft?.clientWidth ?? zone.clientWidth) -
            siblingWidth('.lt-search') -
            siblingWidth('.lt-divider') -
            siblingWidth('.lt-columns') -
            3 * this.FILTER_GAP;
        const widthOf = (c: ListColumn) => this.filterWidths.get(c.key) ?? 0;
        const totalOf = (list: ListColumn[], withMore: boolean): number => {
            let w = 0;
            list.forEach((c, i) => (w += widthOf(c) + (i > 0 ? this.FILTER_GAP : 0)));
            if (withMore) {
                w += (list.length ? this.FILTER_GAP : 0) + this.MORE_BTN_W;
            }
            return w;
        };

        if (totalOf(cols, false) <= available) {
            this.visibleFilterColumns = cols;
            this.overflowFilterColumns = [];
            return;
        }

        // removal priority: inactive right-to-left first, then active right-to-left
        const inactive = cols.filter((c) => !this.isFilterActive(c)).reverse();
        const active = cols.filter((c) => this.isFilterActive(c)).reverse();
        const removalOrder = [...inactive, ...active];
        const overflow = new Set<string>();
        for (const c of removalOrder) {
            overflow.add(c.key);
            const visible = cols.filter((x) => !overflow.has(x.key));
            if (totalOf(visible, true) <= available) {
                break;
            }
        }
        this.visibleFilterColumns = cols.filter((c) => !overflow.has(c.key));
        this.overflowFilterColumns = cols.filter((c) => overflow.has(c.key));
        if (!this.overflowFilterColumns.length) {
            this.showFilterOverflow = false;
        }
    }

    // ---------------------------------------------------------------- columns
    private buildColumns(): void {
        this._initialColumns = this._rawColumns.map((c) => ({...c}));
        this.allColumns = this.svc.applyPersistedState(this._rawColumns);
        this.updateVisible();
        // start with every filter control visible; the overflow pass collapses to fit
        this.visibleFilterColumns = this.filterableColumns;
        this.overflowFilterColumns = [];
        this.filtersDirty = true;
        this.scheduleFilterOverflow();
    }

    private updateVisible(): void {
        this.visibleColumns = this.allColumns.filter((c) => !c.hidden);
        this.hiddenColumns = this.allColumns
            .filter((c) => c.hidden)
            .map((c) => ({...c, headerName: c.label}));
    }

    trackRow = (index: number, row: any) => row?.id ?? row?.name ?? index;
    trackCol = (index: number, col: ListColumn) => col.key;

    colWidth(col: ListColumn): string | null {
        return col.width != null ? `${col.width}px` : null;
    }

    // ---------------------------------------------------------------- cells
    private rawValue(col: ListColumn, row: any): any {
        return _.get(row, col.field || col.key);
    }

    private cellContext(col: ListColumn, row: any, i: number): ListCellContext {
        return {
            row,
            value: this.rawValue(col, row),
            colId: col.key,
            rowIndex: i,
            emitAction: (action: string, item: any = row) => this.actionRequested.emit({action, item}),
        };
    }

    private legacyShim(col: ListColumn, row: any, i: number): ListLegacyCellShim {
        return {data: row, value: this.rawValue(col, row), column: {colId: col.key}, rowIndex: i};
    }

    renderMode(col: ListColumn): 'component' | 'html' | 'text' {
        if (col.cell) {
            return 'component';
        }
        if (col.cellHtml) {
            return 'html';
        }
        return 'text';
    }

    cellInputs(col: ListColumn, row: any, i: number): Record<string, unknown> {
        if (col.cellInputs) {
            return col.cellInputs(this.cellContext(col, row, i));
        }
        return {row, value: this.rawValue(col, row)};
    }

    cellHtml(col: ListColumn, row: any, i: number): string {
        return col.cellHtml ? col.cellHtml(this.legacyShim(col, row, i)) : '';
    }

    cellText(col: ListColumn, row: any, i: number): any {
        if (col.valueFormatter) {
            return col.valueFormatter(this.legacyShim(col, row, i));
        }
        return this.rawValue(col, row);
    }

    cellClass(col: ListColumn): string {
        return col.cellClass || '';
    }

    onCellClick(col: ListColumn, row: any, i: number): void {
        col.onCellClick?.(this.cellContext(col, row, i));
    }

    tooltipInputs(col: ListColumn, row: any, i: number): Record<string, unknown> {
        return col.tooltipInputs ? col.tooltipInputs(this.cellContext(col, row, i)) : {row};
    }

    // ---------------------------------------------------------------- hover tooltip
    hoverTooltip: {component: Type<any>; inputs: Record<string, unknown>; left: number; top: number} | null = null;

    onCellHover(col: ListColumn, row: any, i: number, event: MouseEvent): void {
        if (!col.tooltip) {
            return;
        }
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        this.hoverTooltip = {
            component: col.tooltip,
            inputs: this.tooltipInputs(col, row, i),
            left: rect.left,
            top: rect.bottom + 6,
        };
    }

    onCellLeave(): void {
        this.hoverTooltip = null;
    }

    // ---------------------------------------------------------------- selection
    toggleItem = (item: any): void => {
        item.selected = !item.selected;
        this.allToggled = !_.isEmpty(this.rowData) && _.every(this.rowData, {selected: true});
        this.actionRequested.emit({action: 'toggleItem', item});
    };

    /** Some rows selected but the header select-all isn't fully on (indeterminate). */
    get someSelected(): boolean {
        return !this.allToggled && _.some(this.rowData, {selected: true});
    }

    toggleAll(): void {
        const newState = !this.allToggled;
        this.allToggled = newState;
        _.forEach(this.rowData, (row) => {
            row.selected = newState;
        });
        this.actionRequested.emit({action: 'toggleAll'});
    }

    // ---------------------------------------------------------------- sort
    onHeaderSort(event: {colId: string; dir: ListSortDir}): void {
        this.allColumns.forEach((c) => {
            c.sortDir = c.key === event.colId ? event.dir : undefined;
        });
    }

    // ---------------------------------------------------------------- hide / show / reorder
    hideColumn(col: ListColumn): void {
        const target = this.allColumns.find((c) => c.key === col.key);
        if (!target) {
            return;
        }
        target.hidden = true;
        this.updateVisible();
        this.svc.saveState(this.allColumns);
    }

    showColumn(event: {column: any; visible: boolean}): void {
        const target = this.allColumns.find((c) => c.key === event.column?.key);
        if (!target) {
            return;
        }
        target.hidden = false;
        this.updateVisible();
        this.svc.saveState(this.allColumns);
    }

    onReorder(event: CdkDragDrop<ListColumn[]>): void {
        if (event.previousIndex === event.currentIndex) {
            return;
        }
        moveItemInArray(this.visibleColumns, event.previousIndex, event.currentIndex);
        const nextVisible = [...this.visibleColumns];
        let vi = 0;
        this.allColumns = this.allColumns.map((c) => (c.hidden ? c : nextVisible[vi++]));
        this.updateVisible();
        this.svc.saveState(this.allColumns);
    }

    resetTableColumns(): void {
        this.svc.reset();
        this.allColumns = this._initialColumns.map((c) => ({...c}));
        this.updateVisible();
        this.closeActionMenu();
    }

    // ---------------------------------------------------------------- column chooser
    /** Count of columns the user has hidden beyond the defaults (drives the badge).
     *  Columns hidden by default don't count, so a fresh/default load shows no badge. */
    get hiddenColumnCount(): number {
        return this.allColumns.filter((c) => c.hidden && !this.isDefaultHidden(c)).length;
    }

    /** True when visibility + order match the originally declared columns. */
    get columnsAtDefault(): boolean {
        if (this.allColumns.length !== this._initialColumns.length) {
            return false;
        }
        return this.allColumns.every((c, i) => {
            const init = this._initialColumns[i];
            return init && init.key === c.key && !!init.hidden === !!c.hidden;
        });
    }

    /** True when the column is hidden in the originally declared defaults. */
    isDefaultHidden(col: ListColumn): boolean {
        const init = this._initialColumns.find((c) => c.key === col.key);
        return !!init?.hidden;
    }

    toggleColumnChooser(event: MouseEvent): void {
        event.stopPropagation();
        this.showColumnChooser = !this.showColumnChooser;
        if (this.showColumnChooser) {
            this.svc.notifyMenuOpened(this);
        }
    }

    closeColumnChooser(): void {
        this.showColumnChooser = false;
    }

    toggleColumnVisible(col: ListColumn): void {
        if (col.hideable === false) {
            return;
        }
        const target = this.allColumns.find((c) => c.key === col.key);
        if (!target) {
            return;
        }
        target.hidden = !target.hidden;
        this.updateVisible();
        this.svc.saveState(this.allColumns);
    }

    chooserReorder(event: CdkDragDrop<ListColumn[]>): void {
        if (event.previousIndex === event.currentIndex) {
            return;
        }
        moveItemInArray(this.allColumns, event.previousIndex, event.currentIndex);
        this.updateVisible();
        this.svc.saveState(this.allColumns);
    }

    // ---------------------------------------------------------------- resize
    startResize(col: ListColumn, event: PointerEvent): void {
        if (col.resizable === false) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const th = (event.target as HTMLElement)?.closest('th') as HTMLElement;
        const startWidth = col.width ?? th?.offsetWidth ?? 150;
        this.resizing = {col, startX: event.clientX, startWidth};
        document.addEventListener('pointermove', this.onPointerMove);
        document.addEventListener('pointerup', this.onPointerUp);
    }

    private handleResizeMove(event: PointerEvent): void {
        if (!this.resizing) {
            return;
        }
        const delta = event.clientX - this.resizing.startX;
        const min = this.resizing.col.minWidth ?? 40;
        this.resizing.col.width = Math.max(min, Math.round(this.resizing.startWidth + delta));
    }

    private handleResizeEnd(): void {
        if (this.resizing) {
            this.svc.saveWidth(this.resizing.col.key, this.resizing.col.width!, this.allColumns);
        }
        this.resizing = undefined;
        this.detachResizeListeners();
    }

    private detachResizeListeners(): void {
        document.removeEventListener('pointermove', this.onPointerMove);
        document.removeEventListener('pointerup', this.onPointerUp);
    }

    // ---------------------------------------------------------------- action menus
    openActionMenu = (event: MouseEvent, item: any): void => {
        this.selectedItem = item;
        this.openMenu = true;
        _.delay(() => {
            const height = this.contextMenu?.nativeElement?.offsetHeight || 120;
            const windowOffset = window.innerHeight - event.clientY;
            const menuOffset = windowOffset <= height ? height - windowOffset : 0;
            this.menuLeft = event.clientX - 100;
            this.menuTop = event.clientY + 5 - menuOffset;
        }, 10);
    };

    closeActionMenu = (): void => {
        this.selectedItem = {actionList: []};
        this.openMenu = false;
        this.openHeaderMenu = false;
    };

    openHeaderActionMenu(event: MouseEvent): void {
        this.menuLeft = event.clientX - 150;
        this.menuTop = event.clientY + 5;
        _.delay(() => {
            this.openHeaderMenu = true;
        }, 100);
    }

    hideMenuItem(menuItem: any, selectedItem: any): boolean {
        if (_.isFunction(menuItem.hidden)) {
            return menuItem.hidden(selectedItem);
        } else if (_.isBoolean(menuItem.hidden)) {
            return menuItem.hidden;
        }
        return !selectedItem.actionList?.includes(menuItem.action);
    }

    closeHeaderActionMenu = (): void => {
        this.openHeaderMenu = false;
    };

    /** Restore-default (rotate) icon for the built-in header action. */
    private readonly RESET_TABLE_ICON = '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M3.2 8a4.8 4.8 0 1 0 1.3-3.3"/><path fill="currentColor" d="M2.8 2.8l-.3 2.9 2.8-.4z"/></svg>';

    /** Header action menu rows: the reset action followed by host-provided header actions.
     *  A host action's `icon` (SVG markup) is rendered before its label, like the row menu. */
    get headerMenuItems(): ListMenuItem[] {
        const items: ListMenuItem[] = [
            {label: 'Restore Default Table', action: '__reset_table__', id: 'ResetTableButton', iconSvg: this.safeIcon(this.RESET_TABLE_ICON)},
        ];
        _.forEach(this.headerActions, (ha) => {
            items.push({
                label: ha.name || ha.label,
                action: ha.action,
                id: 'HeaderAction_' + ha.action,
                iconSvg: ha.icon ? this.safeIcon(ha.icon) : undefined,
                data: ha,
            });
        });
        return items;
    }

    onHeaderMenuClick(evt: {item: ListMenuItem; event: MouseEvent}): void {
        if (evt.item.action === '__reset_table__') {
            this.resetTableColumns();
        } else {
            this.actionRequested.emit({action: evt.item.action});
        }
        this.closeHeaderActionMenu();
    }

    /** Row action menu rows, built from `menuItems` against the currently selected row.
     *  A menu item's `icon` (SVG markup) is rendered before its label in the menu. */
    get rowMenuItems(): ListMenuItem[] {
        return _.map(this.menuItems, (mi) => ({
            label: mi.name || mi.label,
            action: mi.action,
            id: 'TableActionButton_' + mi.action,
            hidden: this.hideMenuItem(mi, this.selectedItem),
            iconSvg: mi.icon ? this.safeIcon(mi.icon) : undefined,
            data: mi,
        }));
    }

    onRowMenuClick(evt: {item: ListMenuItem; event: MouseEvent}): void {
        this.actionRequested.emit({action: evt.item.action, item: this.selectedItem});
        this.closeActionMenu();
    }

    openCreate(): void {
        this.actionRequested.emit({action: 'create'});
    }

    // ---------------------------------------------------------------- toolbar search + pagination
    onSearchInput(): void {
        this.inputChangedDebounced();
    }

    private applySearch(): void {
        this.tableFilterService.currentPage = 1;
        this.tableFilterService.updateFilter({
            filterName: this.filterName,
            columnId: this.filterColumn,
            value: this.searchString,
            label: this.searchString,
        });
    }

    nextPage(): void {
        if (this.nextDisabled) {
            return;
        }
        this.tableFilterService.changePage((this.tableFilterService.currentPage || 1) + 1);
    }

    prevPage(): void {
        if (this.prevDisabled) {
            return;
        }
        this.tableFilterService.changePage((this.tableFilterService.currentPage || 1) - 1);
    }

    get cursorPager(): boolean {
        return this.options?.pager === 'cursor';
    }

    get nextDisabled(): boolean {
        if (this.filtering) {
            return true;
        }
        if (this.cursorPager) {
            return !this.hasNext;
        }
        if (!_.isNumber(this.totalCount) || !_.isNumber(this.endCount)) {
            return true;
        }
        return Number(this.endCount) >= Number(this.totalCount);
    }

    get prevDisabled(): boolean {
        if (this.filtering) {
            return true;
        }
        if (this.cursorPager) {
            return !this.hasPrev;
        }
        if (!_.isNumber(this.startCount) || !_.isNumber(this.totalCount)) {
            return true;
        }
        return Number(this.startCount) <= 1;
    }

    // ---- rows-per-page + numbered pagination (the skin footer) ----
    pageSizeOptions = [25, 50, 100];

    /** Default rows-per-page when nothing is remembered (the persisted choice wins). */
    @Input() initialPageSize = 50;

    get pageSize(): number {
        return this.tableFilterService.pageSize;
    }

    get currentPageNum(): number {
        return this.tableFilterService.currentPage || 1;
    }

    get totalPages(): number {
        if (!_.isNumber(this.totalCount) || Number(this.totalCount) <= 0) {
            return 1;
        }
        return Math.max(1, Math.ceil(Number(this.totalCount) / this.pageSize));
    }

    /** Page numbers to render, with `0` marking a gap ("..."). Shows the first and
     *  last page plus a window around the current page so long lists stay compact. */
    get pageWindow(): number[] {
        const total = this.totalPages;
        const cur = this.currentPageNum;
        if (total <= 7) {
            return Array.from({length: total}, (_v, i) => i + 1);
        }
        const pages = new Set<number>([1, total, cur, cur - 1, cur + 1]);
        const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
        const out: number[] = [];
        let prev = 0;
        for (const p of sorted) {
            if (prev && p - prev > 1) {
                out.push(0); // gap sentinel
            }
            out.push(p);
            prev = p;
        }
        return out;
    }

    goToPage(page: number): void {
        if (page < 1 || page > this.totalPages || page === this.currentPageNum || this.filtering) {
            return;
        }
        this.tableFilterService.changePage(page);
    }

    onPageSizeChange(size: number): void {
        if (!size || size === this.pageSize) {
            return;
        }
        this.svc.savePageSize(size);
        this.tableFilterService.changePageSize(size);
    }

    /** Re-fetch the current page (re-emits the page so the host reloads its data). */
    refresh(): void {
        if (this.filtering) {
            return;
        }
        this.tableFilterService.changePage(this.currentPageNum);
    }

    // ---- auto-refresh (the skin toolbar toggle) ----
    autoRefresh = false;
    readonly autoRefreshIntervalMs = 30000;
    private autoRefreshTimer?: ReturnType<typeof setInterval>;

    toggleAutoRefresh(): void {
        this.autoRefresh = !this.autoRefresh;
        if (this.autoRefresh) {
            this.autoRefreshTimer = setInterval(() => this.ngZone.run(() => this.refresh()), this.autoRefreshIntervalMs);
        } else if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = undefined;
        }
    }

    // ---- row action icons ----
    // A menu item's host-supplied `icon` (SVG markup) is rendered before its label in
    // the row's kebab menu. Sanitized once per unique SVG and cached.
    private iconCache = new Map<string, SafeHtml>();

    private safeIcon(svg: string): SafeHtml {
        let safe = this.iconCache.get(svg);
        if (!safe) {
            safe = this.sanitizer.bypassSecurityTrustHtml(svg);
            this.iconCache.set(svg, safe);
        }
        return safe;
    }

    private updateEntityTypeLabel(): void {
        const map: Record<string, string> = {
            'api-sessions': 'API Sessions',
            'auth-policies': 'Auth Policies',
            'certificate-authorities': 'Certificate Authorities',
            'ext-jwt-signers': 'External JWT Signers',
            identities: 'Identities',
            'posture-checks': 'Posture Checks',
            'edge-routers': 'Edge Routers',
            services: 'Services',
            configurations: 'Configs',
            'config-types': 'Config Types',
            'service-policies': 'Service Policies',
            'edge-router-policies': 'Edge Router Policies',
            'service-edge-router-policies': 'Service Edge Router Policies',
            sessions: 'Sessions',
            terminators: 'Terminators',
            'transit-routers': 'Transit Routers',
        };
        this.entityTypeLabel = map[this._tableId] || this.entityTypeName || '';
    }
}
