import {Component, Input} from '@angular/core';
import _ from 'lodash';

/**
 * Row selection toggle for {@link ListTableComponent}. Router / exclusive /
 * reserved / system rows cannot be toggled.
 */
@Component({
    selector: 'lib-select-cell',
    templateUrl: './select-cell.component.html',
    styleUrls: ['./select-cell.component.scss'],
    standalone: false,
})
export class SelectCellComponent {
    item: any = {
        id: '',
        name: '',
        selected: false,
        hideSelect: false,
    };
    disableToggle = false;

    @Input() set row(v: any) {
        this.item = v || this.item;
        this.disableToggle =
            _.get(this.item, 'typeId') === 'Router' ||
            _.get(this.item, 'exclusiveTo') ||
            _.get(this.item, 'reserved') === true ||
            _.get(this.item, 'isSystem') === true;
    }

    /** Host callback invoked with the row when a selectable row is toggled. */
    @Input() toggleItem: ((item: any) => void) | undefined;

    toggle(item: any): void {
        if (this.disableToggle || !this.toggleItem) {
            return;
        }
        this.toggleItem(item);
    }

    get tooltip(): string {
        let tooltip = '';
        if (this.item?.isSystem) {
            tooltip = 'Deleting "system" entities is not allowed';
        } else if (this.item?.typeId === 'Router') {
            tooltip = 'Unable to delete "Router" Identities. Please delete the associated Router instead.';
        }
        return tooltip;
    }
}
