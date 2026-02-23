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

import {Component, DoCheck, EventEmitter, Input, OnInit, Output, ViewChild, ViewContainerRef} from '@angular/core';
import {Subject} from "rxjs";
import _, {debounce, isEmpty, isNumber, isNil, isNaN} from "lodash";
import {ValidationService} from "../../../services/validation.service";

@Component({
    selector: 'lib-protocol-address-port-input',
    templateUrl: './protocol-address-port-input.component.html',
    styleUrls: ['./protocol-address-port-input.component.scss'],
    standalone: false
})
export class ProtocolAddressPortInputComponent implements OnInit, DoCheck {
  @Input() protocolList: any;
  @Input() showProtocol = true;
  @Input() showAddress = true;
  @Input() showHostName = true;
  @Input() showPort = true;
  @Input() disableProtocol = false;
  @Input() disableAddress = false;
  @Input() disableHostName = false;
  @Input() disablePort = false;
  @Input() protocol: string;
  @Input() address: string;
  @Input() hostname: string;
  @Input() port: number;
  @Input() parentage: string[] = [];
  @Input() labelColor = '#000000';
  @Input() labelPrefix = '';
  @Input() fieldClass = '';
  @Input() error = '';
  @Output() fieldValueChange: EventEmitter<any> = new EventEmitter<any>();
  @Output() portChange: EventEmitter<number> = new EventEmitter<number>();
  @Output() addressChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() hostnameChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() protocolChange: EventEmitter<string> = new EventEmitter<string>();
  valueChange = new Subject<any> ();

  protocolFieldName = 'Protocol';
  addressFieldName = 'Address';
  hostnameFieldName = 'Host Name';
  portFieldName = 'Port';

  checkAddressDebounced = debounce(this.checkAddress, 100, {maxWait: 100, leading: true});

  errors = {};

  props = [
    {key: 'protocol', value: undefined},
    {key: 'address', value: undefined},
    {key: 'hostname', value: undefined},
    {key: 'port', value: undefined}
  ]

  constructor(private validationService: ValidationService) {
  }
  ngOnInit() {

  }

  ngDoCheck() {
    this.checkAddressDebounced();
  }

  _addressChanged = false;
  _prevAddress;
  checkAddress() {
    this._addressChanged = !_.isEqual(this._prevAddress, this.address);
    this.addressChange.emit(this.address);
  }

  update() {
    this.portChange.emit(this.port);
    this.addressChange.emit(this.address);
    this.hostnameChange.emit(this.hostname);
    this.protocolChange.emit(this.protocol);
  }

  get className() {
    let className = 'addressFull'
    if (!this.showProtocol && (this.showHostName || this.showAddress) && (this.showPort)) {
      className = 'host-name-port';
    } else if (!this.showProtocol && !this.showPort && (this.showHostName || this.showAddress)) {
      className = 'address-only';
    }
    return className;
  }

  getProperties() {
    const protocol = isEmpty(this.protocol) ? undefined : this.protocol;
    const address = isEmpty(this.address) ? undefined : this.address;
    const hostname = isEmpty(this.hostname) ? undefined : this.hostname;
    const port = !isNumber(this.port) ? undefined : this.port;

    this.props = [
      {key: 'protocol', value: protocol},
      {key: 'port', value: port}
    ];
    if (this.showAddress) {
      this.props.push({key: 'address', value: address});
    }
    if (this.showHostName) {
      this.props.push({key: 'hostname', value: hostname});
    }
    return this.props;
  }

  setValidationErrors(propertyPath = '', validationErrors: any[]) {
    this.props.forEach((prop) => {
      const hasValidationError: any = validationErrors?.some((error) => {
        let pathToMach = error.instancePath;
        if (!isEmpty(error?.params?.missingProperty)) {
          pathToMach += '/' + error?.params?.missingProperty
        }
        return pathToMach === propertyPath + '/' + prop.key;
      });
      this.errors[prop.key] = hasValidationError;
    });
  }

  isValid() {
    this.errors = {};
    if (!isEmpty(this.parentage)) {
      return true;
    }
    if (this.showProtocol && !this.disableProtocol) {
      if(isEmpty(this.protocol)) {
        this.errors['protocol'] = true;
      }
    }
    if (this.showAddress && !this.disableAddress) {
      if(isEmpty(this.address)) {
        this.errors['address'] = true;
      }
    }
    if (this.showHostName && !this.disableHostName) {
      if(isEmpty(this.hostname)) {
        this.errors['hostname'] = true;
      }
    }
    if (this.showPort && !this.disablePort) {
      if(isNil(this.port) || isNaN(this.port)) {
        this.errors['port'] = true;
      }
    }
    return isEmpty(this.errors);
  }

  setProperties(data: any) {
    this.protocol = data.protocol;
    this.address = data.address;
    this.port = data.port;
    this.hostname = data.hostname;
  }
}
