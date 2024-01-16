import {Component, EventEmitter, Input, OnInit, Output, ViewChild, ViewContainerRef} from '@angular/core';
import {Subject} from "rxjs";
import {debounce, isEmpty, isNumber} from "lodash";

@Component({
  selector: 'lib-protocol-address-port-input',
  templateUrl: './protocol-address-port-input.component.html',
  styleUrls: ['./protocol-address-port-input.component.scss']
})
export class ProtocolAddressPortInputComponent implements OnInit {
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
  @Input() hostName: string;
  @Input() port: number;
  @Input() parentage: string[] = [];
  @Input() labelColor = '#000000';
  @Input() labelPrefix = '';
  @Input() fieldClass = '';
  @Input() error = '';
  @Output() fieldValueChange: EventEmitter<any> = new EventEmitter<any>();
  @Output() portChange: EventEmitter<number> = new EventEmitter<number>();
  @Output() addressChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() hostNameChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() protocolChange: EventEmitter<string> = new EventEmitter<string>();
  valueChange = new Subject<any> ();

  protocolFieldName = 'Protocol';
  addressFieldName = 'Address';
  hostNameFieldName = 'Host Name';
  portFieldName = 'Port';

  ngOnInit() {
    const getVals = () => {
      let val = this.address;
      this.addressChange.emit(this.address);
      setTimeout(() => {
        getVals();
      }, 2000);
    }
    getVals();
  }

  update() {
    this.portChange.emit(this.port);
    this.addressChange.emit(this.address);
    this.hostNameChange.emit(this.hostName);
    this.protocolChange.emit(this.protocol);
  }

  get className() {
    let className = 'addressFull'
    if (!this.showProtocol && (this.showHostName || this.showHostName) && (this.showPort)) {
      className = 'host-name-port';
    }
    return className;
  }

  getProperties() {
    const protocol = isEmpty(this.protocol) ? undefined : this.protocol;
    const address = isEmpty(this.address) ? undefined : this.address;
    const hostname = isEmpty(this.hostName) ? undefined : this.hostName;
    const port = !isNumber(this.port) ? undefined : this.port;

    const props = [
      {key: 'protocol', value: protocol},
      {key: 'address', value: address},
      {key: 'hostname', value: hostname},
      {key: 'port', value: port}
    ];
    return props;
  }
}
