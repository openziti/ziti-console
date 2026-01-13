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
import {ActivatedRoute, Router} from "@angular/router";
import {Location} from "@angular/common";

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
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  selectedServiceRoleAttributes = [];
  selectedServiceNamedAttributes = [];
  selectedIdentityRoleAttributes = [];
  selectedIdentityNamedAttributes = [];
  selectedPostureRoleAttributes = [];
  selectedPostureNamedAttributes = [];

  formView = 'simple';
  isEditing = false;
  servicesLoading = false;
  identitiesLoading = false;
  postureChecksLoading = false;

  settings: any = {};

  override entityType = 'service-policies';
  override entityClass = ServicePolicy;

  constructor(
      @Inject(SETTINGS_SERVICE) protected override settingsService: SettingsService,
      public svc: ServicePolicyFormService,
      @Inject(ZITI_DATA_SERVICE) override zitiService: ZitiDataService,
      growlerService: GrowlerService,
      @Inject(SERVICE_POLICY_EXTENSION_SERVICE) extService: ExtensionService,
      protected override router: Router,
      protected override route: ActivatedRoute,
      location: Location
  ) {
    super(growlerService, extService, zitiService, router, route, location, settingsService);
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.subscription.add(
        this.settingsService.settingsChange.subscribe((results:any) => {
          this.settings = results;
        })
    );
  }

  override entityUpdated() {
    const promises = [];
    promises.push(this.svc.getServiceRoleAttributes());
    promises.push(this.svc.getIdentityRoleAttributes());
    promises.push(this.svc.getServiceNamedAttributes());
    promises.push(this.svc.getIdentityNamedAttributes());
    promises.push(this.svc.getPostureNamedAttributes());
    Promise.all(promises).then(() => {
      this.initSelectedAttributes();
    });
    if (isEmpty(this.formData.id)) {
      this.formData = new ServicePolicy();
    }
    this.initData = cloneDeep(this.formData);
    this.extService.updateFormData(this.formData);
    this.subscription.add(
        this.extService.formDataChanged.subscribe((data) => {
          if (data.isEmpty) {
            return;
          }
          this.formData = data;
        })
    );
    this.initData = cloneDeep(this.formData);
  }

  ngOnDestroy() {
    this.extService?.closed?.emit({});
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
    const serviceIdAttributesMap = invert(this.svc.serviceNamedAttributesMap);
    const identityIdAttributesMap = invert(this.svc.identityNamedAttributesMap);
    const postureIdAttributesMap = invert(this.svc.postureNamedAttributesMap);
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
    this.svc.getAssociatedServicesByAttribute(this.selectedServiceRoleAttributes, this.selectedServiceNamedAttributes, this.formData.semantic);
    this.svc.getAssociatedIdentitiesByAttribute(this.selectedIdentityRoleAttributes, this.selectedIdentityNamedAttributes, this.formData.semantic);
    this.svc.getAssociatedPostureChecksByAttribute(this.selectedPostureRoleAttributes, this.selectedPostureNamedAttributes, this.formData.semantic);
  }

  headerActionRequested(action) {
    switch(action.name) {
      case 'save':
        this.save();
        break;
      case 'close':
        this.returnToListPage();
        break;
      case 'toggle-view':
        this.formView = action.data;
        break;
    }
  }

  async save(event?) {
    this.formData.name = this.formData.name.trim();
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
      this._dataChange = false;
      if (!isEmpty(data.id)) {
        this.formData = data || this.formData;
        this.initData = this.formData;
      } else {
        this.initData = this.formData;
      }
      this.returnToListPage();
    }).finally(() => {
      this.isLoading = false;
    });
  }

  applySelectedAttributes() {
    this.formData.serviceRoles = this.svc.getSelectedRoles(this.selectedServiceRoleAttributes, this.selectedServiceNamedAttributes, this.svc.serviceNamedAttributesMap);
    this.formData.identityRoles = this.svc.getSelectedRoles(this.selectedIdentityRoleAttributes, this.selectedIdentityNamedAttributes, this.svc.identityNamedAttributesMap);
    this.formData.postureCheckRoles = this.svc.getSelectedRoles(this.selectedPostureRoleAttributes, this.selectedPostureNamedAttributes, this.svc.postureNamedAttributesMap);
  }

  validate() {
    this.errors = {};
    if (isEmpty(this.formData.name)) {
      this.errors['name'] = true;
    }
    return isEmpty(this.errors);
  }

  apiActionRequested(action) {
    switch (action.id) {
      case 'cli':
        this.copyCLICommand();
        break;
      case 'curl':
        this.copyCURLCommand();
        break;
    }
  }

  copyCLICommand() {
    const serviceRoles = this.svc.getSelectedRoles(this.selectedServiceRoleAttributes, this.selectedServiceNamedAttributes, this.svc.serviceNamedAttributesMap);
    const serviceRolesVar = this.getRolesCLIVariable(serviceRoles);

    const identityRoles = this.svc.getSelectedRoles(this.selectedIdentityRoleAttributes, this.selectedIdentityNamedAttributes, this.svc.identityNamedAttributesMap);
    const identityRolesVar = this.getRolesCLIVariable(identityRoles);

    const pcRoles = this.svc.getSelectedRoles(this.selectedPostureRoleAttributes, this.selectedPostureNamedAttributes, this.svc.postureNamedAttributesMap);
    const pcRolesVar = this.getRolesCLIVariable(pcRoles);

    const command = `ziti edge ${this.formData.id ? 'update' : 'create'} service-policy ${this.formData.id ? `'${this.formData.id}'` : ''} ${this.formData.id ? '--name' : ''} '${this.formData.name}' ${this.formData.id ? '' : this.formData.type}${this.formData.id ? '' : ` --semantic '${this.formData.semantic}'`} --service-roles '${serviceRolesVar}' --identity-roles '${identityRolesVar}' --posture-check-roles '${pcRolesVar}'`;

    navigator.clipboard.writeText(command);
    const growlerData = new GrowlerModel(
        'success',
        'Success',
        `Text Copied`,
        `CLI command copied to clipboard`,
    );
    this.growlerService.show(growlerData);
  }

  copyCURLCommand() {
    const serviceRoles = this.svc.getSelectedRoles(this.selectedServiceRoleAttributes, this.selectedServiceNamedAttributes, this.svc.serviceNamedAttributesMap);
    const serviceRolesVar = this.getRolesCURLVariable(serviceRoles);

    const identityRoles = this.svc.getSelectedRoles(this.selectedIdentityRoleAttributes, this.selectedIdentityNamedAttributes, this.svc.identityNamedAttributesMap);
    const identityRolesVar = this.getRolesCURLVariable(identityRoles);

    const pcRoles = this.svc.getSelectedRoles(this.selectedPostureRoleAttributes, this.selectedPostureNamedAttributes, this.svc.postureNamedAttributesMap);
    const pcRolesVar = this.getRolesCURLVariable(pcRoles);

    const command = `curl '${this.apiCallURL}' \\
    ${this.formData.id ? '--request PATCH \\' : '\\'}
    -H 'accept: application/json' \\
    -H 'content-type: application/json' \\
    -H 'zt-session: ${this.settings.session.id}' \\
    --data-raw '{"name":"${this.formData.name}","serviceRoles":${serviceRolesVar},"identityRoles":${identityRolesVar},"postureCheckRoles":${pcRolesVar},"semantic":"${this.formData.semantic}","type":"${this.formData.type}"}'`;

    navigator.clipboard.writeText(command);
    const growlerData = new GrowlerModel(
        'success',
        'Success',
        `Text Copied`,
        `CURL command copied to clipboard`,
    );
    this.growlerService.show(growlerData);
  }

  get apiCallURL() {
    return this.settings.selectedEdgeController + '/edge/management/v1/service-policies' + (this.formData.id ? `/${this.formData.id}` : '');
  }

  get apiData() {
    const data: any = {
      name: this.formData?.name || '',
      appData: this.formData?.appData || '',
      serviceRoles: this.svc.getSelectedRoles(this.selectedServiceRoleAttributes, this.selectedServiceNamedAttributes, this.svc.serviceNamedAttributesMap),
      identityRoles: this.svc.getSelectedRoles(this.selectedIdentityRoleAttributes, this.selectedIdentityNamedAttributes, this.svc.identityNamedAttributesMap),
      postureCheckRoles: this.svc.getSelectedRoles(this.selectedPostureRoleAttributes, this.selectedPostureNamedAttributes, this.svc.postureNamedAttributesMap),
      semantic: this.formData?.semantic,
      type: this.formData?.type,
      tags: this.formData?.tags
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
