import {Component, EventEmitter, Inject, Input, OnInit, Output} from '@angular/core';
import {OverridesService} from "./overrides.service";
import {isEmpty} from "lodash"

@Component({
  selector: 'lib-overrides',
  templateUrl: './overrides.component.html',
  styleUrls: ['./overrides.component.scss']
})
export class OverridesComponent implements OnInit {
  @Input() identity: any = {};
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  services: any = [];
  configs: any = [];
  overrides: any = [];
  selectedServiceId;
  selectedConfigId;

  constructor(public svc: OverridesService) {}

  ngOnInit() {
    this.loadOverrides();
    this.svc.loadServices().then((services) => {
      this.services = services;
    });
    this.svc.loadConfigs().then((configs) => {
      this.configs = configs;
    });
  }

  loadOverrides() {
    this.svc.loadOverrides(this.identity).then((overrides) => {
      this.overrides = overrides;
    });
  }

  addOverride() {
    this.svc.addOverride(this.identity, this.selectedServiceId, this.selectedConfigId).then(() => {
      this.loadOverrides();
    });
  }

  removeOverride(override) {
    this.svc.removeOverride(this.identity, override).then(() => {
      this.loadOverrides();
    });
  }

  get disableAddButton() {
    return isEmpty(this.selectedServiceId) || isEmpty(this.selectedConfigId);
  }
}
