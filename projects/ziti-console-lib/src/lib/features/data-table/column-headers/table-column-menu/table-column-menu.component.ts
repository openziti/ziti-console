import {Component} from '@angular/core';
import {IHeaderAngularComp} from 'ag-grid-angular';
import {IHeaderParams} from 'ag-grid-community';
import _ from 'lodash';

@Component({
    selector: 'app-table-column-menu',
    templateUrl: './table-column-menu.component.html',
    styleUrls: ['./table-column-menu.component.scss'],
    standalone: false
})
export class TableColumnMenuComponent implements IHeaderAngularComp {
  item = {
    selected: false,
    id: '',
    actionList: [],
  };
  headerParams;
  open = false;

  agInit(headerParams: IHeaderParams): void {
    this.headerParams = headerParams;
    this.item = _.get(headerParams, 'data');
  }

  refresh(headerParams: IHeaderParams): boolean {
    this.headerParams = headerParams;
    return true;
  }

  toggleMenu(event): void {
    _.defer(() => {
      this.headerParams.openHeaderMenu(event);
    });
  }

  closeActionMenu(event): void {
    this.headerParams.closeMenu(event);
  }
}
