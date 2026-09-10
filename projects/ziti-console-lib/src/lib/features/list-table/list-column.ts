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

import {Type} from '@angular/core';

export type ListSortDir = 'asc' | 'desc' | undefined;

/**
 * Context handed to component-cell input mappers.
 */
export interface ListCellContext<T = any> {
    row: T;
    value: any;
    colId: string;
    rowIndex: number;
    /** Emit a row action (flows to the table's `actionRequested` → the page handler). */
    emitAction: (action: string, item?: any) => void;
}

/**
 * Shim shape passed to legacy `cellHtml` / `valueFormatter` functions so the existing
 * ag-grid-era renderer bodies (which read `row.data`, `row.column.colId`, `row.value`)
 * keep working unchanged.
 */
export interface ListLegacyCellShim {
    data: any;
    value?: any;
    column: { colId: string };
    rowIndex?: number;
}

/**
 * Declarative column definition for {@link ListTableComponent}. Replaces the ag-grid
 * `ColDef` shape used by the legacy `lib-data-table`. Rendering precedence for a cell is:
 * `cell` (a component) > `cellHtml` (sanitized markup) > `valueFormatter` (plain text) >
 * the raw value at `field`.
 */
export interface ListColumn<T = any> {
    /** Stable column id (was ag-grid `colId`). Used for persistence + tracking. */
    key: string;
    /** Dot-path used to read the raw value from a row. Defaults to `key`. */
    field?: string;
    /** Header label (was ag-grid `headerName`). */
    label: string;

    // ---- rendering ------------------------------------------------------------
    /** Component class rendered in each cell, hosted via NgComponentOutlet. */
    cell?: Type<any>;
    /** Maps a row to the `@Input()`s of the `cell` component. */
    cellInputs?: (ctx: ListCellContext<T>) => Record<string, unknown>;
    /** Returns sanitized HTML for the cell (legacy string renderers). */
    cellHtml?: (shim: ListLegacyCellShim) => string;
    /** Returns plain text for the cell. */
    valueFormatter?: (shim: ListLegacyCellShim) => string;

    // ---- sizing / layout ------------------------------------------------------
    /** Initial width in px. Omit to let the column flex to fill available space. */
    width?: number;
    minWidth?: number;
    /** Defaults to true. */
    resizable?: boolean;
    /** Extra class(es) applied to every cell in the column. */
    cellClass?: string;

    // ---- interaction ----------------------------------------------------------
    sortable?: boolean;
    /** Convenience flag mirrored from legacy `headerComponentParams.enableSorting`. */
    enableSorting?: boolean;
    sortDir?: ListSortDir;
    /** Called on header sort click with the resolved direction (was `sortColumn`). */
    onSort?: (colId: string, dir: ListSortDir) => void;
    /** Called on cell click (was ag-grid `onCellClicked`). */
    onCellClick?: (ctx: ListCellContext<T>) => void;

    // ---- header filter plumbing (reuses the existing filter overlays) ---------
    filterType?: 'TEXTINPUT' | 'SELECT' | 'COMBO' | 'DATETIME' | 'ATTRIBUTE' | 'CUSTOM' | string;
    /** API field the filter queries. Defaults to `field` then `key`. Use when the
     *  display field differs from the filterable field (e.g. key `os` → `envInfo.os`,
     *  key `type` (display `type.name`) → `typeId`). */
    filterField?: string;
    /** Placeholder shown in the filter-row control when nothing is selected. */
    filterPlaceholder?: string;
    filterOptions?: any[];
    getFilterOptions?: () => any[];
    /** Extra params for the filter controls (attribute getters, combo options, etc.). */
    headerParams?: Record<string, any>;

    // ---- tooltip --------------------------------------------------------------
    /** Component class rendered as a hover tooltip. */
    tooltip?: Type<any>;
    tooltipInputs?: (ctx: ListCellContext<T>) => Record<string, unknown>;

    // ---- column chrome --------------------------------------------------------
    /** Defaults to true. When false the column cannot be hidden. */
    hideable?: boolean;
    /** Defaults to true. When false the column cannot be drag-reordered. */
    reorderable?: boolean;
    /** Initial visibility (was ag-grid `hide`). */
    hidden?: boolean;
}

/**
 * Optional base interface for component cells hosted by {@link ListTableComponent}.
 * The table sets whatever `@Input()`s a column's `cellInputs` returns; implementing this
 * is not required but documents the common ones.
 */
export interface ListCell<T = any> {
    row?: T;
    value?: any;
}
