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
import {ForwardingConfigService} from "./forwarding-config.service";
import {ValidationService} from "../../../services/validation.service";
import {isEmpty, isNil, unset} from "lodash";
import {ProtocolAddressPortInputComponent} from "../protocol-address-port/protocol-address-port-input.component";

@Component({
    selector: 'lib-forwarding-config',
    templateUrl: './forwarding-config.component.html',
    styleUrls: ['./forwarding-config.component.scss'],
    standalone: false
})
export class ForwardingConfigComponent {

  @Input() protocol: string = 'tcp';
  @Input() address: string = undefined;
  @Input() port: number = undefined;
  @Input() forwardProtocol = false;
  @Input() forwardAddress = false;
  @Input() forwardPort = false;
  @Input() allowedAddresses: any = undefined;
  @Input() allowedPortRanges: any = undefined;
  @Input() allowedProtocols: any = undefined;
  @Output() protocolChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() addressChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() portChange: EventEmitter<number> = new EventEmitter<number>();
  @Output() forwardProtocolChange: EventEmitter<any> = new EventEmitter<any>();
  @Output() forwardAddressChange: EventEmitter<any> = new EventEmitter<any>();
  @Output() forwardPortChange: EventEmitter<any> = new EventEmitter<any>();
  @Output() allowedAddressesChange: EventEmitter<any> = new EventEmitter<any>();
  @Output() allowedPortRangesChange: EventEmitter<any> = new EventEmitter<any>();
  @Output() allowedProtocolsChange: EventEmitter<any> = new EventEmitter<any>();

  errors = {};

  @ViewChild("papComponent") papComponent:ProtocolAddressPortInputComponent;
  constructor(private svc: ForwardingConfigService, private validationService: ValidationService) {}

  forwardProtocolToggled(event) {
    if (!this.forwardProtocol) {
      this.allowedProtocols = undefined;
    } else {
      this.protocol = undefined;
    }
  }

  forwardAddressToggled(event) {
    if (!this.forwardAddress) {
      this.allowedAddresses = undefined;
    } else {
      this.address = undefined;
    }
  }

  forwardPortToggled(event) {
    if (!this.forwardPort) {
      this.allowedPortRanges = undefined;
    } else {
      this.port = undefined;
    }
  }

  setProperties(data: any) {
    this.forwardPort = data.forwardPort;
    this.forwardProtocol = data.forwardProtocol;
    this.forwardAddress = data.forwardAddress;
    this.protocol = data.protocol ? data.protocol : 'tcp';
    this.address = data.address;
    this.port = data.port;
    this.allowedProtocols = data.allowedProtocols;
    this.allowedAddresses = data.allowedAddresses;
    this.setAllowedPortRanges(data.allowedPortRanges);
    this.svc.validate(this.allowedPortRanges);
  }

  props = [
    { key: 'allowedAddresses', value: undefined },
    { key: 'allowedPortRanges', value: undefined },
    { key: 'forwardPort', value: undefined },
    { key: 'forwardProtocol', value: undefined },
    { key: 'forwardAddress', value: undefined },
    { key: 'allowedProtocols', value: undefined },
  ];

  getProperties() {
    return this.svc.getProperties(this.protocol, this.address, this.port, this.forwardProtocol, this.forwardAddress, this.forwardPort, this.allowedProtocols, this.allowedAddresses, this.allowedPortRanges);
  }

  validateAllowedAddresses() {
    unset(this.errors, 'allowedAddresses');
    if (isNil(this.allowedAddresses) || isEmpty(this.allowedAddresses)) {
      this.errors['allowedAddresses'] = true;
    }
    return this.errors['allowedAddresses'];
  }

  validatePortRanges() {
    unset(this.errors, 'allowedPortRanges');
    const parsedRanges = this.validationService.parsePortRanges(this.allowedPortRanges);
    if (isNil(this.allowedPortRanges) || isEmpty(this.allowedPortRanges) || this.validationService.validatePortRanges(parsedRanges)) {
      this.errors['allowedPortRanges'] = true;
    }
    return this.errors['allowedPortRanges'];
  }

  setAllowedPortRanges(ranges) {
    if (!ranges || isEmpty(ranges)) {
      this.allowedPortRanges = undefined;
      return;
    }
    this.allowedPortRanges = this.validationService.combinePortRanges(ranges);
  }

  isValid() {
    this.errors = {};
    const papIsValid = this.papComponent.isValid();
    if (this.forwardPort) {
      this.validatePortRanges();
    }
    if (this.forwardAddress) {
      this.validateAllowedAddresses();
    }
    return isEmpty(this.errors) && papIsValid;
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
    this.papComponent.setValidationErrors(propertyPath, validationErrors);
  }
}
