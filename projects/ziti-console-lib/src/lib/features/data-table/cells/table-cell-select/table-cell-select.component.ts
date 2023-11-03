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
  item = {
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
      _.get(this.item, 'reserved') === true;
  }

  refresh(params: ICellRendererParams): boolean {
    this.cellParams = params;
    this.item = params.data;
    this.disableToggle =
      _.get(this.item, 'typeId') === 'Router' ||
      _.get(this.item, 'exclusiveTo') ||
      _.get(this.item, 'reserved') === true;
    return true;
  }

  toggle(item): void {
    if (!this.cellParams.toggleItem || this.disableToggle) {
      return;
    }
    this.cellParams.toggleItem(item, this.cellParams);
  }
}
