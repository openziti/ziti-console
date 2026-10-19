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

import {Injectable} from '@angular/core';
import {Subject} from 'rxjs';
import {ListColumn, TreeVariant} from './list-column';

/**
 * Per-instance state + localStorage persistence for {@link ListTableComponent}.
 * Uses its own `lt_<tableId>_*` keys (separate from the legacy ag-grid table) so a
 * first visit starts from the column defs' default widths, not a carried-over ag layout.
 */
@Injectable()
export class ListTableService {
    tableId = '';

    /** Coordinates the toolbar dropdowns so only one (filter pill or column chooser)
     *  is open at a time. Openers emit themselves; others close when they see an
     *  owner that isn't them. */
    private readonly menuOpenedSubject = new Subject<unknown>();
    readonly menuOpened$ = this.menuOpenedSubject.asObservable();

    notifyMenuOpened(owner: unknown): void {
        this.menuOpenedSubject.next(owner);
    }

    private stateKey(): string {
        return `lt_${this.tableId}_table_state`;
    }

    private widthsKey(): string {
        return `lt_${this.tableId}_column_widths`;
    }

    private pageSizeKey(): string {
        return `lt_${this.tableId}_page_size`;
    }

    private treeVariantKey(): string {
        return `lt_${this.tableId}_tree_variant`;
    }

    /** Returns the saved tree layout ('card' | 'flat'), or `fallback` if none. */
    restoreTreeVariant(fallback: TreeVariant): TreeVariant {
        try {
            const raw = localStorage.getItem(this.treeVariantKey());
            return raw === 'card' || raw === 'flat' ? raw : fallback;
        } catch {
            return fallback;
        }
    }

    saveTreeVariant(variant: TreeVariant): void {
        try {
            localStorage.setItem(this.treeVariantKey(), variant);
        } catch {
            // ignore
        }
    }

    private static pageSizeKeyFor(tableId: string): string {
        return `lt_${tableId}_page_size`;
    }

    restorePageSize(fallback: number): number {
        return ListTableService.readPersistedPageSize(this.tableId, fallback);
    }

    savePageSize(size: number): void {
        try {
            localStorage.setItem(this.pageSizeKey(), String(size));
        } catch {
            // ignore
        }
    }

    /** Reads a table's remembered rows-per-page without an instance (for host pre-seeding). */
    static readPersistedPageSize(tableId: string, fallback: number): number {
        try {
            const raw = localStorage.getItem(ListTableService.pageSizeKeyFor(tableId));
            const n = raw ? parseInt(raw, 10) : NaN;
            return Number.isFinite(n) && n > 0 ? n : fallback;
        } catch {
            return fallback;
        }
    }

    /**
     * Returns a shallow-cloned copy of `columns` with any persisted width, visibility,
     * and order applied. Columns not present in the saved state keep their declared
     * position (appended after the saved ones).
     */
    /** Parses a stored JSON value, or null when missing/unavailable/malformed. */
    private readJson(key: string): any {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    /** Applies a widths map then a persisted order/visibility list onto a fresh copy of
     *  `columns`. Shared by the top-level and per-depth restore paths. */
    private mergePersistedColumns(columns: ListColumn[], widths: any, state: any[]): ListColumn[] {
        let cols: ListColumn[] = columns.map((c) => ({...c}));
        cols.forEach((c) => {
            if (widths[c.key] != null) {
                c.width = widths[c.key];
            }
        });
        if (state.length) {
            const ordered: ListColumn[] = [];
            state.forEach((s) => {
                const found = cols.find((c) => c.key === s.colId);
                if (found && !ordered.includes(found)) {
                    if (s.hide != null) {
                        found.hidden = s.hide;
                    }
                    if (s.width != null) {
                        found.width = s.width;
                    }
                    ordered.push(found);
                }
            });
            cols.forEach((c) => {
                if (!ordered.includes(c)) {
                    ordered.push(c);
                }
            });
            cols = ordered;
        }
        return cols;
    }

    /** Order + visibility + width entries for one set of columns. */
    private columnStateEntries(columns: ListColumn[]): any[] {
        return columns.map((c) => ({colId: c.key, hide: !!c.hidden, width: c.width}));
    }

    applyPersistedState(columns: ListColumn[]): ListColumn[] {
        const widths = this.readJson(this.widthsKey()) || {};
        const state = this.readJson(this.stateKey()) || [];
        return this.mergePersistedColumns(columns, widths, state);
    }

    /** Persists the current order + visibility (and widths embedded in each entry). */
    saveState(columns: ListColumn[]): void {
        try {
            localStorage.setItem(this.stateKey(), JSON.stringify(this.columnStateEntries(columns)));
        } catch {
            // ignore
        }
    }

    // ---- nested (per-depth) child columns: same contract as above, keyed by level ----
    private childStateKey(): string {
        return `lt_${this.tableId}_child_state`;
    }

    private childWidthsKey(): string {
        return `lt_${this.tableId}_child_widths`;
    }

    /** Applies persisted order/visibility/width for one nested depth to its columns. */
    applyPersistedChildState(level: number, columns: ListColumn[]): ListColumn[] {
        const widths = (this.readJson(this.childWidthsKey()) || {})[level] || {};
        const state = (this.readJson(this.childStateKey()) || {})[level] || [];
        return this.mergePersistedColumns(columns, widths, state);
    }

    saveChildState(level: number, columns: ListColumn[]): void {
        try {
            const byLevel = this.readJson(this.childStateKey()) || {};
            byLevel[level] = this.columnStateEntries(columns);
            localStorage.setItem(this.childStateKey(), JSON.stringify(byLevel));
        } catch {
            // ignore
        }
    }

    saveChildWidth(level: number, colId: string, width: number, columns: ListColumn[]): void {
        try {
            const byLevel = this.readJson(this.childWidthsKey()) || {};
            byLevel[level] = {...(byLevel[level] || {}), [colId]: width};
            localStorage.setItem(this.childWidthsKey(), JSON.stringify(byLevel));
        } catch {
            // ignore
        }
        this.saveChildState(level, columns);
    }

    /** Persists a single column's width, then rewrites the ordered state. */
    saveWidth(colId: string, width: number, columns: ListColumn[]): void {
        try {
            const raw = localStorage.getItem(this.widthsKey());
            const widths = raw ? JSON.parse(raw) : {};
            widths[colId] = width;
            localStorage.setItem(this.widthsKey(), JSON.stringify(widths));
        } catch {
            // ignore
        }
        this.saveState(columns);
    }

    /** Clears all persisted layout for this table ("Restore Default Table"). */
    reset(): void {
        try {
            localStorage.removeItem(this.stateKey());
            localStorage.removeItem(this.widthsKey());
            localStorage.removeItem(this.pageSizeKey());
            localStorage.removeItem(this.treeVariantKey());
            localStorage.removeItem(this.childStateKey());
            localStorage.removeItem(this.childWidthsKey());
        } catch {
            // ignore
        }
    }
}
