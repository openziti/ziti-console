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

import {ListCellContext, ListColumn} from './list-column';
import {HoverActionsCellComponent, ListActionButtonSpec} from './hover-actions-cell/hover-actions-cell.component';
import {enforceMinColumnWidths, isMenuItemHidden, listActionButtons, menuActionIcons, withHoverActions} from './list-actions';

interface Row {
    id: string;
    name: string;
    actionList?: string[];
    open?: boolean;
}

/** A cell context over `row`, with a spy for the table's action channel. */
function context(row: Row): ListCellContext<Row> & {emitAction: jasmine.Spy} {
    return {row, value: undefined, colId: 'name', rowIndex: 0, emitAction: jasmine.createSpy('emitAction')};
}

describe('list-actions helpers', () => {
    describe('isMenuItemHidden', () => {
        const row: Row = {id: 'a', name: 'edge-01', actionList: ['edit', 'delete']};

        it('asks a function `hidden` per row', () => {
            expect(isMenuItemHidden({action: 'edit', hidden: (r) => r.open === true}, {...row, open: true})).toBe(true);
            expect(isMenuItemHidden({action: 'edit', hidden: (r) => r.open === true}, {...row, open: false})).toBe(false);
        });

        it('takes a boolean `hidden` outright', () => {
            expect(isMenuItemHidden({action: 'edit', hidden: true}, row)).toBe(true);
            expect(isMenuItemHidden({action: 'edit', hidden: false}, row)).toBe(false);
        });

        it('otherwise shows the action only when the row lists it', () => {
            expect(isMenuItemHidden({action: 'edit'}, row)).toBe(false);
            expect(isMenuItemHidden({action: 'reissue'}, row)).toBe(true);
            expect(isMenuItemHidden({action: 'edit'}, {id: 'b', name: 'x'})).toBe(true);
        });
    });

    describe('listActionButtons', () => {
        const menuItems = [
            {name: 'Edit', action: 'edit'},
            {label: 'Reissue', action: 'reissue'},
            {name: 'Delete', action: 'delete'},
        ];
        const buttons: ListActionButtonSpec[] = [
            {action: 'edit', icon: 'icon-edit'},
            {action: 'reissue', icon: 'icon-refresh'},
            {action: 'delete', icon: 'icon-trash', danger: true},
        ];

        it('labels each button from its menu item, reading `name` or `label`', () => {
            const row: Row = {id: 'a', name: 'x', actionList: ['edit', 'reissue', 'delete']};
            expect(listActionButtons(menuItems, buttons, row).map((b) => [b.action, b.label])).toEqual([
                ['edit', 'Edit'],
                ['reissue', 'Reissue'],
                ['delete', 'Delete'],
            ]);
        });

        it('drops a button whose menu item the row hides', () => {
            const row: Row = {id: 'a', name: 'x', actionList: ['edit']};
            expect(listActionButtons(menuItems, buttons, row).map((b) => b.action)).toEqual(['edit']);
        });

        it('skips a button that has no matching menu item', () => {
            const row: Row = {id: 'a', name: 'x', actionList: ['ghost']};
            expect(listActionButtons(menuItems, [{action: 'ghost'}], row)).toEqual([]);
        });

        it('keeps a button with a disabledTitle on a hidden action, disabled, so it can say why', () => {
            const row: Row = {id: 'a', name: 'x', actionList: ['edit']};
            const withTitle: ListActionButtonSpec[] = [{action: 'delete', disabledTitle: 'In use'}];
            const result = listActionButtons(menuItems, withTitle, row);
            expect(result.length).toBe(1);
            expect(result[0].label).toBe('Delete');
            expect(result[0].disabled?.()).toBe(true);
        });
    });

    describe('menuActionIcons', () => {
        const menuItems = [
            {name: 'Edit', action: 'edit', icon: '<svg id="pen"></svg>'},
            {name: 'Delete', action: 'delete', icon: '<svg id="trash"></svg>'},
        ];

        it('reuses each menu item glyph and carries the danger flag, in spec order', () => {
            expect(menuActionIcons(menuItems, [{action: 'delete', danger: true}, {action: 'edit'}])).toEqual([
                {action: 'delete', iconSvg: '<svg id="trash"></svg>', danger: true},
                {action: 'edit', iconSvg: '<svg id="pen"></svg>', danger: undefined},
            ]);
        });

        it('leaves the glyph undefined when no menu item matches the action', () => {
            expect(menuActionIcons(menuItems, [{action: 'ghost'}])).toEqual([{action: 'ghost', iconSvg: undefined, danger: undefined}]);
        });
    });

    describe('withHoverActions', () => {
        const base: ListColumn<Row> = {key: 'name', label: 'Name', sortable: true};
        const config = {
            menuItems: [
                {name: 'Edit', action: 'edit'},
                {name: 'Delete', action: 'delete'},
            ],
            buttons: () => [
                {action: 'edit', icon: 'icon-edit'},
                {action: 'delete', icon: 'icon-trash', danger: true},
            ],
            text: (row: Row) => row.name,
            subtext: (row: Row) => row.id,
            cellId: (row: Row) => `EdgeActions_${row.id}`,
        };

        it('keeps the original column and swaps in the hover cell', () => {
            const column = withHoverActions(base, config);
            expect(column.key).toBe('name');
            expect(column.label).toBe('Name');
            expect(column.sortable).toBe(true);
            expect(column.cell).toBe(HoverActionsCellComponent);
        });

        it('maps the row to the cell inputs, with buttons filtered by the menu rules', () => {
            const column = withHoverActions(base, config);
            const row: Row = {id: 'a', name: 'edge-01', actionList: ['edit']};
            const inputs: any = column.cellInputs!(context(row));
            expect(inputs.text).toBe('edge-01');
            expect(inputs.subtext).toBe('a');
            expect(inputs.cellId).toBe('EdgeActions_a');
            expect(inputs.buttons.map((b: any) => b.action)).toEqual(['edit']);
        });

        it('defaults an action to the table emitAction, with the row', () => {
            const column = withHoverActions(base, config);
            const ctx = context({id: 'a', name: 'edge-01', actionList: ['edit', 'delete']});
            (column.cellInputs!(ctx) as any).run('delete');
            expect(ctx.emitAction).toHaveBeenCalledWith('delete', ctx.row);
        });

        it('routes an action through a `run` override instead, with the row', () => {
            const run = jasmine.createSpy('run');
            const column = withHoverActions(base, {...config, run});
            const ctx = context({id: 'a', name: 'edge-01', actionList: ['edit']});
            (column.cellInputs!(ctx) as any).run('edit');
            expect(run).toHaveBeenCalledWith('edit', ctx.row);
            expect(ctx.emitAction).not.toHaveBeenCalled();
        });

        it('passes empty strings when html and subtext are not configured, and the reserve flag through', () => {
            const column = withHoverActions(base, {...config, subtext: undefined, reserve: true});
            const inputs: any = column.cellInputs!(context({id: 'a', name: 'edge-01'}));
            expect([inputs.html, inputs.subtext, inputs.reserve]).toEqual(['', '', true]);
        });
    });

    describe('enforceMinColumnWidths', () => {
        const widthsKey = 'lt_t1_column_widths';
        const stateKey = 'lt_t1_table_state';
        const columns: ListColumn[] = [
            {key: 'name', label: 'Name', minWidth: 250},
            {key: 'status', label: 'Status', minWidth: 220},
            {key: 'created', label: 'Created'},
        ];

        beforeEach(() => localStorage.clear());
        afterEach(() => localStorage.clear());

        it('raises a saved width below its column minimum, in the widths map', () => {
            localStorage.setItem(widthsKey, JSON.stringify({name: 200, status: 220, created: 100}));
            enforceMinColumnWidths('t1', columns);
            expect(JSON.parse(localStorage.getItem(widthsKey)!)).toEqual({name: 250, status: 220, created: 100});
        });

        it('raises a saved width below its minimum, in the table-state entries', () => {
            localStorage.setItem(
                stateKey,
                JSON.stringify([
                    {colId: 'name', width: 180},
                    {colId: 'status', width: 300},
                    {colId: 'created', width: 100},
                ])
            );
            enforceMinColumnWidths('t1', columns);
            expect(JSON.parse(localStorage.getItem(stateKey)!)).toEqual([
                {colId: 'name', width: 250},
                {colId: 'status', width: 300},
                {colId: 'created', width: 100},
            ]);
        });

        it('does nothing when no column carries a minimum', () => {
            localStorage.setItem(widthsKey, JSON.stringify({name: 10}));
            enforceMinColumnWidths('t1', [{key: 'name', label: 'Name'}]);
            expect(JSON.parse(localStorage.getItem(widthsKey)!)).toEqual({name: 10});
        });

        it('does not throw on missing or malformed storage', () => {
            localStorage.setItem(widthsKey, 'not json');
            expect(() => enforceMinColumnWidths('t1', columns)).not.toThrow();
        });
    });
});
