import { Injectable } from '@angular/core';
import _ from "lodash";

@Injectable({
  providedIn: 'root'
})
export class DataTableService {
  tableId;
  gridObj;

  constructor() { }

  refreshCells(gridObj, rowData) {
    if (!gridObj) {
      return;
    }
    const dataChanged = !_.isEqual(rowData?.previousValue, rowData?.currentValue);
    if (dataChanged) {
      gridObj.api.zitiAllToggled = !_.isEmpty(rowData) && _.every(rowData, {selected: true});
      gridObj.api.refreshCells({force: true});
    }
  }

  pinColumn(column, pinned) {
    this.gridObj.columnApi.setColumnPinned(column, pinned);
  }
  resizeGridColumns(event = {}) {
    if (!this.gridObj) {
      return;
    }
    _.defer(() => {
      this.gridObj.api.sizeColumnsToFit();
    });
  }
  saveColumnState() {
    const tableState = this.gridObj.columnApi.getColumnState();
    const tableStateCookie = JSON.stringify(tableState);
    localStorage.setItem(`ziti_${this.tableId}_table_state`, tableStateCookie);
  }

  onColumnsResized(tableId, gridObj, column) {
    this.saveColumnWidths(tableId, gridObj, column);
  }
  private saveColumnWidths(tableId, gridObj, column) {
    if (!column) {
      return;
    }
    const columnId = column.colId;
    const columnWidth = column.actualWidth;
    let colWidthsCookie = localStorage.getItem(`ziti_${tableId}_column_widths`);
    let colWidths: any = {};
    if (!_.isEmpty(colWidthsCookie)) {
      colWidths = JSON.parse(colWidthsCookie);
    }
    colWidths[columnId] = columnWidth;
    colWidthsCookie = JSON.stringify(colWidths);
    localStorage.setItem(`ziti_${tableId}_column_widths`, colWidthsCookie);

    let tableStateCookie = localStorage.getItem(`ziti_${tableId}_table_state`);
    let tableState;
    if (_.isEmpty(tableStateCookie)) {
      tableState = gridObj.columnApi.getColumnState();
    } else {
      tableState = JSON.parse(tableStateCookie);
    }
    _.forEach(tableState, (column) => {
      if (columnId === column.colId) {
        column.suppressSizeToFit = true;
        column.width = columnWidth;
      }
    });
    tableStateCookie = JSON.stringify(tableState);
    localStorage.setItem(`ziti_${tableId}_table_state`, tableStateCookie);
    _.forEach(gridObj.columnApi.columnModel.columnDefs, (colDef) => {
      if (colDef.colId === columnId) {
        colDef.suppressSizeToFit = true;
      }
    });
  }
  getRowNodeId(row) {
    return row?.data?.id ? row?.data?.id : row?.data?.name ? row?.data?.name : 'new_row_' + row?.data?.itemIndex;
  }

  resetCookieConfig() {
    localStorage.removeItem(`ziti_${this.tableId}_table_state`);
    localStorage.removeItem(`ziti_${this.tableId}_column_widths`);
  }
  isServerSideGroup = function (dataItem) {
    return _.get(dataItem, 'processTree', []).length === 1;
  };
  getServerSideGroupKey = function (dataItem) {
    return dataItem.processId;
  };
  getDataPath (data) {
    return data.processTree;
  };
}
