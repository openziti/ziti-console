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
import {HoverActionsCellComponent, ListActionButton, ListActionButtonSpec} from './hover-actions-cell/hover-actions-cell.component';

/**
 * A row-menu item, as far as these helpers read it to decide whether a row shows an action. It matches the
 * shape the list table reads for its own menu: a page may write `name` or `label`, and `hidden` may be a flag
 * or a per-row test.
 */
export interface ListActionMenuItem<T> {
    label?: string;
    name?: string;
    action: string;
    hidden?: boolean | ((row: T) => boolean);
}

/** The word a menu item shows: its `label`, or the `name` the row-menu pages write. */
function menuItemLabel<T>(item: ListActionMenuItem<T>): string {
    return item.label ?? item.name ?? '';
}

/**
 * Whether the table hides `item` for `row`, by the same rule the list table uses for its row menu: a function
 * `hidden` decides per row, a boolean `hidden` decides outright, else the row shows the action only when its
 * `actionList` includes it.
 */
export function isMenuItemHidden<T>(item: ListActionMenuItem<T>, row: T & {actionList?: string[]}): boolean {
    if (typeof item.hidden === 'function') {
        return item.hidden(row);
    }
    if (typeof item.hidden === 'boolean') {
        return item.hidden;
    }
    return !row.actionList?.includes(item.action);
}

/**
 * The buttons `row` shows: each button whose menu item the row shows, so the buttons and the menu always agree.
 * A button with a `disabledTitle` stays, disabled, where the menu hides its action, so it can say why instead of
 * vanishing. Each button takes its label from the matching menu item.
 */
export function listActionButtons<T>(
    menuItems: ReadonlyArray<ListActionMenuItem<T>>,
    buttons: ReadonlyArray<ListActionButtonSpec>,
    row: T & {actionList?: string[]}
): ListActionButton[] {
    const result: ListActionButton[] = [];
    buttons.forEach((button) => {
        const item = menuItems.find((entry) => entry.action === button.action);
        if (!item) {
            return;
        }
        if (!isMenuItemHidden(item, row)) {
            result.push({...button, label: menuItemLabel(item)});
        } else if (button.disabledTitle) {
            result.push({...button, label: menuItemLabel(item), disabled: () => true});
        }
    });
    return result;
}

/** One Name-cell action icon: the row action to run, and whether it reads as destructive. */
export interface MenuActionIcon {
    action: string;
    danger?: boolean;
}

/**
 * Builds icon specs for `specs` from the page's row-menu items, so each icon reuses that action's menu
 * glyph. `specs` lists the actions to surface, in order; {@link listActionButtons} still filters per row.
 */
export function menuActionIcons(
    menuItems: ReadonlyArray<{action: string; icon?: string}>,
    specs: ReadonlyArray<MenuActionIcon>
): ListActionButtonSpec[] {
    return specs.map(({action, danger}) => ({
        action,
        iconSvg: menuItems.find((item) => item.action === action)?.icon,
        danger,
    }));
}

/** How a page fills a column with hover actions. `text` is what the cell shows, such as the row's name. */
export interface HoverActionsCellConfig<T> {
    /** The row menu the buttons follow. A button shows only where its menu item would. */
    menuItems: ReadonlyArray<ListActionMenuItem<T>>;
    /** The action buttons a row may show, before the menu rules filter them. Per row, so a button can follow the row's state. */
    buttons: (row: T) => ReadonlyArray<ListActionButtonSpec>;
    /** The cell's text, such as the row's name. */
    text: (row: T) => string;
    /** The prefix of each button's default id on the row. */
    cellId: (row: T) => string;
    /** Runs an action for a row. When omitted, the action goes through the table's `emitAction`, like the row menu. */
    run?: (action: string, row: T) => void;
    /** The detail-route URL for the text, so the name is a link. Omit to leave it plain text. */
    href?: (row: T) => string;
    /** Markup just before the text, such as status dots, kept out of the ellipsis. The page escapes the values in it. */
    statusHtml?: (row: T) => string;
    /** Markup in place of the text, such as a status with flags. The page escapes the values in it. */
    html?: (row: T) => string;
    /** A second line under the text, such as an id. */
    subtext?: (row: T) => string;
    /** Keeps the icons' space after the text at all times, for a value whose end must never be covered. */
    reserve?: boolean;
}

/**
 * The `cell` and `cellInputs` for a column that shows its row actions as hover icons. Spread it into the column:
 * `{ key: 'name', ..., ...hoverActionsCell({menuItems, text, cellId, buttons}), onCellClick, ... }`. The buttons
 * follow the same row-menu rules as {@link listActionButtons}.
 */
export function hoverActionsCell<T>(config: HoverActionsCellConfig<T>): Pick<ListColumn<T>, 'cell' | 'cellInputs'> {
    return {
        cell: HoverActionsCellComponent,
        cellInputs: (ctx: ListCellContext<T>) => ({
            text: config.text(ctx.row),
            href: config.href?.(ctx.row) ?? '',
            statusHtml: config.statusHtml?.(ctx.row) ?? '',
            subtext: config.subtext?.(ctx.row) ?? '',
            html: config.html?.(ctx.row) ?? '',
            reserve: config.reserve ?? false,
            buttons: listActionButtons(config.menuItems, config.buttons(ctx.row), ctx.row as T & {actionList?: string[]}),
            cellId: config.cellId(ctx.row),
            run: (action: string) => (config.run ? config.run(action, ctx.row) : ctx.emitAction(action, ctx.row)),
        }),
    };
}
