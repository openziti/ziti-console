import {Component} from '@angular/core';
import {ICellRendererAngularComp} from 'ag-grid-angular';
import {ICellRendererParams} from 'ag-grid-community';
import _ from 'lodash';

@Component({
    selector: 'app-table-cell-menu',
    templateUrl: './table-cell-menu.component.html',
    styleUrls: ['./table-cell-menu.component.scss'],
    standalone: false
})
export class TableCellMenuComponent implements ICellRendererAngularComp {
  item: any = {
    selected: false,
    id: '',
    name: '',
    actionList: [],
  };
  cellParams;
  open = false;

  get enableCellMenu(): boolean {
    return !(!this.item || !this.item.actionList || this.item.actionList.length === 0);

  }

  agInit(cellParams: ICellRendererParams): void {
    this.cellParams = cellParams;
    this.item = _.get(cellParams, 'data');
  }

  refresh(cellParams: ICellRendererParams): boolean {
    this.cellParams = cellParams;
    this.item = _.get(cellParams, 'data');
    return true;
  }

  toggleMenu(event): void {
    if (!this.cellParams.openMenu) {
      return;
    }
    _.defer(() => {
      this.cellParams.openMenu(event, this.item);
    });
  }

  closeActionMenu(event): void {
    this.cellParams.closeMenu(event);
  }
}
