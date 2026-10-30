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
    HostBinding,
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
import {ListColumn, ListCellContext, ListLegacyCellShim, ListSortDir, ListTableOptions, ListTableToolbarOptions, TreeVariant} from './list-column';
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

    @Input() set rowData(value: any[]) {
        this._rowData = value || [];
        // once real rows have arrived, later loads are "refresh" (keep rows + top bar)
        // rather than "initial" (skeleton). Never flips back on a later empty result.
        if (this._rowData.length > 0) {
            this.hasLoadedOnce = true;
        }
        this.updateSkeleton();
        this.rebuildFlatRows();
    }
    get rowData(): any[] {
        return this._rowData;
    }
    private _rowData: any[] = [];

    @Input() set isLoading(value: boolean) {
        this._isLoading = value;
        this.updateRefreshBar();
        this.updateSkeleton();
    }
    get isLoading(): boolean {
        return this._isLoading;
    }
    private _isLoading = false;

    /** Placeholder rows drawn during the first load, before any data has arrived. */
    @Input() skeletonRowCount = 8;

    /** True once the table has shown real rows at least once, so a later load shows the
     *  refresh bar over the existing rows instead of the full-page skeleton again. */
    hasLoadedOnce = false;

    /** The logical "first load with nothing on screen yet" state. The skeleton renders
     *  off showSkeleton (below), which debounces this so a very fast first load goes
     *  straight to rows without a skeleton flash. */
    get isInitialLoad(): boolean {
        return this._isLoading && !this.hasLoadedOnce;
    }

    /** Whether the skeleton placeholder is visible. Debounced from isInitialLoad with the
     *  same show-delay as the refresh bar: a first load shorter than REFRESH_SHOW_DELAY
     *  never shows it. Unlike the bar there is no minimum-visible hold, so real rows
     *  replace the skeleton the moment they arrive. */
    showSkeleton = false;
    private skeletonShowTimer: any;

    private updateSkeleton(): void {
        if (this.isInitialLoad) {
            // arm the show-delay once; a fast first load that finishes before it fires
            // never shows the skeleton - the rows just appear
            if (!this.showSkeleton && !this.skeletonShowTimer) {
                this.skeletonShowTimer = setTimeout(() => {
                    this.skeletonShowTimer = undefined;
                    this.showSkeleton = true;
                }, this.REFRESH_SHOW_DELAY);
            }
        } else {
            // first load ended (rows arrived) or this is not a first load: cancel a
            // pending skeleton and hide it now so real rows show at once
            clearTimeout(this.skeletonShowTimer);
            this.skeletonShowTimer = undefined;
            this.showSkeleton = false;
        }
    }

    /** Whether the thin top refresh bar is visible. Debounced from isLoading via
     *  updateRefreshBar rather than read straight off it. */
    showRefreshBar = false;

    // The refresh bar is debounced so quick reloads (including fast auto-refresh polls)
    // don't flash it: it only appears once a reload has run past REFRESH_SHOW_DELAY, and
    // once shown it stays at least REFRESH_MIN_VISIBLE so it never blinks in and out.
    private readonly REFRESH_SHOW_DELAY = 150;
    private readonly REFRESH_MIN_VISIBLE = 450;
    private refreshShowTimer: any;
    private refreshHideTimer: any;
    private refreshShownAt = 0;

    private updateRefreshBar(): void {
        // the skeleton covers the first load; the bar is only for reloads with rows present
        const refreshing = this._isLoading && this.hasLoadedOnce;
        if (refreshing) {
            // a reload is running: cancel any pending hide and arm the show timer once
            clearTimeout(this.refreshHideTimer);
            this.refreshHideTimer = undefined;
            if (!this.showRefreshBar && !this.refreshShowTimer) {
                this.refreshShowTimer = setTimeout(() => {
                    this.refreshShowTimer = undefined;
                    this.showRefreshBar = true;
                    this.refreshShownAt = Date.now();
                }, this.REFRESH_SHOW_DELAY);
            }
        } else {
            // reload ended (or it was the first load): drop a not-yet-shown bar at once,
            // but let a visible one finish its minimum time on screen so it doesn't blink
            if (this.refreshShowTimer) {
                clearTimeout(this.refreshShowTimer);
                this.refreshShowTimer = undefined;
            }
            if (this.showRefreshBar && !this.refreshHideTimer) {
                const remaining = Math.max(0, this.REFRESH_MIN_VISIBLE - (Date.now() - this.refreshShownAt));
                this.refreshHideTimer = setTimeout(() => {
                    this.refreshHideTimer = undefined;
                    this.showRefreshBar = false;
                }, remaining);
            }
        }
    }

    /** Row indexes for the skeleton loop (at least one). */
    get skeletonRows(): number[] {
        const n = Math.max(1, this.skeletonRowCount || 0);
        return Array.from({length: n}, (_v, i) => i);
    }

    // A small spread of bar widths so skeleton cells don't read as an identical grid.
    // Deterministic (no randomness) so the widths don't flicker across change detection.
    private readonly SK_WIDTHS = [70, 52, 84, 46, 64, 58, 76, 48];

    /** Skeleton bar width (as a %) for a given column/row, varied but stable. */
    skeletonBarWidth(colIndex: number, rowIndex: number): number {
        const base = this.SK_WIDTHS[colIndex % this.SK_WIDTHS.length];
        const jitter = ((rowIndex * 7 + colIndex * 3) % 5) * 4 - 8; // -8..+8
        return Math.max(30, Math.min(92, base + jitter));
    }
    // fitColumns: keep the table within its visible width when resizing - a column can only grow until
    // the other columns reach their set or minimum width, then the drag stops, so nothing is pushed
    // off screen into the horizontal scroll. Off by default (columns can grow past the view and scroll).
    @Input() set options(value: ListTableOptions) {
        const wasTree = !!this._options?.tree;
        this._options = value || {};
        this.toolbarControls = this.normalizeToolbar(this._options.toolbar);
        // rebuild the render list if tree mode was flipped after init, otherwise flatRows
        // keeps the pre-toggle shape
        if (this._initialized && !!this._options.tree !== wasTree) {
            this.rebuildFlatRows();
        }
    }
    get options(): ListTableOptions {
        return this._options;
    }
    private _options: ListTableOptions = {noSelect: false, noMenu: false};

    /** Resolved show/disabled state for each toolbar control, read by the template.
     *  Every control shows and is enabled unless the host's `options.toolbar` says otherwise. */
    toolbarControls = this.normalizeToolbar(undefined);

    private normalizeToolbar(toolbar: ListTableToolbarOptions | undefined) {
        const resolve = (c?: {show?: boolean; disabled?: boolean}) => ({
            show: c?.show !== false,
            disabled: !!c?.disabled,
        });
        return {
            search: resolve(toolbar?.search),
            filters: resolve(toolbar?.filters),
            refresh: resolve(toolbar?.refresh),
            autoRefresh: resolve(toolbar?.autoRefresh),
            columns: resolve(toolbar?.columns),
            pageSize: resolve(toolbar?.pageSize),
            pagination: resolve(toolbar?.pagination),
        };
    }

    /** Tree mode: fetch a row's children the first time it is expanded. Return the
     *  child rows (any shape the columns render). A row with `leaf: true`, or one that
     *  resolves to an empty array, shows no expand control.
     *  Note: tree runtime state (`children`, `leaf`, `__tree*`) is written onto the row
     *  objects, so a host that reuses a row in a save call should strip it first. */
    @Input() loadChildren?: (row: any) => Promise<any[]> | any[];

    /** Tree mode: columns per depth level (index = level; level 0 uses `columns`).
     *  Nested rows render in their own grid with a per-level sub-header, so children
     *  need not match the parent. Unset renders children with the parent's columns.
     *  The bound value is the default; users can show/hide/reorder/resize child columns
     *  per depth from the Columns menu, persisted per table. */
    @Input() set childColumnsByLevel(v: ListColumn[][] | undefined) {
        this._declaredChildColumnsByLevel = v;
        this.buildChildColumns();
    }
    get childColumnsByLevel(): ListColumn[][] | undefined {
        return this._childColumnsByLevel;
    }
    private _declaredChildColumnsByLevel?: ListColumn[][];
    private _childColumnsByLevel?: ListColumn[][];

    // Cached per level; a width change mutates the same column objects, so no rebuild is needed.
    private _childLevelCache = new Map<number, ListColumn[]>();
    private _childColsVersion = 0;
    private _childLevelCacheVersion = -1;
    // per-level derived values, recomputed only when the column set changes, so the
    // template's per-cell/per-row calls stay cheap on every change-detection pass
    private _treeKeyCache = new Map<number, string | undefined>();
    private _leadOffsetCache = new Map<string, string>();
    private _treeMemoVersion = -1;

    private invalidateColumnCache(): void {
        this._childColsVersion++;
    }

    private syncTreeMemo(): void {
        if (this._treeMemoVersion !== this._childColsVersion) {
            this._treeKeyCache.clear();
            this._leadOffsetCache.clear();
            this._treeMemoVersion = this._childColsVersion;
        }
    }

    /** Rebuilds the effective per-level child columns from the declared defaults with
     *  any persisted order/visibility/width applied. */
    private buildChildColumns(): void {
        const declared = this._declaredChildColumnsByLevel;
        if (!declared) {
            this._childColumnsByLevel = undefined;
            this.invalidateColumnCache();
            return;
        }
        this._childColumnsByLevel = declared.map((set, level) =>
            set && set.length ? this.svc.applyPersistedChildState(level, set) : (set ? [...set] : set)
        );
        this.invalidateColumnCache();
    }

    @Output() nodeToggled = new EventEmitter<{row: any; expanded: boolean}>();
    @Input() hasNext = false;
    @Input() hasPrev = false;
    @Input() startCount: any = '-';
    @Input() endCount: any = '-';
    @Input() totalCount: any = '-';
    @Input() filterApplied = false;
    @Input() menuItems: any[] = [];
    @Input() headerActions: any[] = [];
    /** @deprecated kept for the old lib-no-items bindings; the new empty state uses line glyphs, not images. */
    @Input() noItemsImage = 'nodata';
    @Input() showNoItemsAdd = true;
    @Input() noItemsReadonly = false;
    /** Primary create label shown on the first-use empty state (else the per-entity default). */
    @Input() createLabel = '';
    @Input() accessDenied = false;
    @Input() entityTypeName = '';
    @Input() filterName = 'name';
    @Input() filterColumn = 'name';

    @Output() actionRequested = new EventEmitter<{action: string; item?: any}>();
    @Output() tableReady = new EventEmitter<any>();
    /** Full set of selected rows (all depths) whenever the selection changes. */
    @Output() selectionChanged = new EventEmitter<any[]>();
    /** The row the pointer is over, or null when it leaves. Emitted once per row (at the
     *  row level, not per cell) so consumers can react to the whole hovered row, for
     *  example to highlight that row's path in a connected diagram. */
    @Output() rowHover = new EventEmitter<any | null>();

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

    /** Rows actually rendered: in tree mode this is the roots plus the expanded
     *  descendants in order; otherwise it is `rowData` unchanged. */
    flatRows: any[] = [];
    /** Tree look: 'card' floats each nested level as a bordered card; 'flat' renders
     *  nested rows inline with the table, sub-headers as plain strips, no card chrome.
     *  The bound value is the default; the user can switch it from the Columns menu and
     *  the choice is remembered per table. */
    @Input() set treeVariant(v: TreeVariant) {
        this._declaredTreeVariant = v;
        this._treeVariant = v;
    }
    get treeVariant(): TreeVariant {
        return this._treeVariant;
    }
    private _treeVariant: TreeVariant = 'card';
    private _declaredTreeVariant: TreeVariant = 'card';
    /** Show the flat/nested row-layout switch in the Columns menu. Hidden for now;
     *  the variant still comes from the `treeVariant` input. */
    @Input() showTreeVariantToggle = false;
    /** Flat variant only: draw a running guide rail down the left of each nested level. */
    @Input() treeRail = false;
    @HostBinding('class.lt-tree-flat') get isFlatTree(): boolean {
        return this.isTreeMode && this.treeVariant === 'flat';
    }

    /** Show the flat/nested switch only when the table actually renders nested rows. */
    get canSwitchTreeVariant(): boolean {
        return this.isTreeMode && this.hasChildColumns;
    }

    setTreeVariant(variant: TreeVariant): void {
        if (this._treeVariant === variant) {
            return;
        }
        this._treeVariant = variant;
        this.svc.saveTreeVariant(variant);
    }
    readonly treeIndentRem = 1.25;
    // nudges cards past the first nested level right so their edge lands on the
    // parent chevron (a nested chevron sits one grid-padding deeper than the root's)
    readonly treeDeepAlignRem = 0.625;
    // flat first-column indent: base clears the select gutter, then one chevron-width
    // per level so each sub-header lines up under its parent row's name
    readonly treeFlatBaseRem = 3.75;
    readonly treeFlatStepRem = 2.125;
    // nested card's left inset before per-depth indent; must match the --lt-card-inset token
    readonly treeCardBaseRem = 4;
    // width of the leading checkbox column injected into nested grids when selectChildren is on
    readonly treeSelectColRem = 2.25;

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
    // `level` is set when resizing a nested child column, so its width persists under
    // that depth's own state rather than the parent table's
    private resizing?: {
        col: ListColumn;
        startX: number;
        startWidth: number;
        persist: boolean;
        level?: number;
        // fitColumns: the one column that absorbs the opposite change so the table width stays constant.
        sink?: ListColumn;
        sinkStart?: number;
        minDelta?: number;
        maxDelta?: number;
        // flex columns frozen to px only for the duration of the drag; restored after
        frozen?: ListColumn[];
    };
    private readonly onPointerMove = (e: PointerEvent) => this.handleResizeMove(e);
    private readonly onPointerUp = () => this.handleResizeEnd();

    private _rawColumns: ListColumn[] = [];
    private _initialColumns: ListColumn[] = [];
    private _initialized = false;
    private subscription = new Subscription();
    // expansion + lazily-loaded children keyed by __treeRowKey, so a rowData refresh
    // (auto-refresh, paging, filter) keeps the tree open instead of collapsing it
    private _expandedKeys = new Set<string>();
    private _childrenCache = new Map<string, any[]>();
    private _destroyed = false;

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
        this._treeVariant = this.svc.restoreTreeVariant(this._declaredTreeVariant);
        this.buildChildColumns();
        this.buildColumns();
        // all inputs are bound by now, so settle the render list against the final
        // tree flag (the rowData setter may have run before `options` arrived)
        this.rebuildFlatRows();
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
        this._destroyed = true;
        this.subscription.unsubscribe();
        this.detachResizeListeners();
        this.filterRO?.disconnect();
        if (this.overflowRaf) {
            cancelAnimationFrame(this.overflowRaf);
        }
        clearTimeout(this.refreshShowTimer);
        clearTimeout(this.refreshHideTimer);
        clearTimeout(this.skeletonShowTimer);
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
        this.invalidateColumnCache();
    }

    trackRow = (index: number, row: any) => row?.__treeRowKey ?? row?.id ?? row?.name ?? index;
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

    // ---------------------------------------------------------------- row hover
    /** The row currently under the pointer, so we only emit when it actually changes. */
    private hoveredRow: any = null;

    onRowHover(row: any): void {
        if (this.hoveredRow === row) {
            return;
        }
        this.hoveredRow = row;
        this.rowHover.emit(row);
    }

    onRowLeave(row: any): void {
        if (this.hoveredRow !== row) {
            return;
        }
        this.hoveredRow = null;
        this.rowHover.emit(null);
    }

    // ---------------------------------------------------------------- selection
    /** True when nested rows get checkboxes and join the selection (opt-in). */
    get childSelectEnabled(): boolean {
        return !!this.options?.selectChildren && !this.options?.noSelect;
    }

    /** Rows the checkboxes and select-all act on: top-level only, unless selectChildren
     *  is set. Keeps select-all from marking nested rows a host that reads rowData never sees. */
    private get selectableRows(): any[] {
        if (!this.isTreeMode || this.childSelectEnabled) {
            return this.flatRows;
        }
        return this.flatRows.filter((r) => (r.__treeLevel ?? 0) === 0);
    }

    toggleItem = (item: any): void => {
        item.selected = !item.selected;
        this.syncSelectAll();
        this.actionRequested.emit({action: 'toggleItem', item});
        this.emitSelection();
    };

    /** Some rows selected but the header select-all isn't fully on (indeterminate). */
    get someSelected(): boolean {
        return !this.allToggled && this.selectableRows.some((r) => r.selected);
    }

    toggleAll(): void {
        const newState = !this.allToggled;
        this.allToggled = newState;
        this.selectableRows.forEach((row) => (row.selected = newState));
        this.actionRequested.emit({action: 'toggleAll'});
        this.emitSelection();
    }

    private syncSelectAll(): void {
        const rows = this.selectableRows;
        this.allToggled = rows.length > 0 && rows.every((r) => r.selected);
    }

    /** Emit every selected row across all depths. Walks the full data, not just the rendered
     *  rows, so a collapsed parent's selected children are still reported. */
    private emitSelection(): void {
        const out: any[] = [];
        const walk = (rows: any[]) => {
            (rows || []).forEach((r) => {
                if (r.selected) {
                    out.push(r);
                }
                if (Array.isArray(r.children)) {
                    walk(r.children);
                }
            });
        };
        walk(this._rowData);
        this.selectionChanged.emit(out);
    }

    // ---------------------------------------------------------------- tree rows
    get isTreeMode(): boolean {
        return !!this.options?.tree;
    }

    /** True when per-level child columns are configured (children render in their own
     *  grid with a sub-header rather than the parent's columns). */
    get hasChildColumns(): boolean {
        return !!(this.childColumnsByLevel && this.childColumnsByLevel.length);
    }

    /** Columns used at a given depth: level 0 is the main (visible) columns; deeper
     *  levels use `childColumnsByLevel`, falling back to the deepest set defined. */
    columnsForLevel(level: number): ListColumn[] {
        if (level <= 0 || !this.hasChildColumns) {
            return this.visibleColumns;
        }
        if (this._childLevelCacheVersion !== this._childColsVersion) {
            this._childLevelCache.clear();
            this._childLevelCacheVersion = this._childColsVersion;
        }
        const cached = this._childLevelCache.get(level);
        if (cached) {
            return cached;
        }
        const sets = this.childColumnsByLevel!;
        const set = sets[level] ?? sets[sets.length - 1];
        const cols = (set ?? this.visibleColumns).filter((c) => !c.hidden);
        this._childLevelCache.set(level, cols);
        return cols;
    }

    /** Child columns the chooser lists at a depth: all declared ones (including hidden),
     *  minus structural columns like the select checkbox or row-actions gutter. */
    allColumnsForLevel(level: number): ListColumn[] {
        return (this._childColumnsByLevel?.[level] ?? []).filter((c) => !c.excludeFromChooser);
    }

    /** Depths that offer configurable columns (skips the level-0 placeholder and any
     *  level that only holds structural columns), one chooser group per level. */
    get childLevels(): number[] {
        const sets = this._childColumnsByLevel;
        if (!sets) {
            return [];
        }
        const levels: number[] = [];
        sets.forEach((_set, level) => {
            if (level > 0 && this.allColumnsForLevel(level).length) {
                levels.push(level);
            }
        });
        return levels;
    }

    /** Chooser hint for a nested level: its first few column labels, then "+N". */
    childLevelLabel(level: number): string {
        const labels = this.allColumnsForLevel(level)
            .map((c) => c.label)
            .filter(Boolean) as string[];
        const max = 3;
        if (labels.length <= max) {
            return labels.join(' / ');
        }
        return labels.slice(0, max).join(' / ') + ' +' + (labels.length - max);
    }

    /** Key of the column that carries the expand control + indentation for a column set:
     *  the flagged one, else the first real data column (skipping a leading structural
     *  column such as a select checkbox the host put at the start). */
    private treeColumnKeyFor(cols: ListColumn[]): string | undefined {
        return (cols.find((c) => c.treeColumn) || cols.find((c) => !c.excludeFromChooser) || cols[0])?.key;
    }

    treeColumnKeyForLevel(level: number): string | undefined {
        this.syncTreeMemo();
        if (!this._treeKeyCache.has(level)) {
            this._treeKeyCache.set(level, this.treeColumnKeyFor(this.columnsForLevel(level)));
        }
        return this._treeKeyCache.get(level);
    }

    /** Width of the columns before the tree column, used to pull the flat first-column
     *  indent back by whatever structural columns (like a select checkbox) sit ahead of
     *  it, so its content still lands under the parent row's name. */
    treeLeadOffset(level: number): string {
        this.syncTreeMemo();
        const cacheKey = `${level}|${this.childSelectEnabled}`;
        const hit = this._leadOffsetCache.get(cacheKey);
        if (hit !== undefined) {
            return hit;
        }
        const cols = this.columnsForLevel(level);
        const treeKey = this.treeColumnKeyForLevel(level);
        let px = 0;
        let count = 0;
        for (const c of cols) {
            if (c.key === treeKey) {
                break;
            }
            px += c.width ?? 0;
            count++;
        }
        const gap = 'var(--lt-tree-col-gap, 0.5rem)';
        // the injected select column (when on) sits before every data column
        const selRem = this.childSelectEnabled ? this.treeSelectColRem : 0;
        const gaps = count + (this.childSelectEnabled ? 1 : 0);
        const result = (!gaps && !selRem && !px) ? '0px' : `calc(${selRem}rem + ${px}px + ${gaps} * ${gap})`;
        this._leadOffsetCache.set(cacheKey, result);
        return result;
    }

    isTreeColumn(col: ListColumn, level: number): boolean {
        return this.isTreeMode && col.key === this.treeColumnKeyForLevel(level);
    }

    isTreeCell(col: ListColumn): boolean {
        return this.isTreeColumn(col, 0);
    }

    /** Columns a full-width nested row spans: the data columns plus the select and
     *  menu gutters, matching the header's cell count. */
    get treeSpanCount(): number {
        return this.visibleColumns.length + (this.options?.noSelect ? 0 : 1) + (this.options?.noMenu ? 0 : 1);
    }

    /** Per-level indent (rem); the card variant nudges levels past the first so the edge meets the parent chevron. */
    treeIndentFor(level: number): number {
        const align = this.treeVariant === 'card' && level >= 2 ? this.treeDeepAlignRem : 0;
        return level * this.treeIndentRem + align;
    }

    /** Flat variant: left pad (rem) of a nested row's first column (sub-header + data),
     *  one chevron-width per level so it lines up under the parent row's name. */
    treeFlatFirstIndentRem(level: number): number {
        return this.treeFlatBaseRem + level * this.treeFlatStepRem;
    }

    /** Flat variant: drop the chevron slot for a leaf-only level so values sit under their header. */
    showTreeLead(row: any): boolean {
        return !(this.isFlatTree && row?.__treeSiblingsCanExpand === false);
    }

    /** Left inset (rem) of a nested card at a given depth, matching the td padding. */
    private treeCardLeftRem(level: number): number {
        return this.treeCardBaseRem + this.treeIndentFor(level);
    }

    private _railCache = new Map<string, string | null>();

    /** Vertical guide lines redrawing each ancestor card's left edge at this row's
     *  position, so a card's left border stays continuous where a nested card is
     *  inserted between its rows. Returns a stack of 1px background gradients, or null
     *  when there is no ancestor to redraw (roots and the first nested level). */
    treeAncestorRails(level: number): string | null {
        const key = `${level}|${this._treeVariant}|${this.treeRail}|${this.isTreeMode}`;
        const cached = this._railCache.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const rails = this.computeAncestorRails(level);
        this._railCache.set(key, rails);
        return rails;
    }

    private computeAncestorRails(level: number): string | null {
        if (!this.isTreeMode || level < 2) {
            return null;
        }
        const flat = this.treeVariant === 'flat';
        // card mode always redraws ancestor card borders; flat mode draws the rail
        // only when the optional running rail is turned on
        if (flat && !this.treeRail) {
            return null;
        }
        const color = flat
            ? 'var(--lt-tree-rail, color-mix(in srgb, var(--lt-border) 55%, var(--lt-icon)))'
            : 'var(--lt-tree-card-border, color-mix(in srgb, var(--lt-border) 70%, var(--lt-icon)))';
        const rails: string[] = [];
        for (let k = 1; k < level; k++) {
            const x = this.treeCardLeftRem(k);
            rails.push(`linear-gradient(90deg, transparent ${x}rem, ${color} ${x}rem, ${color} calc(${x}rem + 1px), transparent calc(${x}rem + 1px))`);
        }
        return rails.join(', ');
    }

    gridTemplate(level: number): string {
        const tracks = this.columnsForLevel(level)
            .map((c) => (c.width != null ? `${c.width}px` : 'minmax(0, 1fr)'));
        if (this.childSelectEnabled) {
            tracks.unshift(`${this.treeSelectColRem}rem`);
        }
        return tracks.join(' ');
    }

    private hasChildren(row: any): boolean {
        return Array.isArray(row?.children) && row.children.length > 0;
    }

    /** A row can be expanded unless it is a leaf, has no loaded children, and has no
     *  loader left to try. */
    canExpand(row: any): boolean {
        if (!this.isTreeMode || row?.leaf === true) {
            return false;
        }
        if (this.hasChildren(row)) {
            return true;
        }
        const key = row?.__treeRowKey;
        if (key && this._childrenCache.has(key)) {
            return true;
        }
        return !!this.loadChildren && row?.__treeLoaded !== true;
    }

    toggleNode(row: any): void {
        if (!this.isTreeMode || row?.__treeLoading) {
            return;
        }
        const key = row.__treeRowKey;
        if (this._expandedKeys.has(key)) {
            this._expandedKeys.delete(key);
            this.rebuildFlatRows();
            this.nodeToggled.emit({row, expanded: false});
            return;
        }
        if (this.loadChildren && !this.hasChildren(row) && !this._childrenCache.has(key)) {
            row.__treeLoading = true;
            row.__treeLoadError = false; // clear any previous failure on retry
            this.rebuildFlatRows(); // surface the spinner while children load
            // run the loader inside the executor so a synchronous throw rejects the
            // promise instead of escaping and leaving __treeLoading stuck on forever
            new Promise<any[]>((resolve) => resolve(this.loadChildren!(row))).then(
                (children) => this.onChildrenLoaded(row, children),
                () => this.onChildrenLoaded(row, [], true)
            );
            return;
        }
        this._expandedKeys.add(key);
        this.rebuildFlatRows();
        this.nodeToggled.emit({row, expanded: true});
    }

    private onChildrenLoaded(row: any, children: any[], failed = false): void {
        if (this._destroyed) {
            return;
        }
        row.__treeLoading = false;
        if (failed) {
            // flag the failure so the toggle shows a retry affordance, and leave it collapsed
            row.__treeLoadError = true;
            this.rebuildFlatRows();
            return;
        }
        const list = Array.isArray(children) ? children : [];
        this._childrenCache.set(row.__treeRowKey, list);
        row.children = list;
        row.__treeLoaded = true;
        if (!list.length) {
            row.leaf = true; // nothing under it, so stop offering the control
        }
        this._expandedKeys.add(row.__treeRowKey);
        this.rebuildFlatRows();
        this.nodeToggled.emit({row, expanded: true});
    }

    /** Flatten the tree into the ordered render list, tagging each row with its depth.
     *  Outside tree mode the render list is `rowData` as-is. */
    private rebuildFlatRows(): void {
        if (!this.isTreeMode) {
            this.flatRows = this._rowData;
            return;
        }
        const out: any[] = [];
        const walk = (rows: any[], level: number, parentKey: string): void => {
            const list = rows || [];
            // when no sibling can expand, the level needs no chevron slot
            const siblingsCanExpand = list.some((r) => this.canExpand(r));
            list.forEach((row, idx) => {
                row.__treeLevel = level;
                row.__treeSiblingsCanExpand = siblingsCanExpand;
                // first child of a group drives the per-expansion sub-header;
                // first and last mark the top and bottom of the nested card
                row.__treeFirstChild = level > 0 && idx === 0;
                row.__treeLastChild = level > 0 && idx === list.length - 1;
                // branch-unique track key: the same entity can appear under two parents
                // in a flat tree, so fold the parent path in to keep @for keys distinct
                row.__treeRowKey = parentKey + '/' + (row?.id ?? row?.name ?? idx);
                // a rowData refresh replaces the row object; re-attach children we loaded
                // earlier so an expanded lazy node stays populated instead of emptying out
                if (!this.hasChildren(row) && this._childrenCache.has(row.__treeRowKey)) {
                    row.children = this._childrenCache.get(row.__treeRowKey)!;
                    row.__treeLoaded = true;
                }
                row.__treeExpanded = this._expandedKeys.has(row.__treeRowKey);
                out.push(row);
                if (row.__treeExpanded && this.hasChildren(row)) {
                    walk(row.children, level + 1, row.__treeRowKey);
                }
            });
        };
        walk(this._rowData, 0, '');
        this.flatRows = out;
    }

    // ---------------------------------------------------------------- sort
    onHeaderSort(event: {colId: string; dir: ListSortDir}): void {
        this.allColumns.forEach((c) => {
            c.sortDir = c.key === event.colId ? event.dir : undefined;
        });
    }

    // ---------------------------------------------------------------- show / reorder
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
        this._treeVariant = this._declaredTreeVariant;
        this.allColumns = this._initialColumns.map((c) => ({...c}));
        this._childColumnsByLevel = this._declaredChildColumnsByLevel?.map((set) =>
            set ? set.map((c) => ({...c})) : set
        );
        this.updateVisible();
        this.closeActionMenu();
    }

    // ---------------------------------------------------------------- column chooser
    /** Count of columns the user has hidden beyond the defaults (drives the badge).
     *  Columns hidden by default don't count, so a fresh/default load shows no badge. */
    get hiddenColumnCount(): number {
        return this.allColumns.filter((c) => c.hidden && !c.excludeFromChooser && !this.isDefaultHidden(c)).length;
    }

    /** True when visibility, order, and width all match the originally declared
     *  columns. Width is included so resizing a column alone still enables the
     *  reset button; a column with no declared width uses null on both sides so
     *  it only counts as changed once the user drags it to a concrete width. */
    get columnsAtDefault(): boolean {
        if (this.canSwitchTreeVariant && this._treeVariant !== this._declaredTreeVariant) {
            return false;
        }
        if (this.allColumns.length !== this._initialColumns.length) {
            return false;
        }
        const parentAtDefault = this.allColumns.every((c, i) => {
            const init = this._initialColumns[i];
            return init
                && init.key === c.key
                && !!init.hidden === !!c.hidden
                && (init.width ?? null) === (c.width ?? null);
        });
        return parentAtDefault && this.childColumnsAtDefault;
    }

    /** True when every nested level's columns match their declared order/visibility/width. */
    private get childColumnsAtDefault(): boolean {
        const declared = this._declaredChildColumnsByLevel;
        const current = this._childColumnsByLevel;
        if (!declared || !current) {
            return true;
        }
        return declared.every((set, level) => {
            const cur = current[level] ?? [];
            if (!set || set.length !== cur.length) {
                return set ? set.length === cur.length : true;
            }
            return set.every((d, i) => {
                const c = cur[i];
                return c
                    && d.key === c.key
                    && !!d.hidden === !!c.hidden
                    && (d.width ?? null) === (c.width ?? null);
            });
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

    // The whole chooser row is draggable, and the label sits inside the visibility
    // toggle button, so a reorder drag ends with a click on that button. This guard
    // swallows that one click so dragging a row never also hides its column.
    private _chooserDragged = false;

    onChooserDragStarted(): void {
        this._chooserDragged = true;
    }

    onChooserDragEnded(): void {
        // clear after the post-drag click has been handled (and skipped) below
        setTimeout(() => (this._chooserDragged = false));
    }

    /** Toggle a column's visibility. `level` undefined targets the top-level columns;
     *  a number targets that nested depth's columns. */
    toggleColumnVisible(col: ListColumn, level?: number): void {
        if (this._chooserDragged || col.hideable === false) {
            return;
        }
        const set = level == null ? this.allColumns : this._childColumnsByLevel?.[level];
        const target = set?.find((c) => c.key === col.key);
        if (!target) {
            return;
        }
        if (!target.hidden && this.isLastVisibleColumn(target, level)) {
            return;
        }
        target.hidden = !target.hidden;
        this.afterColumnChange(level, set);
    }

    /** True when this is the only visible column at its level, so its toggle is disabled
     *  to keep at least one column on screen. */
    isLastVisibleColumn(col: ListColumn, level?: number): boolean {
        const list = level == null ? this.chooserColumns : this.allColumnsForLevel(level);
        return !col.hidden && list.filter((c) => !c.hidden).length <= 1;
    }

    /** Columns shown in the top-level Columns menu. */
    get chooserColumns(): ListColumn[] {
        return this.allColumns.filter((c) => !c.excludeFromChooser);
    }

    /** Reorder columns from a chooser drag. `level` undefined targets the top-level
     *  columns; a number targets that nested depth's columns. */
    chooserReorder(event: CdkDragDrop<ListColumn[]>, level?: number): void {
        if (event.previousIndex === event.currentIndex) {
            return;
        }
        // the menu lists a chooser subset, so map the drag indices back onto the full set
        const full = level == null ? this.allColumns : this._childColumnsByLevel?.[level];
        const list = level == null ? this.chooserColumns : this.allColumnsForLevel(level);
        if (!full) {
            return;
        }
        const from = full.indexOf(list[event.previousIndex]);
        const to = full.indexOf(list[event.currentIndex]);
        if (from < 0 || to < 0) {
            return;
        }
        moveItemInArray(full, from, to);
        this.afterColumnChange(level, full);
    }

    /** Refresh and persist after a column visibility/order change, routing to the
     *  top-level or nested-level persistence as appropriate. */
    private afterColumnChange(level: number | undefined, set: ListColumn[]): void {
        if (level == null) {
            this.updateVisible();
            this.svc.saveState(this.allColumns);
        } else {
            this.invalidateColumnCache();
            this.svc.saveChildState(level, set);
        }
    }

    // ---- nested-column chooser: one expandable group per depth level ----
    private nestedChooserOpen = new Set<string>();

    isNestedGroupOpen(id: string): boolean {
        return this.nestedChooserOpen.has(id);
    }

    toggleNestedGroup(id: string): void {
        if (this.nestedChooserOpen.has(id)) {
            this.nestedChooserOpen.delete(id);
        } else {
            this.nestedChooserOpen.add(id);
        }
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
        this.resizing = {col, startX: event.clientX, startWidth, persist: true};
        this.setupFitCompensation(col, startWidth, this.visibleColumns, (key) => this.measuredHeaderWidth(key));
        document.addEventListener('pointermove', this.onPointerMove);
        document.addEventListener('pointerup', this.onPointerUp);
    }

    /** Resize a nested row's column. Measures the sub-header cell's current rendered
     *  width so a flexible (1fr) column converts to a concrete width before dragging;
     *  the grid reflows live because its template reads each column's width. */
    startChildResize(col: ListColumn, level: number, event: PointerEvent): void {
        if (col.resizable === false) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        const cell = (event.target as HTMLElement)?.closest('.lt-tree-subhead-cell') as HTMLElement;
        const startWidth = col.width ?? Math.round(cell?.getBoundingClientRect().width ?? 150);
        const grid = cell?.closest('.lt-tree-grid') as HTMLElement | null;
        this.resizing = {col, startX: event.clientX, startWidth, persist: true, level};
        this.setupFitCompensation(col, startWidth, this.columnsForLevel(level), (key) => this.measuredCellWidth(grid, level, key));
        document.addEventListener('pointermove', this.onPointerMove);
        document.addEventListener('pointerup', this.onPointerUp);
    }

    private handleResizeMove(event: PointerEvent): void {
        if (!this.resizing) {
            return;
        }
        const r = this.resizing;
        const delta = event.clientX - r.startX;
        if (r.sink && r.sinkStart != null) {
            // fitColumns: the column grows and the sink shrinks by the same amount, so the table stays
            // the same width and no other column (notably the tree column) shifts. The drag stops once
            // the column or the sink reaches its minimum.
            const d = Math.min(r.maxDelta ?? delta, Math.max(r.minDelta ?? delta, delta));
            r.col.width = Math.round(r.startWidth + d);
            r.sink.width = Math.round(r.sinkStart - d);
        } else {
            const min = r.col.minWidth ?? 40;
            r.col.width = Math.max(min, Math.round(r.startWidth + delta));
        }
    }

    /** fitColumns: pick the sink column and the range the drag may travel, so the column and the sink
     *  trade width while every other column stays fixed. No-op (plain resize) when fitColumns is off. */
    private setupFitCompensation(col: ListColumn, startWidth: number, columns: ListColumn[], measure: (key: string) => number): void {
        if (!this.options?.fitColumns || !this.resizing) {
            return;
        }
        const sink = this.pickSink(col, columns);
        if (!sink) {
            return;
        }
        const FLOOR = 60;
        // measure() returns 0 when the element isn't found; fall back so a width of 0
        // never gets frozen in (and later persisted) for the sink or a flex column
        const sinkStart = sink.width ?? (measure(sink.key) || startWidth);
        // Freeze any other flexible column to its rendered width so only the column and the sink move
        // (otherwise the browser would still redistribute slack among the flexible columns). These are
        // restored to flexible when the drag ends, so one resize doesn't pin the whole table to px.
        const frozen: ListColumn[] = [];
        columns.forEach((c) => {
            if (c.key !== col.key && c.key !== sink.key && c.width == null) {
                const w = measure(c.key);
                if (w > 0) {
                    c.width = w;
                    frozen.push(c);
                }
            }
        });
        this.resizing.sink = sink;
        this.resizing.sinkStart = sinkStart;
        this.resizing.frozen = frozen;
        this.resizing.maxDelta = Math.max(0, sinkStart - (sink.minWidth ?? FLOOR)); // grow until the sink hits its min
        this.resizing.minDelta = Math.min(0, (col.minWidth ?? 40) - startWidth); // shrink until the column hits its min
    }

    /** The column that absorbs a resize: a flexible column first (it is meant to take up slack), else
     *  the nearest resizable column that is not the tree column, so indentation never shifts. */
    private pickSink(col: ListColumn, columns: ListColumn[]): ListColumn | undefined {
        // never pick the tree column (explicit or implicit) as the sink, or resizing
        // would move the expand chevrons
        const treeKey = this.treeColumnKeyFor(columns);
        const usable = columns.filter((c) => c.key !== col.key && c.resizable !== false && c.key !== treeKey);
        const flex = usable.find((c) => c.width == null);
        if (flex) {
            return flex;
        }
        const idx = columns.findIndex((c) => c.key === col.key);
        return usable.find((c) => columns.indexOf(c) > idx) ?? usable[usable.length - 1];
    }

    private measuredHeaderWidth(key: string): number {
        const host = this.el?.nativeElement as HTMLElement | undefined;
        const th = host?.querySelector(`[id="Header_${key}"]`) as HTMLElement | null;
        return th ? Math.round(th.getBoundingClientRect().width) : 0;
    }

    private measuredCellWidth(grid: HTMLElement | null, level: number, key: string): number {
        const idx = this.columnsForLevel(level).findIndex((c) => c.key === key);
        const cells = grid?.querySelectorAll('.lt-tree-subhead-cell');
        const cell = cells ? (cells[idx] as HTMLElement | undefined) : undefined;
        return cell ? Math.round(cell.getBoundingClientRect().width) : 0;
    }

    private handleResizeEnd(): void {
        const r = this.resizing;
        // columns frozen only to steady the drag go back to flexible, so the table keeps
        // filling the viewport and their temporary px widths are not persisted by saveState
        r?.frozen?.forEach((c) => (c.width = undefined));
        if (r?.persist) {
            if (r.level != null) {
                const set = this._childColumnsByLevel?.[r.level];
                if (set) {
                    this.svc.saveChildWidth(r.level, r.col.key, r.col.width!, set);
                }
            } else {
                this.svc.saveWidth(r.col.key, r.col.width!, this.allColumns);
            }
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

    /** Clear the search box and every active filter, which drives the host to refetch
     *  unfiltered (used by the "no results" empty state's Clear filters action). */
    clearTableFilters(): void {
        this.searchString = '';
        this.tableFilterService.clearAllFilters();
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

    /** Auto-refresh interval in seconds a page starts the table at (0 = off). This is the
     *  hook for a page to default the control on; left at 0, the table behaves as before
     *  (off until the user picks an interval). The user's in-session choice is not persisted. */
    @Input() autoRefreshSeconds = 0;

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
