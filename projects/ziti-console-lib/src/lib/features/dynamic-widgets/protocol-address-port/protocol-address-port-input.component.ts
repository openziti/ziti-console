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

import {Component, EventEmitter, Input, Output, ViewChild, ViewContainerRef} from '@angular/core';
import {Subject} from "rxjs";
import {debounce} from "lodash";

@Component({
  selector: 'lib-protocol-address-port-input',
  templateUrl: './protocol-address-port-input.component.html',
  styleUrls: ['./protocol-address-port-input.component.scss']
})
export class ProtocolAddressPortInputComponent {
  @Input() protocolList: any;
  @Input() showProtocol = true;
  @Input() showAddress = true;
  @Input() showPort = true;
  @Input() protocolValue: any;
  @Input() addressValue: any;
  @Input() portValue: any;
  @Input() parentage: string[] = [];
  @Input() labelColor = '#000000';
  @Input() labelPrefix = '';
  @Input() fieldClass = '';
  @Input() error = '';
  @Output() fieldValueChange = new EventEmitter<any>();
  valueChange = new Subject<any> ();

  protocolFieldName = 'Protocol';
  addressFieldName = 'Address';
  portFieldName = 'Port';

  update() {
    debounce(() => {
      const data: any = {};
      if(this.showProtocol) data.protocol = this.protocolValue;
      if(this.showAddress) data.protocol = this.addressValue;
      if(this.showPort) data.protocol = this.portValue;
      this.fieldValueChange.emit(data);
      this.valueChange.next(data);
    }, 500)();
  }

  protocolChange(value: string) {
    this.protocolValue = value;
    this.update();
  }

  addressChange(value: string) {
    this.addressValue = value;
    this.update();
  }

  portChange(value: number | undefined) {
    this.portValue = value;
    this.update();
  }
}
