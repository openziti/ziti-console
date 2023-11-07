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
