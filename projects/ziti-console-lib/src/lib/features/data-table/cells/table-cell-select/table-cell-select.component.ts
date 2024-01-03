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
