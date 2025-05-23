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

import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';

// Import the resized event model
import $ from 'jquery';
import _ from 'lodash';
import moment from 'moment'

import {TableColumnDefaultComponent} from "./column-headers/table-column-default/table-column-default.component";
import {TableColumnSelectComponent} from "./column-headers/table-column-select/table-column-select.component";
import {TableColumnMenuComponent} from "./column-headers/table-column-menu/table-column-menu.component";
import {TableCellSelectComponent} from "./cells/table-cell-select/table-cell-select.component";
import {TableCellMenuComponent} from "./cells/table-cell-menu/table-cell-menu.component";
import {DataTableService} from "./data-table.service";
import {TableCellTokenComponent} from "./cells/table-cell-token/table-cell-token.component";
import {DataTableFilterService, FilterObj} from "./data-table-filter.service";
import {Subscription} from "rxjs";

@Component({
  selector: 'lib-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
})
export class DataTableComponent implements OnChanges, OnInit {
  @Input() rowData: any;
  @Input() expandRowData: any;
  @Input() collapseRowData: any;
  @Input() rowValidation: any;
  // @Input() columnFilters: any;
  @Input() isTimeSearchAvailable: boolean;
  @Input() isLoading: any;
  @Input() set tableId( id: string) {
    this.svc.tableId = id;
    this.updateEntityTypeLabel()
  }
  @Input() options = {noSelect: false, noMenu: false};
  @Input() validateService: any;
  @Input() rowsToggled: any;
  @Input() tableRefreshCount: any;
  @Input() set view(value: any) {
    this._view = value;
  }
  @Input() serverSideDataSource: any;
  @Input() allowDownload: boolean;
  // @Input() filters: any;
  @Input() startCount: any;
  @Input() endCount: any;
  @Input() totalCount: any;
  @Input() emptyMsg: any;
  @Input() filterApplied = false;
  @Input() menuItems: any = [];
  @Input() headerActions: any = [];
  @Input() noItemsClass: any = 'background-image: url("/assets/svgs/No_Clients.svg")';
  @Input() entityTypeName = 'Identities';
  @Input() showNoItemsAdd = true;
  @Input() currentPage = 1;
  @Input() noItemsImage = 'nodata';
  @Input() rowHeight = this.remToPx(3.125);
  @Input() filterName = 'name';
  @Input() filterColumn = 'name';
  @Output() actionRequested = new EventEmitter<{ action: string; item?: any }>();
  // @Output() filterChanged = new EventEmitter();
  @Output() gridReady = new EventEmitter();
  @Output() dragStart = new EventEmitter();
  @Output() dragLeave = new EventEmitter();
  @Output() pageChanged = new EventEmitter();

  _view = 'list';
  frameworkComponents;
  gridModules;
  gridOptions;
  visibleColumns;
  hiddenColumns;
  visibleColumnIds;
  hiddenColumnIds;
  mergedColumnDefinitions;
  openMenu;
  openHeaderMenu;
  filterOptions: any = [];
  showFilterOptions;
  showDateTimePicker;
  showTagSelector;
  attributesColumn = '';
  dateTimeColumn = '';
  dateTimeFilterLabel = '';
  selectedRange = '';
  dateValue;
  menuLeft;
  menuTop;
  gridRendered;
  resizeHandlerInit = false;
  resizeGridColumnsDebounced;
  selectedItem: any = {
    actionList: [],
  };
  entityTypeLabel = ''
  columnFilters:any = {};
  roleAttributes: any[] = [];
  namedAttributes: any[] = [];
  selectedRoleAttributes: any[] = [];
  selectedNamedAttributes: any[] = [];
  // appliedFilters = [];
  autoGroupColumnDef;
  currentHeaderComponentParams: any = {};
  subscription: Subscription = new Subscription();

  public menuColumnDefinition = {
    colId: 'ziti-ag-menu',
    field: 'ziti-ag-menu',
    resizable: false,
    width: this.remToPx(3.125),
    sortable: false,
    lockPosition: true,
    suppressMovable: true,
    headerClass: 'menuHeader',
    cellClass: 'tCol cellMenu',
    cellRenderer: 'cellMenuComponent',
    cellRendererParams: {
      openMenu: ($event, item) => {
        this.openActionMenu($event, item);
      },
      closeMenu: (event) => {
        this.closeActionMenu();
      },
    },
    suppressSizeToFit: true,
    pinned: 'right',
    headerComponent: TableColumnMenuComponent,
    headerComponentParams: {
      openHeaderMenu: ($event) => {
        this.openHeaderActionMenu($event);
      },
      closeMenu: (event) => {
        this.closeActionMenu();
      },
    },
  };
  private _initialColumnDefs;
  private _refreshCellsDebounced;
  private _onColumnsResizedDebounced;
  private _saveColumnStateDebounced;

  private selectColumnDefinition = {
    colId: 'ziti-ag-selected',
    field: 'ziti-ag-selected',
    suppressSizeToFit: true,
    lockPosition: true,
    suppressMovable: true,
    resizable: false,
    pinned: 'left',
    width: this.remToPx(3.75),
    sortable: false,
    headerClass: 'selectHeader',
    cellClass: 'tCol',
    cellRenderer: 'cellSelectComponent',
    cellRendererParams: {
      toggleItem: (item) => {
        item.selected = !item.selected;
        this.svc.gridObj.api.zitiAllToggled = _.every(this.rowData, {selected: true});
        _.defer(() => {
          this.svc.gridObj.api.refreshCells({force: true});
        });
        this.actionRequested.emit({action: 'toggleItem', item: item});
      },
    },
    headerComponent: TableColumnSelectComponent,
    headerComponentParams: {
      toggleAll: (selected: boolean) => {
        if (!this.svc.gridObj) {
          return;
        }
        _.forEach(this.rowData, (row) => {
          row.selected = selected;
        });
        this.actionRequested.emit({action: 'toggleAll'});
        _.defer(() => {
          this.svc.gridObj.api.refreshCells({force: true});
        });
      },
    },
  };

  @ViewChild('calendar', { static: false }) calendar: any;
  @ViewChild('contextMenu') contextMenu;
  @ViewChild('tableContainer') tableContainer: ElementRef;

  constructor(public svc: DataTableService, private tableFilterService: DataTableFilterService) {
    this.resizeGridColumnsDebounced = _.debounce(this.svc.resizeGridColumns.bind(this.svc), 20, {leading: true});
    this._refreshCellsDebounced = _.debounce(this.svc.refreshCells.bind(this.svc), 50);
    this._onColumnsResizedDebounced = _.debounce(this.svc.onColumnsResized.bind(this.svc), 400);
    this._saveColumnStateDebounced = _.debounce(this.svc.saveColumnState.bind(this.svc), 400);
  }

  hideMenuItem(menuItem, selectedItem) {
      if (_.isFunction(menuItem.hidden)) {
          return menuItem.hidden(selectedItem);
      } else if (_.isBoolean(menuItem.hidden)) {
          return menuItem.hidden;
      } else {
          return !selectedItem.actionList.includes(menuItem.action);
      }
  }

  private _columnDefinitions;

  @Input() set columnDefinitions(value: any) {
    this._columnDefinitions = value;

  }

  get showFilterBar(): boolean {
    return this._view !== 'upload' && this._view !== 'process';
  }

  @Input() set refreshCount(value: number) {
    if (!this.svc.gridObj) {
      return;
    }
    _.defer(() => {
      this.svc.gridObj.api.redrawRows();
      this.svc.gridObj.api.refreshCells({force: true});
    });
  }

  get showTable() {
    const _showTable = this.isLoading || this.filterApplied || this.rowData?.length > 0;
    if (_showTable && !this.resizeHandlerInit) {
      this._initGridResizeHandler();
    }
    return _showTable;
  }

  ngOnInit() {
    this.frameworkComponents = {
      cellSelectComponent: TableCellSelectComponent,
      cellMenuComponent: TableCellMenuComponent,
      cellTokenComponent: TableCellTokenComponent,
      headerCellSelectComponent: TableColumnSelectComponent,
      headerHeaderMenuComponent: TableColumnMenuComponent,
      headerDefaultComponent: TableColumnDefaultComponent,
    };

    this.autoGroupColumnDef = {
      field: 'processTree',
      headerName: 'Process Name',
      cellRenderer: 'cellResourceStatusComponent',
      resizable: true,
      cellRendererParams: {resourceType: 'process-execution'},
      headerComponentFramework: TableColumnDefaultComponent,
    };

    if (this._columnDefinitions) {
      this._addColumnEvents();
      this._addDefaultColumnDefs();
      this._storeInitialColumnDefs();
      this._setColumnWidths();
      this._setColumnOrderAndVisibility();
      this._initColumnVisibility();
      this._initGridOptions();
    }
  }

  ngOnChanges(changes: any): void {
    if (this.svc.gridObj && changes.rowData) {
      this._refreshCellsDebounced(changes.rowData);
    }
  }

  columnVisibilityChanged(event) {
    this.setColumnVisibilityColumn(event?.column, event?.visible);
  }

  openActionMenu(event, item): void {
    this.selectedItem = item;
    this.openMenu = true;
    _.delay(() => {
      const height = this.contextMenu?.nativeElement?.offsetHeight || 120;
      const windowOffset = window.innerHeight - event.clientY;
      const menuOffset = windowOffset <= height ? height - windowOffset : 0;
      this.menuLeft = event.clientX - 100;
      this.menuTop = event.clientY + 5 - menuOffset;
    }, 10);
  }

  onGridReady(params) {
    this.gridReady.emit(params);
  }

  resetTableColumns() {
    if (!this.svc.gridObj) {
      return;
    }
    this.mergedColumnDefinitions = _.cloneDeep(this._initialColumnDefs);
    this.svc.gridObj.api.setColumnDefs(this.mergedColumnDefinitions);
    this.svc.resetCookieConfig();
    this.svc.gridObj.api.resetColumnState();
    _.defer(() => {
      this._updateHiddenColumns();
      this.svc.resizeGridColumns();
    });
  }

  openHeaderActionMenu(event): void {
    this.menuLeft = event.clientX - 150;
    this.menuTop = event.clientY + 5;
    _.delay(() => {
      this.openHeaderMenu = true;
    }, 100);
  }

  closeActionMenu(): void {
    this.selectedItem = {
      actionList: [],
    };
    this.openMenu = false;
    this.openHeaderMenu = false;
  }

  openHeaderFilter(event, options, type, columnId, filterLabel, headerComponentParams): void {
    this.filterOptions = options;
    this.menuLeft = event.clientX;
    this.menuTop = event.clientY + 10;
    if (type === 'DATETIME') {
      this.dateTimeColumn = columnId;
      this.dateTimeFilterLabel = filterLabel || 'Date: ';
      _.delay(() => {
        this.showDateTimePicker = true;
      }, 10);
      _.delay(() => {
        this.calendar.toggle();
      }, 100);
    } else if (type === 'ATTRIBUTE') {
      this.attributesColumn = columnId;
      this.roleAttributes = headerComponentParams?.getRoleAttributes();
      this.namedAttributes = headerComponentParams?.getNamedAttributes();
      this.selectedRoleAttributes = headerComponentParams.getSelectedRoleAttributes();
      this.selectedNamedAttributes = headerComponentParams.getSelectedNamedAttributes();
      this.dateTimeFilterLabel = filterLabel;
      this.currentHeaderComponentParams = headerComponentParams;
      _.delay(() => {
        this.showTagSelector = true;
      }, 100);
    } else {
      _.defer(() => {
        this.showFilterOptions = true;
      });
    }
  }

  setDateRangeFilter(range) {
    let startDate;
    let label;
    let endDate = moment();
    let closeCalendar = true;
    this.selectedRange = range;
    switch (range) {
      case 'hour':
        startDate = moment().subtract(1, 'hours');
        label = 'Last Hour';
        break;
      case 'day':
        startDate = moment().subtract(24, 'hours');
        label = 'Last Day';
        break;
      case 'week':
        startDate = moment().subtract(7, 'days');
        label = 'Last Week';
        break;
      case 'month':
        startDate = moment().subtract(1, 'month');
        label = 'Last Month';
        break;
      case 'custom':
        if (!this.dateValue) {
          return;
        }
        startDate = moment(this.dateValue[0]);
        if (this.dateValue[1] !== undefined && this.dateValue[1] !== null) {
          endDate = moment(this.dateValue[1]);
        }
        label = 'Custom';
        closeCalendar = false;
        break;
      default:
        startDate = moment().subtract(24, 'hours');
        label = 'Last Day';
        break;
    }
    const startDateRange = encodeURIComponent(startDate.toISOString());
    const endDateRange = encodeURIComponent(endDate.toISOString());
    this.columnFilters[this.dateTimeColumn] = [startDateRange, endDateRange];

    if (closeCalendar) {
      this.calendar.toggle();
    }
    if (range !== 'custom') {
      this.dateValue = [startDate.toDate(), endDate.toDate()];
    }
    const filterObj: FilterObj = {
      columnId: this.dateTimeColumn,
      value: [startDateRange, endDateRange],
      label: label,
      filterName: this.dateTimeFilterLabel,
      type: 'DATETIME'
    };

    this.tableFilterService.updateFilter(filterObj);
  }

  tagSelectionChanged(event, isRole) {
    let label = '';
    let value = '';
    if (isRole) {
      this.selectedNamedAttributes = [];
      if (this.selectedRoleAttributes.length > 1) {
        this.selectedRoleAttributes = [_.last(this.selectedRoleAttributes)];
      }
      this.selectedRoleAttributes.forEach((attr, index) => {
        if (index > 0) {
          label += ', ';
          value += ', ';
        }
        label += '#' + attr;
        value += '%23' + attr;
      });
    } else {
      this.selectedRoleAttributes = [];
      const attrIdMap = this.currentHeaderComponentParams.getNamedAttributesMap();
      if (this.selectedNamedAttributes.length > 1) {
        this.selectedNamedAttributes = [_.last(this.selectedNamedAttributes)];
      }
      this.selectedNamedAttributes.forEach((attr, index) => {
        if (index > 0) {
          label += ', ';
          value += ', ';
        }
        label += '@' + attr;
        value += '%40' + attrIdMap[attr];
      });
    }
    const filterObj: FilterObj = {
      columnId: this.attributesColumn,
      value: value,
      label: label,
      filterName: this.dateTimeFilterLabel,
      type: 'ATTRIBUTE'
    };
    this.currentHeaderComponentParams.setSelectedRoleAttributes(this.selectedRoleAttributes);
    this.currentHeaderComponentParams.setSelectedNamedAttributes(this.selectedNamedAttributes);
    this.tableFilterService.updateFilter(filterObj);
  }

  applyFilter(event, filter) {
    this.tableFilterService.updateFilter(filter);
    this.closeHeaderFilter(event);
  }

  closeHeaderFilter(event): void {
    this.showFilterOptions = false;
  }

  closeDateTime(event): void {
    this.showDateTimePicker = false;
  }

  closeTagSelector(event): void {
    this.showTagSelector = false;
  }

  openCreate() {
    this.actionRequested.emit({action: 'create'});
  }

  anySelected() {
    return _.some(this.rowData, {selected: true});
  }

  showDownload() {
    return this.allowDownload && this._view !== 'process';
  }

  _initGridResizeHandler() {
    if (!this.tableContainer) {
      return;
    }
    const observer = new ResizeObserver(entries => {
      this.resizeGridColumnsDebounced();
    });
    observer.observe(this.tableContainer.nativeElement);
    this.resizeHandlerInit = true;
  }

  _initGridOptions() {
    this.gridOptions = {
      pagination: false,
      rowSelection: 'single',
      rowClass: 'ziti-table-row',
      rowHeight: this.rowHeight,
      immutableData: true,
      suppressRowClickSelection: true,
      suppressHorizontalScroll: false,
      stopEditingWhenGridLosesFocus: true,
      suppressPropertyNamesCheck: true,
      animateRows: true,
      defaultColDef: {
        sortable: false,
        filter: false, // set filtering on for all columns
      },
      onRowDragMove: (params) => {
        this.dragStart.emit(params);
      },
      onRowDragLeave: (params) => {
        this.dragLeave.emit(params);
      },
      onRowDragEnd: () => {
        $('.attribute-item').show();
        $('.drag-hover').removeClass('drag-hover');
        $('#ColumnVisibilityHeader').trigger('click');
        $('.new-attribute-target').hide();
      },
      rowClassRules: {
        // row style function
        'row-invalid': function (params) {
          return _.get(params, 'data.invalid');
        },
        'row-copied': function (params) {
          return _.get(params, 'data.copied');
        },
        'row-child-sub-process': function (params) {
          return (
              params.api.view === 'process' &&
              !_.get(params, 'data.isRoot') &&
              !_.isEmpty(_.get(params, 'data.subprocessId'))
          );
        },
        'row-child': function (params) {
          return (
              (params.api.view === 'process' || params.api.view === 'user-roles') &&
              !_.get(params, 'data.isRoot') &&
              !_.isEmpty(_.get(params, 'data.parentId'))
          );
        },
        'row-child-second': function (params) {
          return (
              params.api.view === 'process' &&
              !_.get(params, 'data.isRoot') &&
              _.get(params, 'data.isParallel')
          );
        },
        'row-child-even': function (params) {
          return (
              (params.api.view === 'process' || params.api.view === 'user-roles') &&
              _.get(params, 'data.parentIndex') % 2 > 0
          );
        },
        'row-child-odd': function (params) {
          return (
              (params.api.view === 'process' || params.api.view === 'user-roles') &&
              _.get(params, 'data.parentIndex') % 2 === 0
          );
        },
        'row-child-warn': function (params) {
          return params.api.view === 'process' && _.get(params, 'data.state') === 'WARNING';
        },
        'row-child-header': function (params) {
          return params.api.view === 'process' && _.get(params, 'data.rowType') === 'step-header';
        },
        'row-role-item': function (params) {
          return _.get(params, 'data.roleItem');
        },
      },
      getRowHeight: (params) => {
        return this.remToPx(3.125);
      },
      onCellEditingStopped: (eventObj) => {
        if (!this.validateService) {
          return;
        }
        const field = _.get(eventObj, 'colDef.field', '');
        if (_.includes(field.toLowerCase(), 'attribute')) {
          const newVal = eventObj.newValue.split(',');
          _.set(eventObj, `data.${field}`, newVal);
        } else {
          _.set(eventObj, `data.${field}`, eventObj.newValue);
        }
        this._validateTable(eventObj);
      },
      getRowNodeId: (data) => data.name,
      onBodyScroll: (scroller) => {
        this._handleTableScroll(scroller);
      },
      onGridReady: (grid) => {
        grid.api.zitiAllToggled = false;
        grid.api.zitiHideColumn = this.setColumnVisibilityColumn.bind(this);
        grid.api.validateTable = this._validateTable.bind(this);
        grid.api.view = this._view;
        grid.api.zitiRowData = this.rowData;
        grid.api.openHeaderFilter = this.openHeaderFilter.bind(this);

        // eslint-disable-next-line @typescript-eslint/no-empty-function
        grid.api.rowsToggled = this.rowsToggled ? this.rowsToggled.bind(this) : () => {};
        if (this.serverSideDataSource) {
          grid.api.setServerSideDatasource(this.serverSideDataSource);
        }
        this.svc.gridObj = grid;
        _.defer(this._applyColumnState.bind(this));
      },
      onColumnVisible: (eventObj) => {
        if (!eventObj.column) {
          return;
        }
        this.updateColumnVisibility(eventObj.column.colDef.colId, eventObj.visible);
        if (eventObj.visible) {
          this.svc.gridObj.api.moveColumns(
              [eventObj.column.colDef.colId],
              this.mergedColumnDefinitions.length - 1
          );
          _.defer(() => {
            this.svc.gridObj.api.ensureColumnVisible(eventObj.column.colDef.colId);
          });
        }
        this._updateGridColumns();
        this.svc.saveColumnState();
      },
      onFirstDataRendered: (eventObj) => {
        this.svc.resizeGridColumns();
        this.gridRendered = true;
      },
      onColumnPinned: (eventObj) => {
        if (!eventObj.column) {
          return;
        }
        const colId = eventObj.column.colDef.colId;
        const pinned = eventObj.pinned === 'left';
        this.mergedColumnDefinitions = _.map(this.mergedColumnDefinitions, (colDef) => {
          if (colDef.colId === colId) {
            colDef.lockPosition = pinned;
            colDef.suppressMovable = pinned;
          }
          return colDef;
        });
        this._updateGridColumns();
        this.svc.resizeGridColumns();
        this.svc.saveColumnState();
      },
      onColumnResized: (eventObj) => {
        if (!eventObj.column || eventObj.source === 'sizeColumnsToFit') {
          return;
        }
        this._onColumnsResizedDebounced(eventObj.column);
      },
      onColumnMoved: (eventObj) => {
        this._saveColumnStateDebounced();
      },
    };
  }

  _validateTable(eventObj) {
    this.rowData[eventObj.rowIndex] = eventObj.data;
    _.delay(() => {
      this.validateService(this.rowData);
      _.delay(() => {
        this.svc.gridObj.api.refreshCells({force: true});
        this.svc.gridObj.api.redrawRows();
      }, 50);
    }, 50);
  }

  _applyColumnState() {
    const tableStateCookie = localStorage.getItem(`ziti_${this.svc.tableId}_table_state`);
    const tableState = JSON.parse(tableStateCookie);
    if (tableState) {
      this.svc.gridObj.api.applyColumnState({state: tableState});
      this._updateHiddenColumns();
    }
  }

  _addColumnEvents() {
    this._columnDefinitions = _.map(this._columnDefinitions, (colDef) => {
      colDef.pinColumn = this.svc.pinColumn.bind(this.svc);
      colDef.cellClass = this._getCellStyle.bind(this);
      return colDef;
    });
  }

  _getCellStyle(params) {
    if (!this.rowValidation || this.rowValidation.length <= 0) {
      return '';
    }
    const validationResult = this.rowValidation[params.node.rowIndex];
    if (!validationResult || !validationResult.errors) {
      return '';
    }
    const field = _.get(params, 'colDef.field', '');
    if (validationResult.errors[field]) {
      return 'ziti-table-cell-error';
    }
    return '';
  }
  updateColumnVisibility(colId, visible) {
    this._columnDefinitions = _.map(this._columnDefinitions, (colDef) => {
      if (colDef.colId === colId) {
        colDef.hide = !visible;
      }
      return colDef;
    });
    for (const colDef of this.mergedColumnDefinitions) {
      if (colDef.colId === colId) {
        colDef.hide = !visible;
      }
    }
    this._updateHiddenColumns();
    this.svc.resizeGridColumns();
  }

  updateEntityTypeLabel() {
    switch(this.svc.tableId) {
      case 'api-sessions':
        this.entityTypeLabel = 'API Sessions';
        break;
      case 'auth-policies':
        this.entityTypeLabel = 'Auth Policies';
        break;
      case 'certificate-authorities':
        this.entityTypeLabel = 'Certificate Authorities';
        break;
      case 'ext-jwt-signers':
        this.entityTypeLabel = 'External JWT Signers';
        break;
      case 'identities':
        this.entityTypeLabel = 'Identities';
        break;
      case 'posture-checks':
        this.entityTypeLabel = 'Posture Checks';
        break;
      case 'edge-routers':
        this.entityTypeLabel = 'Edge Routers';
        break;
      case 'services':
        this.entityTypeLabel = 'Services';
        break;
      case 'configurations':
        this.entityTypeLabel = 'Configs';
        break;
      case 'config-types':
        this.entityTypeLabel = 'Config Types';
        break;
      case 'service-policies':
        this.entityTypeLabel = 'Service Policies';
        break;
      case 'edge-router-policies':
        this.entityTypeLabel = 'Edge Router Policies';
        break;
      case 'service-edge-router-policies':
        this.entityTypeLabel = 'Service Edge Router Policies';
        break
      case 'sessions':
        this.entityTypeLabel = 'Sessions';
        break;
      case 'terminators':
        this.entityTypeLabel = 'Terminators';
        break;
      case 'transit-routers':
        this.entityTypeLabel = 'Transit Routers';
        break;
    }
  }

  setColumnVisibilityColumn(column, visible) {
    this.svc.gridObj.api.setColumnsVisible([column.colId], visible);
    this.svc.gridObj.api.refreshHeader();
    _.defer(() => {
      this.updateColumnVisibility(column.colId, visible);
    });
  }

  _updateHiddenColumns() {
    const gridColumnDefs = this.svc.gridObj?.api?.columnModel?.gridColumns;
    const visibleGridColumns = gridColumnDefs.filter((col) => col.visible);
    const hiddenGridColumns = gridColumnDefs.filter((col) => !col.visible);
    this.visibleColumns = _.map(visibleGridColumns, 'colDef');
    this.visibleColumnIds = _.map(this.visibleColumns, 'field');
    this.hiddenColumns = _.map(hiddenGridColumns, 'colDef');
    this.hiddenColumnIds = _.map(this.hiddenColumns, 'field');
  }

  addHeaderMenu(columnDefs = []) {
    columnDefs.forEach((columnDef) => {
      if (columnDef.useHeaderMenu) {
        columnDef.headerComponentParams = {
          openHeaderMenu: ($event) => {
            this.openHeaderActionMenu($event);
          },
          closeMenu: (event) => {
            this.closeActionMenu();
          },
        };
      }
    });
  }

  _addDefaultColumnDefs() {
    this.addHeaderMenu(this._columnDefinitions);
    this.mergedColumnDefinitions = _.cloneDeep(this._columnDefinitions);
    if (this._view === 'process') {
      const cellParams = _.cloneDeep(this.menuColumnDefinition.cellRendererParams);
      this.mergedColumnDefinitions[this.mergedColumnDefinitions.length - 1].cellRendererParams = _.merge(
          this.mergedColumnDefinitions[this.mergedColumnDefinitions.length - 1].cellRendererParams,
          cellParams
      );
      this.mergedColumnDefinitions[this.mergedColumnDefinitions.length - 1].headerComponentParams =
          this.menuColumnDefinition.headerComponentParams;
    } else if ( (this.options.noSelect && this.options.noMenu)) {
      // Don't add any additional columns
    } else if ( (this.options.noSelect && !this.options.noMenu)) {
      this.mergedColumnDefinitions.push(this.menuColumnDefinition);
    } else if ( !this.options.noSelect && this.options.noMenu) {
      this.mergedColumnDefinitions.push(this.selectColumnDefinition);
    }  else if (this._view !== 'upload') {
      this.mergedColumnDefinitions.splice(0, 0, this.selectColumnDefinition);
      this.mergedColumnDefinitions.push(this.menuColumnDefinition);
    }
  }

  _storeInitialColumnDefs() {
    this._initialColumnDefs = _.cloneDeep(this.mergedColumnDefinitions);
  }

  _initColumnVisibility() {
    this.visibleColumns = this._columnDefinitions.filter((col) => !col.hide);
    this.hiddenColumns = this._columnDefinitions.filter((col) => col.hide);
    this.visibleColumnIds = _.map(this.visibleColumns, 'field');
  }

  _updateGridColumns() {
    this._setColumnWidths();
    this.svc.gridObj.api.setColumnDefs(this.mergedColumnDefinitions);
    this.svc.gridObj.api.refreshHeader();
  }

  _setColumnWidths() {
    if (this._view === 'upload' || this._view === 'process') {
      return;
    }
    const colWidthsCookie = localStorage.getItem(`ziti_${this.svc.tableId}_column_widths`);
    if (!_.isEmpty(colWidthsCookie)) {
      const colWidths = JSON.parse(colWidthsCookie);
      _.forEach(colWidths, (colWidth, colId) => {
        _.forEach(this.mergedColumnDefinitions, (colDef) => {
          if (colDef.colId === colId) {
            colDef.width = colWidth;
            colDef.suppressSizeToFit = true;
          }
        });
      });
    }
  }

  _setColumnOrderAndVisibility() {
    if (this._view === 'upload' || this._view === 'process') {
      return;
    }
    const tableStateCookie = localStorage.getItem(`ziti_${this.svc.tableId}_table_state`);
    if (!_.isEmpty(tableStateCookie) || typeof tableStateCookie === 'undefined') {
      const colStates = JSON.parse(tableStateCookie);
      const columnIndexes = [];
      _.forEach(colStates, (colState) => {
        _.forEach(this.mergedColumnDefinitions, (colDef) => {
          if (colDef.colId === colState.colId) {
            columnIndexes.push(colDef);
            colDef.hide = colState.hide;
          }
        });
      });
      _.forEach(this.mergedColumnDefinitions, (colDef) => {
        let colFound = false;
        _.forEach(columnIndexes, (colIndex) => {
          if (colDef.colId === colIndex.colId) {
            colFound = true;
          }
        });
        if (!colFound) {
          columnIndexes.push(colDef);
        }
      });
      this.mergedColumnDefinitions = columnIndexes;
    }
  }

  _handleTableScroll(scroller): void {
    const scrollWidth = $('.ag-center-cols-container').width();
    const viewWidth = $('.ag-center-cols-viewport').width();
    const scrollableWidth = scrollWidth - viewWidth;
    if (scroller.left > 0) {
      $('.ag-pinned-left-cols-container').addClass('ag-pinned-left-shadow');
    } else {
      $('.ag-pinned-left-cols-container').removeClass('ag-pinned-left-shadow');
    }
    if (scroller.left < scrollableWidth - 2) {
      $('.ag-pinned-right-cols-container').addClass('ag-pinned-right-shadow');
    } else {
      $('.ag-pinned-right-cols-container').removeClass('ag-pinned-right-shadow');
    }
  }

  remToPx(remValue) {
    const rootFontSize: any = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
    return remValue * rootFontSize;
  };
}
