import { Component } from '@angular/core';
import {ICellRendererAngularComp} from "ag-grid-angular";
import {MatDialog} from "@angular/material/dialog";
import {ICellRendererParams} from "ag-grid-community";
import {Router} from "@angular/router";

import {isEmpty, get} from 'lodash';

@Component({
  selector: 'lib-table-cell-name',
  templateUrl: './table-cell-name.component.html',
  styleUrls: ['./table-cell-name.component.scss']
})
export class TableCellNameComponent  implements ICellRendererAngularComp {

  cellParams: any;
  item: any;
  dialogRef: any;

  constructor(public dialogForm: MatDialog, private router: Router) {
  }

  agInit(params: ICellRendererParams): void {
    this.cellParams = params;
    this.item = params.data;
  }

  refresh(params: ICellRendererParams<any>): boolean {
    this.cellParams = params;
    this.item = params.data;
    return true;
  }

  linkClicked(event) {
    this.router.navigateByUrl(`${this.cellParams.pathRoot}/${this.item.id}`);
    event.stopPropagation();
    event.preventDefault();
  }

  get cellText() {
    let val = get(this.item, this.cellParams?.colDef?.field);
    if (isEmpty(val)) {
      val = this.item.name;
    }
    return val;
  }
}
