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

import {Component, EventEmitter, Input, Output} from '@angular/core';
import {isNumber} from 'lodash';
import {SchemaService} from "../../../services/schema.service";

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

  constructor(private schemaSvc: SchemaService) {}

  getProperties() {
    if (!this.fieldValue) {
      return [];
    }
    const ranges = this.schemaSvc.getPortRanges(this.fieldValue);
    return [{key: 'portRanges', value: ranges}];
  }

  setProperties(ranges) {
    if (!ranges) {
      this.fieldValue = [];
      return;
    }

    this.fieldValue = this.schemaSvc.parseAllowedPortRanges(ranges);
  }

  onKeyup(event: any) {
    if (event.key === " ") {
      event.preventDefault();
      const element = event.target as HTMLElement;
      element.blur();
      element.focus();
    }
    this.emitEvents();
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
        invalid = true;
      }
    });
    this.invalid = invalid;
  }
}
