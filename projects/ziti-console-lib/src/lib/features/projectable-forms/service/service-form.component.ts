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
import {ProjectableForm, KEY_CODES} from "../projectable-form.class";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";

import {get, isEmpty, forEach, debounce, delay, unset, keys, defer, cloneDeep, isEqual, some, filter} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {SERVICE_EXTENSION_SERVICE, ServiceFormService} from './service-form.service';
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {ExtensionService} from "../../extendable/extensions-noop.service";
import {ConfigEditorComponent} from "../../config-editor/config-editor.component";
import {Service} from "../../../models/service";
import {ActivatedRoute, Router} from "@angular/router";
import {Location} from "@angular/common";
import {URLS} from "../../../urls";
import {PreviewSelectionsComponent} from "../../preview-selections/preview-selections.component";

@Component({
    selector: 'lib-service-form',
    templateUrl: './service-form.component.html',
    styleUrls: ['./service-form.component.scss'],
    providers: [
        {
            provide: MatDialogRef,
            useValue: {}
        }
    ],
    standalone: false
})
export class ServiceFormComponent extends ProjectableForm implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() override set formData(data) {
    if (!data?.configs) {
      data.configs = [];
    }
    this.svc.formData = data;
    if (!isEmpty(data?.id)) {
      if (get(data, 'tags["service-type"]') === 'simple') {
        this.router.navigate([URLS.ZITI_SIMPLE_SERVICE + '/' + data?.id]);
      } else {
        this.dataInit = true;
      }
    } else if (this.entityId === 'create') {
      this.dataInit = true;
    }
  }

  override get formData(): any {
    return this.svc?.formData;
  }

  @Input() serviceRoleAttributes: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  isEditing = false;
  enrollmentExpiration: any;
  jwt: any;
  token: any;
  strategies = [
    {id: 'smartrouting', label: 'Smart Routing'},
    {id: 'sticky', label: 'Sticky'},
    {id: 'weighted', label: 'Weighted'},
    {id: 'random', label: 'Random'},
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

  formView = 'simple';
  formDataInvalid = false;
  settings: any = {};
  configFilterChangedDebounced: any = debounce((filterText: string) => this.configFilterChanged(filterText), 300, {trailing: true});

  override entityType = 'services';
  override entityClass = Service;

  @ViewChild("configEditor", {read: ConfigEditorComponent}) configEditor!: ConfigEditorComponent;
  constructor(
      @Inject(SETTINGS_SERVICE) protected override settingsService: SettingsService,
      public svc: ServiceFormService,
      @Inject(ZITI_DATA_SERVICE) override zitiService: ZitiDataService,
      growlerService: GrowlerService,
      @Inject(SERVICE_EXTENSION_SERVICE) extService: ExtensionService,
      protected override router: Router,
      protected override route: ActivatedRoute,
      location: Location,
      dialogForm: MatDialog
  ) {
    super(growlerService, extService, zitiService, router, route, location, settingsService, dialogForm);
    this.formData = {};
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.svc.saveDisabled = false;
    this.svc.selectedConfigId = undefined;
    this.subscription.add(
      this.settingsService.settingsChange.subscribe((results:any) => {
        this.settings = results;
      })
    );
  }

  override entityUpdated() {
    super.entityUpdated();
    this.getServiceRoleAttributes();
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
    this.loadTags();
    unset(this.formData, '_links');
    this.initData = cloneDeep(this.formData);
    this.extService.updateFormData(this.formData);
  }

  getServiceRoleAttributes() {
    this.getRoleAttributes('service-role-attributes').then((attributes) => {
      this.serviceRoleAttributes = attributes;
    });
  }

  ngOnDestroy() {
    this.extService?.closed?.emit({});
    this.subscription.unsubscribe();
  }

  override ngAfterViewInit() {
    super.ngAfterViewInit();
    this.nameFieldInput.nativeElement.focus();
    this.svc.configEditor = this.configEditor;
    this.svc.getConfigTypes();
    this.svc.getRouters();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.isEditing = !isEmpty(this.formData.id);
  }

  configChanged($event) {
    if (this.svc.selectedConfigId === 'add-new') {
      this.svc.newConfigName = '';
    }
    this.svc.configChanged();
  }

  configFilterChanged(filterText: string) {
    const filters = [];
    if (filterText && filterText !== '') {
      filters.push({
        columnId: 'name',
        value: filterText,
        label: filterText,
        filterName: 'Name',
        type: 'TEXTINPUT',
      });
    }
    if (this.svc.selectedConfigTypeId) {
      filters.push({
        columnId: 'type',
        value: this.svc.selectedConfigTypeId,
        label: this.svc.selectedConfigTypeId,
        filterName: 'Config Type',
        type: 'TEXTINPUT',
        verb: '=',
        rawFilter: true
      });
    }
    this.svc.getConfigs(filters, 1);
  }

  configTypeChanged($event) {
    this.svc.selectedConfigId = '';
    this.svc.newConfigName = '';
    const filters = [];
    if (isEmpty(this.svc.selectedConfigTypeId)) {
      this.svc.configTypeChanged();
      return;
    }
    if (this.svc.selectedConfigTypeId) {
      filters.push({
        columnId: 'type',
        value: this.svc.selectedConfigTypeId,
        label: this.svc.selectedConfigTypeId,
        filterName: 'Config Type',
        type: 'TEXTINPUT',
        verb: '=',
        rawFilter: true
      });
    }
    this.svc.getConfigs(filters,1).then(() => {
      this.svc.configTypeChanged();
    });
  }

  get showConfigData() {
    return this.svc.selectedConfigId === 'add-new' || this.svc.selectedConfigId === 'preview';
  }

  attachConfig() {
    this.configEditor.getConfigDataFromForm();
    this.svc.attachConfig(this.svc.selectedConfigId);
  }

  captureConfigEnterEvent(event) {
    event.stopPropagation();
    this.configEditor.getConfigDataFromForm();
    this.svc.attachConfig(this.svc.selectedConfigId);
  }

  protected override deleteServiceWithOrphans(): Promise<any> {
    return this.getOrphanedEntities().then((orphans) => {
      return this.deleteServiceAndOrphans(orphans);
    });
  }

  protected override openPreviewDeletions() {
    // Close the confirm dialog first
    if (this['deleteConfirmDialogRef']) {
      this['deleteConfirmDialogRef'].close();
    }

    this.getOrphanedEntities().then((serviceItem) => {
      const data = {
        appendId: 'PreviewServiceDeletions',
        title: 'Preview Deletions',
        subtitle: 'Preview of all associated entities that will be orphaned and deleted',
        selectedItems: [serviceItem],
        deleteConfirmed: true
      };

      const dialogRef = this.dialogForm.open(PreviewSelectionsComponent, {
        data: data,
        autoFocus: false,
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result?.confirmed) {
          this.isLoading = true;
          this.deleteServiceAndOrphans(serviceItem).then(() => {
            const growlerData = new GrowlerModel(
              'success',
              'Success',
              `Service Deleted`,
              `Successfully deleted service "${this.formData.name}" and all orphaned entities`,
            );
            this.growlerService.show(growlerData);
            this.router?.navigateByUrl(this.basePath || 'services');
          }).catch((error) => {
            const growlerData = new GrowlerModel(
              'error',
              'Error',
              `Delete Failed`,
              `Failed to delete service: ${error?.error?.error?.message || error?.message || 'Unknown error'}`,
            );
            this.growlerService.show(growlerData);
          }).finally(() => {
            this.isLoading = false;
          });
        }
      });
    });
  }

  private getOrphanedEntities(): Promise<any> {
    const serviceItem = {
      id: this.formData.id,
      name: this.formData.name,
      associatedConfigs: [],
      associatedServicePolicies: []
    };

    const configsPromise = this.zitiService.getSubdata('services', this.formData.id, 'configs').then((result) => {
      const configs = result.data;
      const configPromises = configs.map((config) => {
        return this.zitiService.getSubdata('configs', config.id, 'services').then((result) => {
          const associatedServices = result.data;
          const isOrphan = !associatedServices.some((svc) => svc.id !== this.formData.id);
          if (isOrphan) {
            serviceItem.associatedConfigs.push({id: config.id, name: config.name});
          }
        });
      });
      return Promise.all(configPromises);
    }).catch(() => Promise.resolve());

    const policiesPromise = this.zitiService.getSubdata('services', this.formData.id, 'service-policies').then((result) => {
      const policies = result.data;
      const policyPromises = policies.map((pol) => {
        const roleAttributes = pol.serviceRoles.filter((attr) => attr.charAt(0) === '#').map((attr) => attr.substring(1));
        if (roleAttributes.length === 0) {
          // Policy uses direct service references (@serviceId), not role attributes
          // If it only references this service, it's an orphan
          const directRefs = pol.serviceRoles.filter((attr) => attr.charAt(0) === '@').map((attr) => attr.substring(1));
          const onlyReferencesThisService = directRefs.length === 1 && directRefs[0] === this.formData.id;
          if (onlyReferencesThisService) {
            serviceItem.associatedServicePolicies.push({id: pol.id, name: pol.name});
          }
          return Promise.resolve();
        }
        return this.zitiService.get('services', {}, roleAttributes).then((result: any) => {
          const services = result.data || [];
          const isOrphan = !services.some((svc) => svc.id !== this.formData.id);
          if (isOrphan) {
            serviceItem.associatedServicePolicies.push({id: pol.id, name: pol.name});
          }
        });
      });
      return Promise.all(policyPromises);
    }).catch(() => Promise.resolve());

    return Promise.all([configsPromise, policiesPromise]).then(() => serviceItem);
  }

  private deleteServiceAndOrphans(serviceItem): Promise<any> {
    const promises = [];
    promises.push(this.zitiService.delete('services', serviceItem.id));

    serviceItem.associatedConfigs.forEach((config) => {
      promises.push(this.zitiService.delete('configs', config.id));
    });

    serviceItem.associatedServicePolicies.forEach((policy) => {
      promises.push(this.zitiService.delete('service-policies', policy.id));
    });

    return Promise.all(promises);
  }

  headerActionRequested(action) {
    switch(action.name) {
      case 'save':
        this.save();
        break;
      case 'close':
        this.resetForm();
        this.returnToListPage();
        break;
      case 'toggle-view':
        this.formView = action.data;
        break;
      case 'delete':
        this.deleteEntity();
        break;
    }
  }

  async save(event?) {
    this.formData.name = this.formData.name.trim();
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
        this.checkDataChange();
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
      this.returnToListPage();
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

  resetForm() {
    this.svc.selectedConfigId = '';
    this.svc.selectedConfigTypeId = '';
    this.errors = {};
    this.svc.configErrors = {};
  }

  clear(): void {
  }

}
