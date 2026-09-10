import {Component, EventEmitter, Input, Output} from '@angular/core';

/**
 * A single row in a {@link ListMenuComponent}.
 *
 * `action` is the identifier the host dispatches on; `data` carries the original
 * domain object (menu item / header action / filter option) so the host can act
 * on it without the menu needing to know its shape.
 */
export interface ListMenuItem {
    /** Visible text. */
    label: string;
    /** Identifier emitted back to the host on click. */
    action: string;
    /** Optional icon class(es) rendered before the label. */
    icon?: string;
    /** When true the row is present but visually removed (keeps list order stable). */
    hidden?: boolean;
    /** When true the row is shown but not clickable. */
    disabled?: boolean;
    /** Optional element id (preserves existing automation hooks). */
    id?: string;
    /** Original domain object this row was built from. */
    data?: any;
}

/**
 * Generic, theme-driven action menu popover. Presentational only: the host owns
 * open state and position and handles `(itemClick)` / `(closed)`.
 */
@Component({
    selector: 'lib-list-menu',
    templateUrl: './list-menu.component.html',
    styleUrls: ['./list-menu.component.scss'],
    standalone: false,
})
export class ListMenuComponent {
    /** Whether the menu is rendered. */
    @Input() open = false;
    /** Rows to render. */
    @Input() items: ListMenuItem[] = [];
    /** Fixed-position left offset (px). */
    @Input() left = 0;
    /** Fixed-position top offset (px). */
    @Input() top = 0;
    /** Optional id for the menu container (automation hook). */
    @Input() menuId?: string;

    /** Emitted when a clickable row is selected. */
    @Output() itemClick = new EventEmitter<{item: ListMenuItem; event: MouseEvent}>();
    /** Emitted when the user clicks outside the open menu. */
    @Output() closed = new EventEmitter<Event>();

    onItem(item: ListMenuItem, event: MouseEvent): void {
        if (item.disabled) {
            return;
        }
        this.itemClick.emit({item, event});
    }

    onClickOutside(event: Event): void {
        this.closed.emit(event);
    }

    trackItem = (_: number, item: ListMenuItem): string => item.action ?? item.label;
}
