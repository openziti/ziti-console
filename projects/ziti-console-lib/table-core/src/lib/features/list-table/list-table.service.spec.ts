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

import {ListColumn} from './list-column';
import {ListTableService} from './list-table.service';

/**
 * The service owns the table's per-instance localStorage persistence (column order/visibility/width,
 * page size, tree variant). These are long-standing behaviors; the tests pin the `lt_<tableId>_*`
 * namespacing, the input validation, and the "never throw on bad storage" contract.
 */
describe('ListTableService', () => {
    let svc: ListTableService;

    const cols: ListColumn[] = [
        {key: 'name', label: 'Name', width: 100},
        {key: 'type', label: 'Type'},
        {key: 'created', label: 'Created'},
    ];

    beforeEach(() => {
        localStorage.clear();
        svc = new ListTableService();
        svc.tableId = 'things';
    });

    afterEach(() => localStorage.clear());

    describe('page size', () => {
        it('persists under a tableId-namespaced key', () => {
            svc.savePageSize(25);
            expect(localStorage.getItem('lt_things_page_size')).toBe('25');
        });

        it('restores the saved value', () => {
            svc.savePageSize(25);
            expect(svc.restorePageSize(50)).toBe(25);
        });

        it('falls back when nothing is saved', () => {
            expect(svc.restorePageSize(50)).toBe(50);
        });

        it('rejects non-positive / non-numeric stored values and uses the fallback', () => {
            localStorage.setItem('lt_things_page_size', '0');
            expect(svc.restorePageSize(50)).toBe(50);
            localStorage.setItem('lt_things_page_size', 'abc');
            expect(svc.restorePageSize(50)).toBe(50);
        });

        it('exposes a static reader that does not need an instance', () => {
            svc.savePageSize(10);
            expect(ListTableService.readPersistedPageSize('things', 50)).toBe(10);
            expect(ListTableService.readPersistedPageSize('other', 50)).toBe(50);
        });
    });

    describe('tree variant', () => {
        it('round-trips a valid variant', () => {
            svc.saveTreeVariant('flat');
            expect(svc.restoreTreeVariant('card')).toBe('flat');
        });

        it('ignores an unexpected stored value and returns the fallback', () => {
            localStorage.setItem('lt_things_tree_variant', 'bogus');
            expect(svc.restoreTreeVariant('card')).toBe('card');
        });
    });

    describe('column state', () => {
        it('returns the declared columns when nothing is persisted', () => {
            const out = svc.applyPersistedState(cols);
            expect(out.map((c) => c.key)).toEqual(['name', 'type', 'created']);
        });

        it('does not mutate the input columns', () => {
            svc.saveWidth('name', 200, cols);
            svc.saveState([{...cols[1]}, {...cols[0], hidden: true}, {...cols[2]}]);
            const out = svc.applyPersistedState(cols);
            expect(out).not.toBe(cols);
            expect(cols[0].width).toBe(100); // original untouched
            expect(cols[0].hidden).toBeUndefined();
        });

        it('restores saved order, visibility and width', () => {
            // persist an order of type, name(hidden, width 200), created
            svc.saveWidth('name', 200, cols);
            svc.saveState([
                {...cols[1]},
                {...cols[0], hidden: true, width: 200},
                {...cols[2]},
            ]);
            const out = svc.applyPersistedState(cols);
            expect(out.map((c) => c.key)).toEqual(['type', 'name', 'created']);
            const name = out.find((c) => c.key === 'name')!;
            expect(name.hidden).toBeTrue();
            expect(name.width).toBe(200);
        });

        it('appends columns absent from the saved state after the saved ones', () => {
            // saved state only knows about "created" and "name"; "type" is new since
            svc.saveState([cols[2], cols[0]]); // persisted order: created, name
            const out = svc.applyPersistedState(cols);
            expect(out.map((c) => c.key)).toEqual(['created', 'name', 'type']);
        });
    });

    describe('reset', () => {
        it('clears every persisted key for the table', () => {
            svc.savePageSize(25);
            svc.saveTreeVariant('flat');
            svc.saveState(cols);
            svc.saveWidth('name', 200, cols);
            svc.reset();
            expect(localStorage.getItem('lt_things_page_size')).toBeNull();
            expect(localStorage.getItem('lt_things_tree_variant')).toBeNull();
            expect(localStorage.getItem('lt_things_table_state')).toBeNull();
            expect(localStorage.getItem('lt_things_column_widths')).toBeNull();
        });
    });

    describe('resilience to unavailable storage', () => {
        it('returns the fallback instead of throwing when reads fail', () => {
            spyOn(localStorage, 'getItem').and.throwError('blocked');
            expect(svc.restorePageSize(50)).toBe(50);
            expect(svc.restoreTreeVariant('card')).toBe('card');
            expect(() => svc.applyPersistedState(cols)).not.toThrow();
        });

        it('swallows write failures', () => {
            spyOn(localStorage, 'setItem').and.throwError('blocked');
            expect(() => svc.savePageSize(25)).not.toThrow();
            expect(() => svc.saveState(cols)).not.toThrow();
            expect(() => svc.saveTreeVariant('flat')).not.toThrow();
        });
    });

    describe('menu coordination', () => {
        it('notifies subscribers which opener took over', () => {
            const owner = {};
            const seen: unknown[] = [];
            svc.menuOpened$.subscribe((o) => seen.push(o));
            svc.notifyMenuOpened(owner);
            expect(seen).toEqual([owner]);
        });
    });
});
