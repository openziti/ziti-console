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

import {Component} from '@angular/core';
import {ICellRendererAngularComp} from 'ag-grid-angular';
import {ICellRendererParams} from 'ag-grid-community';
import _ from 'lodash';

@Component({
  selector: 'app-table-cell-menu',
  templateUrl: './table-cell-menu.component.html',
  styleUrls: ['./table-cell-menu.component.scss'],
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
