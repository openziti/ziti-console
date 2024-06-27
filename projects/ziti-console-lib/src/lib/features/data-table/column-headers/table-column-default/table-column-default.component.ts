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

import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {IHeaderAngularComp} from 'ag-grid-angular';
import {IHeaderParams} from 'ag-grid-community';
import _ from 'lodash';
import {Subscription} from "rxjs";
import {DataTableFilterService} from "../../data-table-filter.service";

@Component({
  selector: 'app-table-column-default',
  templateUrl: './table-column-default.component.html',
  styleUrls: ['./table-column-default.component.scss'],
})
export class TableColumnDefaultComponent implements IHeaderAngularComp, AfterViewInit, OnInit {
  item: {
    selected: boolean;
  };
  headerParams: any = {
    api: {},
  };
  headerName;
  enableSorting;
  sortDir;
  sortCol;
  columnObj;
  columnDef: any = {
    sortDir: undefined,
    colId: undefined,
    pinColumn: undefined,
    sortColumn: undefined,
  };
  filterType = 'TEXTINPUT';
  filterOptions = [];
  columnFilters: any = {};
  filtering = false;
  pinned;
  showFilter = false;
  comboActive = false;
  showSecondaryFilter = false;
  _showColumnMenu;

  onlineStatusFilter;
  showBubble = false;
  showLoader = false;
  private subscription = new Subscription();
  @ViewChild('menuButton') menuButton: ElementRef;

  constructor(private filterService: DataTableFilterService) {
    if (!this) {
      return;
    }
    this.item = {
      selected: false,
    };
  }

  _statusClass = 'v7Offline';

  get statusClass(): string {
    if (!this.showBubble) {
      return '';
    }
    const status = _.get(
      this.columnObj,
      'gridApi.columnFilters.hasApiSession',
      _.get(this.columnObj, 'gridApi.columnFilters.online')
    );
    switch (status) {
      case 'all':
        this._statusClass = 'v7OnlineOffline';
        break;
      case 'false':
        this._statusClass = 'v7Offline';
        break;
      case 'true':
        this._statusClass = 'v7Online';
        break;
      case 'provisioning':
        this._statusClass = '';
        this.showLoader = true;
        break;
      case 'error':
        this._statusClass = 'v7Error';
        break;
      default:
        this._statusClass = 'v7OnlineOffline';
        break;
    }
    return this._statusClass;
  }

  get filterApplied(): boolean {
    const columnId = _.get(this.columnDef, 'colId');
    const filterVal = _.get(this.headerParams, `api.columnFilters.${columnId}`);
    return !_.isEmpty(filterVal) || this.showFilter || this.filtering;
  }

  ngOnInit() {

  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe()
  }

  agInit(headerParams: any = {}): void {
    if (!headerParams) {
      return;
    }
    this.headerParams = headerParams;
    this.enableSorting = headerParams.enableSorting;
    this.headerName = headerParams.displayName;
    this.columnObj = headerParams.column;
    this.filterType = headerParams.filterType || 'TEXTINPUT';
    this.columnFilters = headerParams.columnFilters;
    this.columnDef = this.columnObj.colDef;
    this.pinned = this.columnObj.pinned === 'left';
    this.sortDir = this.columnDef.sortDir || 'none';
    this.onlineStatusFilter = _.has(this.columnFilters, 'hasApiSession') ? 'hasApiSession' : 'online';
    this.showBubble =
      this.columnDef.colId === 'name' &&
      (_.has(this.columnFilters, 'hasApiSession') || _.has(this.columnFilters, 'online'));
    this._showColumnMenu = headerParams.showColumnMenu;
    this.updateFilterOptions();
    headerParams.api.addEventListener('sortChanged', (event) => {
      const colId = _.get(event, 'columnDef.colId', '');
      if (colId !== this.columnDef.colId) {
        this.sortDir = undefined;
      } else {
        this.sortDir = _.get(event, 'sortDir');
      }
    });
    headerParams.api.addEventListener('columnEverythingChanged', (event) => {
      _.forEach(event.columnApi.columnModel.columnDefs, colDef => {
        if (this.columnDef.colId === colDef.colId && colDef.headerComponentParams?.filterOptions) {
          this.updateFilterOptions();
        }
      });
    });
  }

  ngAfterViewInit() {
    if (this.showBubble) {
      // this.updateStatusClass();
    }
  }

  pin(): void {
    this.columnDef.pinColumn(this.columnObj, this.pinned ? false : 'left');
    this.pinned = !this.pinned;
  }

  hide(): void {
    this.headerParams.api.zitiHideColumn(this.columnObj, false);
  }

  sort(event): void {
    if (!this.columnDef.sortable) {
      return;
    }
    const targetId = _.get(event, 'target.id');
    if (
      _.includes(
        [`HeaderStatus_${this.columnDef.colId}`, 'SearchFilter', `HeaderFilterIcon_${this.columnDef.colId}`],
        targetId
      )
    ) {
      return;
    }
    if (_.isEmpty(this.sortDir)) {
      this.sortDir = 'asc';
    } else if (this.sortDir === 'asc') {
      this.sortDir = 'desc';
    } else {
      this.sortDir = 'asc';
    }
    _.set(this.headerParams, 'api.sortDir', this.sortDir);
    _.set(this.headerParams, 'api.sortDir', this.columnDef.colId);
    if (this.columnDef.sortColumn) {
      this.columnDef.sortColumn(this.columnDef.colId, this.sortDir, this.headerParams.api);
      this.headerParams.api.dispatchEvent({
        type: 'sortChanged',
        columnDef: this.columnDef,
        sortDir: this.sortDir,
      });
    }
  }

  toggleFilter(event) {
    this.showFilter = !this.showFilter;
    if (this.filterType === 'SELECT' || this.filterType === 'COMBO' || this.filterType === 'DATETIME'|| this.filterType === 'ATTRIBUTE') {
      if (this.showFilter) {
        this.updateFilterOptions();
        _.invoke(this.headerParams, 'api.openHeaderFilter', event, this.filterOptions, this.filterType, this.columnDef?.colId, this.headerName, this.columnDef?.headerComponentParams);
      } else {
        _.invoke(this.headerParams, 'api.closeHeaderFilter', event);
      }
    } else if (this.filterType === 'CUSTOM') {
      if (this.showFilter) {
        this.updateFilterOptions();
        _.invoke(this.headerParams, 'column.colDef.headerComponentParams.openHeaderFilter', event, this.filterOptions);
      } else {
        _.invoke(this.headerParams, 'column.colDef.headerComponentParams.closeHeaderFilter', event);
      }
    }
  }

  toggleSecondaryFilter(event) {
    this.showSecondaryFilter = !this.showSecondaryFilter;
    if (this.showSecondaryFilter) {
      const options = [
        {
          label: 'Any',
          columnId: this.onlineStatusFilter,
          filterName: 'Status',
          value: undefined,
          bubbleClass: 'v7OnlineOffline',
        },
        {
          label: 'Online',
          columnId: this.onlineStatusFilter,
          filterName: 'Status',
          value: 'true',
          bubbleClass: 'v7Online',
        },
        {
          label: 'Offline',
          columnId: this.onlineStatusFilter,
          filterName: 'Status',
          value: 'false',
          bubbleClass: 'v7Offline',
        },
      ];
      _.invoke(this.headerParams, 'api.openHeaderFilter', event, options);
    } else {
      _.invoke(this.headerParams, 'api.closeHeaderFilter', event);
    }
  }

  hideFilter(event) {
    const targetId = _.get(event, 'target.id');
    if (
      _.includes(
        [`HeaderFilterButton_${this.columnDef.colId}`, `HeaderFilterIcon_${this.columnDef.colId}`],
        targetId
      )
    ) {
      return;
    } else if (targetId === this.columnDef?.colId && this.filterType === 'COMBO') {
      return;
    }
    _.invoke(this.headerParams, 'api.closeHeaderFilter', event);

    this.comboActive = false;
    this.showFilter = false;
    this.showSecondaryFilter = false;
  }

  refresh(params: IHeaderParams): boolean {
    return true;
  }

  openGridMenu(): void {
    if (!this._showColumnMenu) {
      return;
    }
    this._showColumnMenu(this.menuButton.nativeElement);
  }

  updateFilterOptions() {
    let options = [];
    if (this.headerParams.getFilterOptions) {
      options = this.headerParams.getFilterOptions();
    } else {
      options = this.headerParams.filterOptions;
    }
    this.filterOptions = _.map(options, (option) => {
      option.columnId = this.columnDef.colId;
      option.filterName = this.headerName;
      option.type = this.filterType;
      return option;
    });
  }
}
