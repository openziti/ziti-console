import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'lib-table-hidden-columns-bar',
  templateUrl: './hidden-columns-bar.component.html',
  styleUrls: ['./hidden-columns-bar.component.scss']
})
export class HiddenColumnsBarComponent {

  @Input() hiddenColumns: any;
  @Input() showToggle = false;
  @Input() toggleLabel = '';
  @Output() columnVisibilityChanged = new EventEmitter();
  @Output() onToggle = new EventEmitter();

  toggleOn = false;
  setColumnVisibilityColumn(column, visible) {
    const event = {
      column,
      visible
    };
    this.columnVisibilityChanged.emit(event);
  }

  toggled() {
    this.toggleOn = !this.toggleOn;
    this.onToggle.emit(this.toggleOn);
  }
}
