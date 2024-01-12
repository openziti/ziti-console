import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'lib-forwarding-config',
  templateUrl: './forwarding-config.component.html',
  styleUrls: ['./forwarding-config.component.scss']
})
export class ForwardingConfigComponent {

  @Input() protocol: string = undefined;
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
  disableProtocol = false;
  disableAddress = false;
  disablePort = false;

  forwardProtocolToggled(event) {
    if (!this.forwardProtocol) {
      this.allowedProtocols = undefined;
    } else {
      this.protocol = undefined;
    }
    this.disableProtocol = this.forwardProtocol;
  }

  forwardAddressToggled(event) {
    if (!this.forwardAddress) {
      this.allowedAddresses = undefined;
    } else {
      this.address = undefined;
    }
    this.disableAddress = this.forwardAddress;
  }

  forwardPortToggled(event) {
    if (!this.forwardPort) {
      this.allowedPortRanges = undefined;
    } else {
      this.port = undefined;
    }
    this.disablePort = this.forwardPort;
  }

  getProperties() {
    const props = [
      {key: 'forwardProtocol', value: this.forwardProtocol},
      {key: 'forwardAddress', value: this.forwardAddress},
      {key: 'forwardPort', value: this.forwardPort},
      {key: 'allowedAddresses', value: this.allowedAddresses},
      {key: 'allowedPortRanges', value: this.allowedPortRanges},
      {key: 'allowedProtocols', value: this.allowedProtocols},
    ];
    return props;
  }
}
