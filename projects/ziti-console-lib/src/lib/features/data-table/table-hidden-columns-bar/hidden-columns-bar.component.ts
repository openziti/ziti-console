import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
    selector: 'lib-table-hidden-columns-bar',
    templateUrl: './hidden-columns-bar.component.html',
    styleUrls: ['./hidden-columns-bar.component.scss'],
    standalone: false
})
export class HiddenColumnsBarComponent {

  @Input() hiddenColumns: any;
  @Output() columnVisibilityChanged = new EventEmitter();

  setColumnVisibilityColumn(column, visible) {
    const event = {
      column,
      visible
    };
    this.columnVisibilityChanged.emit(event);
  }
}
