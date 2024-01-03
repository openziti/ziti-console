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
import {IHeaderAngularComp} from 'ag-grid-angular';
import {IHeaderParams} from 'ag-grid-community';
import _ from 'lodash';

@Component({
  selector: 'app-table-column-menu',
  templateUrl: './table-column-menu.component.html',
  styleUrls: ['./table-column-menu.component.scss'],
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
