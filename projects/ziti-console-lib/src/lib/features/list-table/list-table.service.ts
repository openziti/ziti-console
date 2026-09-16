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
import {ListColumn} from './list-column';

/**
 * Per-instance state + localStorage persistence for {@link ListTableComponent}.
 * Reuses the legacy `ziti_<tableId>_table_state` / `_column_widths` keys so saved
 * layouts carry over; unknown (ag-only) fields are ignored.
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
        return `ziti_${this.tableId}_table_state`;
    }

    private widthsKey(): string {
        return `ziti_${this.tableId}_column_widths`;
    }

    /**
     * Returns a shallow-cloned copy of `columns` with any persisted width, visibility,
     * and order applied. Columns not present in the saved state keep their declared
     * position (appended after the saved ones).
     */
    applyPersistedState(columns: ListColumn[]): ListColumn[] {
        let cols: ListColumn[] = columns.map((c) => ({...c}));

        // widths
        try {
            const raw = localStorage.getItem(this.widthsKey());
            if (raw) {
                const widths = JSON.parse(raw) || {};
                cols.forEach((c) => {
                    if (widths[c.key] != null) {
                        c.width = widths[c.key];
                    }
                });
            }
        } catch {
            // ignore malformed / unavailable storage
        }

        // order + visibility
        try {
            const raw = localStorage.getItem(this.stateKey());
            if (raw) {
                const state: any[] = JSON.parse(raw) || [];
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
                if (ordered.length) {
                    cols = ordered;
                }
            }
        } catch {
            // ignore malformed / unavailable storage
        }

        return cols;
    }

    /** Persists the current order + visibility (and widths embedded in each entry). */
    saveState(columns: ListColumn[]): void {
        const state = columns.map((c) => ({colId: c.key, hide: !!c.hidden, width: c.width}));
        try {
            localStorage.setItem(this.stateKey(), JSON.stringify(state));
        } catch {
            // ignore
        }
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
        } catch {
            // ignore
        }
    }
}
