import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'lib-port-ranges',
  templateUrl: './port-ranges.component.html',
  styleUrls: ['./port-ranges.component.scss']
})
export class PortRangesComponent {

  @Input() fieldValue: any = '';
  @Output() fieldValueChanged: EventEmitter<any> = new EventEmitter<any>();
  errors: any = {};
  invalid: boolean = false;

  onKeyDown(event?) {

  }

  get ranges(): any {
    return {};
  }

  set ranges(ranges: any) {
    const portRanges = ranges;
  }

  getProperties() {
    return [{key: 'portRanges', value: this.fieldValue}];
  }
}
