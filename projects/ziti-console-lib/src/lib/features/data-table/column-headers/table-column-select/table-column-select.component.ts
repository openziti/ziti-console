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

import {Component, ElementRef, ViewChild} from '@angular/core';
import {IHeaderAngularComp} from 'ag-grid-angular';
import {IHeaderParams} from 'ag-grid-community';

@Component({
  selector: 'app-table-column-select',
  templateUrl: './table-column-select.component.html',
  styleUrls: ['./table-column-select.component.scss'],
})
export class TableColumnSelectComponent implements IHeaderAngularComp {
  headerParams: any;
  gridApi: any = {
    zitiAllToggled: undefined,
  };

  @ViewChild('toggleButton') toggleButton: ElementRef;

  agInit(headerParams: IHeaderParams): void {
    this.headerParams = headerParams;
    this.gridApi = headerParams.api;
  }

  refresh(params: IHeaderParams): boolean {
    return true;
  }

  toggleAll(): void {
    this.gridApi.zitiAllToggled = !this.gridApi.zitiAllToggled;
    if (this.headerParams.toggleAll) {
      this.headerParams.toggleAll(this.gridApi.zitiAllToggled, this.headerParams);
    }
  }
}
