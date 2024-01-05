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
