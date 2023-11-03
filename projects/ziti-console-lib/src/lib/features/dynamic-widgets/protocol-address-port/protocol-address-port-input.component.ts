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
