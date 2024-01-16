import {Component, EventEmitter, Input, Output} from '@angular/core';
import {isNumber} from 'lodash';

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
    if (!this.fieldValue) {
      return [];
    }
    const ranges = [];
    this.fieldValue.forEach((val: string) => {
      const vals = val.split('-');
      if (vals.length === 1) {
        const port = parseInt(val);
        ranges.push({high: port, low: port});
      } else if (vals.length === 2) {
        const port1 = parseInt(vals[0]);
        const port2 = parseInt(vals[1]);
        ranges.push({low: port1, high: port2});
      } else {
        // do nothing, invalid range
      }
    });
    return [{key: 'portRanges', value: ranges}];
  }

  setProperties(ranges) {
    if (!ranges) {
      this.fieldValue = [];
      return;
    }
    const val = [];
    ranges.forEach((range: any) => {
      if (range.low === range.high) {
        val.push(range.low + '');
      } else {
        val.push(range.low + '-' + range.high);
      }
    });
    this.fieldValue = val;
  }

  validateConfig() {
    if (!this.fieldValue) {
      this.invalid = false;
      return;
    }
    let invalid = false;
    this.fieldValue.forEach((val: string) => {
      const vals = val.split('-');
      if (vals.length === 1) {
        const port = parseInt(val);
        if (isNaN(port)) {
          invalid = true;
          return;
        }
      } else if (vals.length === 2) {
        const port1 = parseInt(vals[0]);
        const port2 = parseInt(vals[1]);
        if (isNaN(port1) || isNaN(port2)) {
          invalid = true;
          return;
        } else if (port1 > port2) {
          invalid = true;
          return;
        }
      } else {
        // do nothing, invalid range
      }
    });
    this.invalid = invalid;
  }
}
