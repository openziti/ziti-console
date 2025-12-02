import {Component} from '@angular/core';
import {ICellRendererAngularComp} from 'ag-grid-angular';
import {ICellRendererParams} from 'ag-grid-community';
import _ from 'lodash';

@Component({
  selector: 'app-table-cell-select',
  templateUrl: './table-cell-select.component.html',
  styleUrls: ['./table-cell-select.component.scss'],
})
export class TableCellSelectComponent implements ICellRendererAngularComp {
  cellParams;
  item: any = {
    id: '',
    name: '',
    selected: false,
    hideSelect: false,
  };
  disableToggle = false;

  agInit(params: ICellRendererParams): void {
    this.cellParams = params;
    this.item = params.data;
    this.disableToggle =
      _.get(this.item, 'typeId') === 'Router' ||
      _.get(this.item, 'exclusiveTo') ||
      _.get(this.item, 'reserved') === true ||
      _.get(this.item, 'isSystem') === true;
  }

  refresh(params: ICellRendererParams): boolean {
    this.cellParams = params;
    this.item = params.data;
    this.disableToggle =
      _.get(this.item, 'typeId') === 'Router' ||
      _.get(this.item, 'exclusiveTo') ||
      _.get(this.item, 'reserved') === true ||
      _.get(this.item, 'isSystem') === true;
    return true;
  }

  toggle(item): void {
    if (!this.cellParams.toggleItem || this.disableToggle) {
      return;
    }
    this.cellParams.toggleItem(item, this.cellParams);
  }

  get tooltip() {
    let tooltip = '';
    if (this.item?.isSystem) {
      tooltip = 'Deleting "system" entities is not allowed';
    } else if (this.item?.typeId === 'Router') {
      tooltip = 'Unable to delete "Router" Identities. Please delete the associated Router instead.';
    }
    return tooltip;
  }
}
