import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
  Output,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  Inject
} from '@angular/core';
import {Subscription} from 'rxjs';
import {ProjectableForm} from "../projectable-form.class";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";

import {isEmpty, cloneDeep, invert} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {ServicePolicyFormService, SERVICE_POLICY_EXTENSION_SERVICE} from './service-policy-form.service';
import {MatDialogRef} from "@angular/material/dialog";
import {ExtensionService} from "../../extendable/extensions-noop.service";
import {ServicePolicy} from "../../../models/service-policy";
import {GrowlerModel} from "../../messaging/growler.model";

@Component({
  selector: 'lib-service-policy-form',
  templateUrl: './service-policy-form.component.html',
  styleUrls: ['./service-policy-form.component.scss'],
  providers: [
    {
      provide: MatDialogRef,
      useValue: {}
    }
  ]
})
export class ServicePolicyFormComponent extends ProjectableForm implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() formData: ServicePolicy | any = {};
  @Input() serviceRoleAttributes: any[] = [];
  @Input() serviceNamedAttributes: any[] = [];
  @Input() serviceNamedAttributesMap = {};
  @Input() identityRoleAttributes: any[] = [];
  @Input() identityNamedAttributes: any[] = [];
  @Input() identityNamedAttributesMap = {};
  @Input() postureRoleAttributes: any[] = [];
  @Input() postureNamedAttributes: any[] = [];
  @Input() postureNamedAttributesMap = {};
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  selectedServiceRoleAttributes = [];
  selectedServiceNamedAttributes = [];
  selectedIdentityRoleAttributes = [];
  selectedIdentityNamedAttributes = [];
  selectedPostureRoleAttributes = [];
  selectedPostureNamedAttributes = [];

  formView = 'simple';
  isEditing = false;
  isLoading = false;
  servicesLoading = false;
  identitiesLoading = false;
  postureChecksLoading = false;

  showMore = false;
  settings: any = {};
  subscription: Subscription = new Subscription();

  constructor(
      @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
      public svc: ServicePolicyFormService,
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      growlerService: GrowlerService,
      @Inject(SERVICE_POLICY_EXTENSION_SERVICE) extService: ExtensionService
  ) {
    super(growlerService, extService);
  }

  ngOnInit(): void {
    this.subscription.add(
        this.settingsService.settingsChange.subscribe((results:any) => {
          this.settings = results;
        })
    );
    if (isEmpty(this.formData.id)) {
      this.formData = new ServicePolicy();
    }
    this.initData = cloneDeep(this.formData);
    this.initSelectedAttributes();
    this.extService.updateFormData(this.formData);
    this.subscription.add(
        this.extService.formDataChanged.subscribe((data) => {
          if (data.isEmpty) {
            return;
          }
          this.formData = data;
        })
    );
    this.svc.serviceNamedAttributesMap = this.serviceNamedAttributesMap;
    this.svc.identityNamedAttributesMap = this.identityNamedAttributesMap;
    this.initData = cloneDeep(this.formData);
  }

  ngOnDestroy() {
    this.extService.closed.emit({});
    this.subscription.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.isEditing = !isEmpty(this.formData.id);
  }

  initSelectedAttributes() {
    if (isEmpty(this.formData.id)) {
      this.svc.associatedServices = [];
      this.svc.associatedServiceNames = [];
      this.svc.associatedIdentities = [];
      this.svc.associatedIdentityNames = [];
      this.svc.associatedPostureChecks = [];
      this.svc.associatedPostureCheckNames = [];
      return;
    }
    const serviceIdAttributesMap = invert(this.serviceNamedAttributesMap);
    const identityIdAttributesMap = invert(this.identityNamedAttributesMap);
    const postureIdAttributesMap = invert(this.postureNamedAttributesMap);
    this.selectedServiceRoleAttributes = [];
    this.selectedServiceNamedAttributes = [];
    this.selectedIdentityRoleAttributes = [];
    this.selectedIdentityNamedAttributes = [];
    this.selectedPostureRoleAttributes = [];
    this.selectedPostureNamedAttributes = [];
    this.formData.serviceRoles?.forEach(attr => {
      if (attr.indexOf('@') === 0) {
        this.selectedServiceNamedAttributes.push(serviceIdAttributesMap[attr.substring(1)]);
      } else {
        this.selectedServiceRoleAttributes.push(attr.substring(1));
      }
    });
    this.formData.identityRoles?.forEach(attr => {
      if (attr.indexOf('@') === 0) {
        this.selectedIdentityNamedAttributes.push(identityIdAttributesMap[attr.substring(1)]);
      } else {
        this.selectedIdentityRoleAttributes.push(attr.substring(1));
      }
    });
    this.formData.postureCheckRoles?.forEach(attr => {
      if (attr.indexOf('@') === 0) {
        this.selectedPostureNamedAttributes.push(postureIdAttributesMap[attr.substring(1)]);
      } else {
        this.selectedPostureRoleAttributes.push(attr.substring(1));
      }
    });
    this.svc.getAssociatedServicesByAttribute(this.selectedServiceRoleAttributes, this.selectedServiceNamedAttributes);
    this.svc.getAssociatedIdentitiesByAttribute(this.selectedIdentityRoleAttributes, this.selectedIdentityNamedAttributes);
    this.svc.getAssociatedPostureChecksByAttribute(this.selectedPostureRoleAttributes, this.selectedPostureNamedAttributes);
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
    const isValid = this.validate();
    const isExtValid = await this.extService.validateData();
    if(!isValid || !isExtValid) {
      const growlerData = new GrowlerModel(
          'error',
          'Error',
          `Data Invalid`,
          `Service Policy data is invalid. Please update the highlighted fields and try again.`,
      );
      this.growlerService.show(growlerData);
      return;
    }

    this.isLoading = true;
    this.applySelectedAttributes();
    this.svc.save(this.formData).then((result) => {
      if (result?.close) {
        this.closeModal(true, true);
      }
      const data = result?.data?.id ? result.data : result;
      if (!isEmpty(data.id)) {
        this.formData = data || this.formData;
        this.initData = this.formData;
      } else {
        this.initData = this.formData;
      }
    }).finally(() => {
      this.isLoading = false;
    });
  }

  applySelectedAttributes() {
    this.formData.serviceRoles = this.svc.getSelectedRoles(this.selectedServiceRoleAttributes, this.selectedServiceNamedAttributes, this.serviceNamedAttributesMap);
    this.formData.identityRoles = this.svc.getSelectedRoles(this.selectedIdentityRoleAttributes, this.selectedIdentityNamedAttributes, this.identityNamedAttributesMap);
    this.formData.postureCheckRoles = this.svc.getSelectedRoles(this.selectedPostureRoleAttributes, this.selectedPostureNamedAttributes, this.postureNamedAttributesMap);
  }

  validate() {
    this.errors = {};
    if (isEmpty(this.formData.name)) {
      this.errors['name'] = true;
    }
    return isEmpty(this.errors);
  }

  get apiCallURL() {
    return this.settings.selectedEdgeController + '/edge/management/v1/service-policies' + (this.formData.id ? `/${this.formData.id}` : '');
  }

  get apiData() {
    const data: any = {
      name: this.formData?.name || '',
      appData: this.formData?.appData || '',
      serviceRoles: this.svc.getSelectedRoles(this.selectedServiceRoleAttributes, this.selectedServiceNamedAttributes, this.serviceNamedAttributesMap),
      identityRoles: this.svc.getSelectedRoles(this.selectedIdentityRoleAttributes, this.selectedIdentityNamedAttributes, this.identityNamedAttributesMap),
      postureCheckRoles: this.svc.getSelectedRoles(this.selectedPostureRoleAttributes, this.selectedPostureNamedAttributes, this.postureNamedAttributesMap),
      semantic: this.formData.semantic,
      type: this.formData.type
    }
    return data;
  }

  _apiData = {};
  set apiData(data) {
    this._apiData = data;
  }

  clear(): void {
  }
}
