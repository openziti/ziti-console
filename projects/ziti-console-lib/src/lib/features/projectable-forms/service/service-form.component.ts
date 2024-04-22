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

import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
  Output,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  AfterViewInit,
  Inject,
  ViewContainerRef
} from '@angular/core';
import {Subscription} from 'rxjs';
import {ProjectableForm} from "../projectable-form.class";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";

import {isEmpty, forEach, delay, unset, keys, defer, cloneDeep, isEqual, some, filter} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {SERVICE_EXTENSION_SERVICE, ServiceFormService} from './service-form.service';
import {MatDialogRef} from "@angular/material/dialog";
import {ExtensionService} from "../../extendable/extensions-noop.service";

@Component({
  selector: 'lib-service-form',
  templateUrl: './service-form.component.html',
  styleUrls: ['./service-form.component.scss'],
  providers: [
    {
      provide: MatDialogRef,
      useValue: {}
    }
  ]
})
export class ServiceFormComponent extends ProjectableForm implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() set formData(data) {
    if (!data?.configs) {
      data.configs = [];
    }
    this.svc.formData = data;
  }

  get formData(): any {
    return this.svc.formData;
  }

  @Input() serviceRoleAttributes: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  isEditing = false;
  enrollmentExpiration: any;
  jwt: any;
  token: any;
  isLoading = false;
  strategies = [
    {id: 'smartrouting', label: 'Smart Routing'},
    {id: 'weighted', label: 'Weighted'},
    {id: 'random', label: 'Random'},
    {id: 'ha', label: 'High Availability'},
  ];
  bindingTypes = [
    {id: 'udp', name: 'UDP'},
    {id: 'transport', name: 'Transport'},
    {id: 'edge', name: 'Edge'},
  ];
  protocols = [
    {id: 'udp', name: 'UDP'},
    {id: 'tcp', name: 'TCP'}
  ];

  showMore = false;
  formView = 'simple';
  formDataInvalid = false;
  settings: any = {};
  subscription: Subscription = new Subscription();

  @ViewChild("dynamicform", {read: ViewContainerRef}) dynamicForm!: ViewContainerRef;
  constructor(
      @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
      public svc: ServiceFormService,
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      growlerService: GrowlerService,
      @Inject(SERVICE_EXTENSION_SERVICE) private extService: ExtensionService
  ) {
    super(growlerService);
  }

  ngOnInit(): void {
    this.subscription.add(
      this.settingsService.settingsChange.subscribe((results:any) => {
        this.settings = results;
      })
    );
    this.jwt = this.formData.enrollmentJwt;
    this.token = this.formData.enrollmentToken;
    this.enrollmentExpiration = this.formData?.enrollmentExpiresAt;
    this.svc.resetFormData();
    this.svc.getAssociatedConfigs();
    this.svc.getAssociatedTerminators();
    this.svc.getAssociatedServicePolicies();
    this.svc.errors = {};
    this.initData = cloneDeep(this.formData);
    this.subscription.add(
      this.extService.formDataChanged.subscribe((data) => {
        if (data.isEmpty) {
          return;
        }
      })
    );
  }

  ngOnDestroy() {
    this.extService.closed.emit({});
    this.subscription.unsubscribe();
  }

  override ngAfterViewInit() {
    super.ngAfterViewInit();
    this.nameFieldInput.nativeElement.focus();
    this.resetTags();
    this.svc.getConfigTypes();
    this.svc.getConfigs().then(() => {
      this.svc.updatedAddedConfigs();
    });
    this.svc.getRouters();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.isEditing = !isEmpty(this.formData.id);
  }

  configChanged($event) {
    this.svc.configChanged(this.dynamicForm);
  }

  configTypeChanged($event) {
    this.svc.configTypeChanged(this.dynamicForm);
  }

  get showConfigData() {
    return this.svc.selectedConfigId === 'add-new' || this.svc.selectedConfigId === 'preview';
  }

  captureConfigEnterEvent(event) {
    event.stopPropagation();
    this.svc.attachConfig(this.svc.selectedConfigId);
  }

  headerActionRequested(action) {
    switch(action.name) {
      case 'save':
        this.save();
        break;
      case 'close':
        this.closeModal(true);
        break;
      case 'toggle-view':
        this.formView = action.data;
        break;
    }
  }

  async save(event?) {
    const isValid = this.svc.validate();
    const isExtValid = await this.extService.validateData();
    const isEdit = !isEmpty(this.formData.id);
    if(!isValid || !isExtValid) {
      const growlerData = new GrowlerModel(
          'error',
          'Error',
          `Data Invalid`,
          `Service data is invalid. Please update and try again.`,
      );
      this.growlerService.show(growlerData);
      return;
    }

    this.isLoading = true;
    const serviceId = await this.svc.save(this.formData).then((result) => {
      if (!isEmpty(result?.id)) {
        this.formData = result;
        this.initData = this.formData;
      }
      return result?.id;
    }).finally(() => {
      this.isLoading = false;
    });
    if (serviceId && !isEdit) {
      await this.svc.addTerminators(serviceId)
    }
    if (serviceId) {
      this.closeModal(true, true);
    }
  }

  toggleEncryptionRequired() {
    this.formData.encryptionRequired = !this.formData.encryptionRequired;
  }

  get apiCallURL() {
    return this.settings.selectedEdgeController + '/edge/management/v1/services' + (this.formData.id ? `/${this.formData.id}` : '');
  }

  get saveButtonTooltip() {
    if (this.formDataInvalid) {
      return 'Service data is invalid. Please update and try again.'
    } else {
      return 'Complete and attach config definition, or remove before saving';
    }
  }

  clear(): void {
  }
}
