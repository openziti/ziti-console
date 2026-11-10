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

import {Component, HostBinding, Input} from '@angular/core';
import {CommonModule} from '@angular/common';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';

/**
 * One action button, as a page describes it for one row. The label comes from the row-menu item of
 * the same action, so a button and its menu entry always read the same word.
 */
export interface ListActionButtonSpec {
    action: string;
    /** Icon-font class(es) drawn in the button, like the row-menu items use. */
    icon?: string;
    /** Inline SVG markup drawn in place of `icon` (takes precedence), for a glyph not in the icon font. */
    iconSvg?: string;
    /** What a screen reader hears. Defaults to the label; give the row's name where several rows show the same button. */
    ariaLabel?: string;
    /** The button's id, for specs and e2e selectors. Defaults to the cell id and the action. */
    id?: string;
    /** A destructive action, such as Delete: the icon turns red on hover. */
    danger?: boolean;
    /** True while the action is running: the button shows a spinner and disables. */
    busy?: () => boolean;
    /** The title shown while busy, such as `Deleting...`. */
    busyTitle?: string;
    /** True where the action cannot run yet: the button disables and its title says why. */
    disabled?: () => boolean;
    /** Keeps the button, disabled, on a row whose menu hides the action, so it can still say why. */
    disabledTitle?: string;
}

/** One button as the cell draws it: a spec plus the label resolved from its menu item. */
export interface ListActionButton extends ListActionButtonSpec {
    label: string;
}

/**
 * A list-table cell that shows a text cut by an ellipsis, with the row's quick actions as icon buttons at its
 * right end. The icons are out of the flow at rest, so the text has the full width; on row hover or cell focus
 * they join the flow and the text ends in an ellipsis before them. On a screen with no hover, or with `reserve`
 * set, they keep their own space after the text at all times.
 *
 * A column opts into this cell through `withHoverActions`, which also drops the row's menu entries into the
 * buttons by the same rules the row menu uses, so a page can retire its Actions column.
 */
@Component({
    selector: 'lib-hover-actions-cell',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './hover-actions-cell.component.html',
    styleUrls: ['./hover-actions-cell.component.scss'],
})
export class HoverActionsCellComponent {
    /** The cell's text, such as the row's name. Its `title` keeps it whole where the ellipsis cuts it. */
    @Input() text = '';
    /** Markup in place of `text`, for a cell that draws flags or extra lines. The page escapes the values in it. */
    @Input() html = '';
    /** Markup shown just before the text, such as status dots, kept out of the ellipsis. The page escapes the values in it. */
    @Input() statusHtml = '';
    /** A second line under the text, such as an id. It is cut by an ellipsis too. */
    @Input() subtext = '';
    /** The buttons the row shows, already filtered to the row's state by `listActionButtons`. */
    @Input() buttons: ListActionButton[] = [];
    /** The prefix of each button's default id, for specs and e2e selectors. */
    @Input() cellId = '';
    /** Runs an action. `withHoverActions` wires this to the page's `run` callback, or to the table's `emitAction`. */
    @Input() run: (action: string) => void = () => undefined;
    /** Keeps the icons' space after the text at all times, for a value whose end must never be covered. */
    @HostBinding('class.lt-hover--reserve') @Input() reserve = false;

    private sanitizerCache = new Map<string, SafeHtml>();

    constructor(private sanitizer: DomSanitizer) {}

    /** Trust developer-authored markup (`html`, a button's `iconSvg`), memoized so the same string yields the
     *  same SafeHtml and the binding does not re-render every change-detection cycle. */
    safe(markup?: string): SafeHtml | null {
        if (!markup) {
            return null;
        }
        let safe = this.sanitizerCache.get(markup);
        if (!safe) {
            safe = this.sanitizer.bypassSecurityTrustHtml(markup);
            this.sanitizerCache.set(markup, safe);
        }
        return safe;
    }

    isBusy(button: ListActionButton): boolean {
        return button.busy?.() ?? false;
    }

    isDisabled(button: ListActionButton): boolean {
        return button.disabled?.() ?? false;
    }

    /** The button's hover title: what it is doing while busy, why it cannot run while disabled, else its label. */
    titleOf(button: ListActionButton): string {
        if (this.isBusy(button)) {
            return button.busyTitle || 'Working...';
        }
        if (this.isDisabled(button)) {
            return button.disabledTitle || button.label;
        }
        return button.label;
    }

    buttonId(button: ListActionButton): string {
        return button.id || `${this.cellId}_${button.action}`;
    }
}
