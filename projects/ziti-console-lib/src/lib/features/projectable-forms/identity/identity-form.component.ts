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
  Output,
  OnChanges,
  SimpleChanges,
  AfterViewInit,
  Inject
} from '@angular/core';
import {ProjectableForm} from "../projectable-form.class";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";

import {isEmpty, isNil, forOwn, cloneDeep, set, unset} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {IDENTITY_EXTENSION_SERVICE, IdentityFormService} from './identity-form.service';
import {MatDialog, MatDialogRef} from "@angular/material/dialog";
import {IdentitiesPageService} from "../../../pages/identities/identities-page.service";
import {ExtensionService} from "../../extendable/extensions-noop.service";
import {ActivatedRoute, Router} from "@angular/router";
import {Identity} from "../../../models/identity";
import {Location} from "@angular/common";
import moment from "moment/moment";
import {FilterObj} from "../../data-table/data-table-filter.service";
import {ConfirmComponent} from "../../confirm/confirm.component";
import {GrowlerModel} from "../../messaging/growler.model";

@Component({
  selector: 'lib-identity-form',
  templateUrl: './identity-form.component.html',
  styleUrls: ['./identity-form.component.scss'],
  providers: [
    {
      provide: MatDialogRef,
      useValue: {}
    }
  ],
})
export class IdentityFormComponent extends ProjectableForm implements OnInit, OnChanges, AfterViewInit {
  @Input() formData: any = {};
  @Input() identityRoleAttributes: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  override entityType = 'identities';
  override entityClass = Identity;

  isEditing = false;
  enrollmentExpiration: any;
  jwt: any;
  associatedServicePolicies: any = [];
  associatedServicePolicyNames: any = [];
  associatedServices: any = [];
  associatedServiceNames: any = [];
  servicesLoading = false;
  servicePoliciesLoading = false;
  authPolicies: any = [];

  formView = 'simple';
  enrollmentType = 'ott';
  enrollmentCA;
  enrollmentUPDB = '';
  settings: any = {};
  testResult: string = '';
  testResultOpen = false;

  cas = [];
  dialogRef: any;

  constructor(
      @Inject(SETTINGS_SERVICE) protected override settingsService: SettingsService,
      public svc: IdentityFormService,
      public identitiesService: IdentitiesPageService,
      @Inject(ZITI_DATA_SERVICE) override zitiService: ZitiDataService,
      growlerService: GrowlerService,
      @Inject(IDENTITY_EXTENSION_SERVICE) extService: ExtensionService,
      protected override router: Router,
      protected override route: ActivatedRoute,
      location: Location,
      protected dialogForm: MatDialog,
  ) {
    super(growlerService, extService, zitiService, router, route, location, settingsService);
    this.identityRoleAttributes = [];
    this.getAuthPolicies();
  }

  override ngOnInit(): void {
    super.ngOnInit();
    this.settingsService.settingsChange.subscribe((results:any) => {
      this.settings = results;
    });
  }

  override ngAfterViewInit() {
    super.ngAfterViewInit();
    this.nameFieldInput.nativeElement.focus();
    this.resetTags();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.isEditing = !isEmpty(this.formData.id);
  }

  override entityUpdated() {
    if (this.formData.id) {
      this.formData.badges = [];
      if (this.formData.hasApiSession || this.formData.hasEdgeRouterConnection) {
        this.formData.badges.push({label: 'Online', class: 'online', circle: 'true'});
      } else {
        this.formData.badges.push({label: 'Offline', class: 'offline', circle: 'false'});
      }
      if (this.formData.enrollment?.ott) {
        this.formData.badges.push({label: 'Unregistered', class: 'unreg'});
      }
      if (this.formData.disabled) {
        this.formData.badges.push({label: 'Disabled', class: 'unreg'});
      }
      this.jwt = this.identitiesService.getJWT(this.formData);
      this.enrollmentExpiration = this.identitiesService.getEnrollmentExpiration(this.formData);
    }
    this.initEnrollmentType();
    this.getIdentityRoleAttributes();
    this.getAssociatedServices();
    this.getAssociatedServicePolicies();
    this.getCertificateAuthorities();
    this.loadTags();
    unset(this.formData, '_links');
    this.initData = cloneDeep(this.formData);
    this.extService.updateFormData(this.formData);
  }

  refreshIdentity() {
    this.svc.refreshIdentity(this.formData.id).then(result => {
      this.formData = result.data;
      this.initData = cloneDeep(this.formData);
      this.enrollmentExpiration = this.identitiesService.getEnrollmentExpiration(this.formData);
      this.jwt = this.identitiesService.getJWT(this.formData);
      this.extService.updateFormData(this.formData);
    })
  }

  initEnrollmentType() {
    if (this.formData?.enrollment?.ott) {
      this.enrollmentType = 'ott';
    } else if (this.formData?.enrollment?.updb) {
      this.enrollmentType = 'updb';
    } else if (this.formData?.enrollment?.ottca) {
      this.enrollmentType = 'CA';
    } else if (isEmpty(this.formData?.enrollment)) {
      this.enrollmentType = 'none';
    }
  }

  getIdentityRoleAttributes() {
      this.getRoleAttributes('identity-role-attributes').then((attributes) => {
          this.identityRoleAttributes = attributes;
      });
  }

  getAssociatedServices() {
    this.zitiService.getSubdata('identities', this.formData.id, 'services').then((result: any) => {
      this.associatedServices = result.data;
      this.associatedServiceNames = this.associatedServices.map((svc) => {
        return svc.name;
      });
    });
  }

  getAssociatedServicePolicies() {
    this.zitiService.getSubdata('identities', this.formData.id, 'service-policies').then((result: any) => {
      this.associatedServicePolicies = result.data;
      this.associatedServicePolicyNames = this.associatedServicePolicies.map((policy) => {
        return policy.name;
      });
    });
  }

  getCertificateAuthorities() {
    const paging = {
      filter: "",
      noSearch: true,
      order: "asc",
      page: 1,
      searchOn: "name",
      sort: "name",
      total: 100
    }
    this.zitiService.get('cas', paging, []).then((result: any) => {
      this.cas = [...result.data];
      if (this.cas.length > 0) {
        this.enrollmentCA = this.cas[0].id;
      }
    });
  }

  getAuthPolicies() {
    const paging = {
      filter: "",
      noSearch: true,
      order: "asc",
      page: 1,
      searchOn: "name",
      sort: "name",
      total: 100
    }
    this.zitiService.get('auth-policies', paging, []).then((result: any) => {
      this.authPolicies = [...result.data];
    });
  }

  get hasAuthenticator() {
    return this.identitiesService.hasAuthenticator(this.formData);
  }

  get hasEnrolmentToken() {
    return this.identitiesService.hasEnrolmentToken(this.formData);
  }

  get jwtExpired() {
    return false;
  }

  headerActionRequested(action) {
    switch(action.name) {
      case 'save':
        this.save();
        break;
      case 'close':
        this.closeForm();
        break;
      case 'toggle-view':
        this.formView = action.data;
        this.resetTags();
        break;
    }
  }

  updateEnrollment() {
    switch (this.enrollmentType) {
      case 'ott':
        this.formData.enrollment = {ott: true}
        break;
      case 'CA':
        this.formData.enrollment = {ottca: this.enrollmentCA};
        break;
      case 'updb':
        this.formData.enrollment = {updb: this.enrollmentUPDB};
        break;
      case 'none':
        this.formData.enrollment = {};
        break;
      default:
        this.formData.enrollment = {ott: true}
        break;
    }
  }

  save(event?) {
    this.formData.name = this.formData.name.trim();
    if(!this.validate()) {
      return;
    }
    const tagVals = this.getTagValues();
    if (!isEmpty(tagVals)) {
      forOwn(tagVals, (value, key) => {
        this.formData.tags[key] = value;
      });
    }
    this.isLoading = true;
    this.svc.save(this.formData).then((result) => {
      if (this.isModal) {
        this.closeModal(true, true);
        return;
      }
      this.initData = this.formData;
      this._dataChange = false;
      this.returnToListPage();
    }).finally(() => {
      this.isLoading = false;
    });
  }

  validate(identity?) {
    this.errors = {};
    if (isEmpty(this.formData.name)) {
      this.errors['name'] = true;
    }
    if (this.enrollmentType === 'CA' && (isEmpty(this.enrollmentCA) || isNil(this.enrollmentCA))) {
      this.errors['enrollmentCA'] = true;
    }
    if (this.enrollmentType === 'updb' && (isEmpty(this.enrollmentUPDB) || isNil(this.enrollmentUPDB))) {
      this.errors['enrollmentUPDB'] = true;
    }
    return isEmpty(this.errors);
  }

  get enrollmentTypeTitle() {
    return this.enrollmentType === 'CA' ? 'CERTIFICATE AUTHORITY' : (this.enrollmentType === 'updb' && !this.isEditing) ? 'UPDB USERNAME' : undefined;
  }
  get apiCallURL() {
    return this.settings.selectedEdgeController + '/edge/management/v1/identities' + (this.formData.id ? `/${this.formData.id}` : '');
  }

  get apiData() {
    const data: any = {
      name: this.formData?.name || '',
      type: this.formData?.type?.name || this.formData?.type || '',
      appData: this.formData?.appData || '',
      isAdmin: this.formData?.isAdmin || '',
      roleAttributes: this.formData?.roleAttributes || '',
      authPolicyId: this.formData?.authPolicyId || '',
      externalId: this.formData?.externalId || '',
      defaultHostingCost: this.formData?.defaultHostingCost || '0',
      defaultHostingPrecedence: this.formData?.defaultHostingPrecedence || 'defaultHostingPrecedence',
      tags: this.formData?.tags
    };
    if (!this.isEditing) {
      data.enrollment = this.formData.enrollment || {ott: true};
    }
    return data;
  }

  _apiData = {};
  set apiData(data) {
    this._apiData = data;
  }

  serviceSelected(serviceName) {
    let service: any = {};
    this.associatedServices.forEach((svc) => {
      if(svc.name === serviceName) {
        service = svc;
      }
    });
    this.svc.testService(this.formData.id, service.id).then((result) => {
      this.testResult = result;
      this.testResultOpen = true;
    });
  }

  selectedRange
  disableDurationType = 'indefinite';
  identityDisabled = false;
  disableDuration =  new Date();
  minDate = new Date();

  toggleDisableIdentity() {
    this.identityDisabled = !this.identityDisabled;
  }

  toggleIsAdmin() {
    this.formData.isAdmin = !this.formData.isAdmin;
  }

  setDisabledDate(range) {
    let label;
    let date = moment();
    let closeCalendar = true;
    const dateEncoded = encodeURIComponent(date.toISOString());
  }

  get identityType() {
    return this.isEditing ? this.formData.type.name : this.formData.type;
  }

  set identityType(type) {
    if (this.isEditing) {
      set(this.formData, 'type.name', type);
    } else {
      set(this.formData, 'type', type);
    }
  }

  get entityDisabled() {
    return this.formData?.disabled;
  }

  disableIdentity() {
    const localDate = moment(this.disableDuration).local();
    const minutesDifference = localDate.diff(moment(), 'minutes');
    const confirmData = {
      appendId: 'DisableIdentity',
      title: 'Disable Identity',
      message: `Are you sure you would like to disable this identity ${this.disableDurationType === 'indefinite' ? 'indefinitely' : `until: <br>${localDate}`}?`,
      confirmLabel: 'Yes',
      cancelLabel: 'Oops, no get me out of here',
      showCancelLink: true,
      imageUrl: '../../assets/svgs/Growl_Warning.svg',
    };
    this.dialogRef = this.dialogForm.open(ConfirmComponent, {
      data: confirmData,
      autoFocus: false,
    });
    this.dialogRef.afterClosed().subscribe({
      next: (result) => {
        this.zitiService.post(`/identities/${this.formData.id}/disable`, {durationMinutes: minutesDifference}).then((result) => {
          const growlerData = new GrowlerModel(
              'success',
              'Success',
              `Identity Disabled`,
              `Successfully disabled identity`,
          );
          this.growlerService.show(growlerData);
          this.refreshIdentity();
        }).catch((error) => {
          const errorMessage = this.zitiService.getErrorMessage(error);
          const growlerData = new GrowlerModel(
              'error',
              'Error',
              `Failed to Disabled`,
              `Unable to disable identity: "${errorMessage}"`,
          );
          this.growlerService.show(growlerData);
          this.refreshIdentity();
        });
      },
    })
  }

  enableIdentity() {
    const confirmData = {
      appendId: 'EnableIdentity',
      title: 'Enable Identity',
      message: `Are you sure you would like to enable this identity?`,
      confirmLabel: 'Yes',
      cancelLabel: 'Oops, no get me out of here',
      showCancelLink: true,
      imageUrl: '../../assets/svgs/Growl_Warning.svg',
    };
    this.dialogRef = this.dialogForm.open(ConfirmComponent, {
      data: confirmData,
      autoFocus: false,
    });
    this.dialogRef.afterClosed().subscribe({
      next: (result) => {
        this.zitiService.post(`/identities/${this.formData.id}/enable`, {durationMinutes: 0}).then((result) => {
          const growlerData = new GrowlerModel(
              'success',
              'Success',
              `Identity Enabled`,
              `Successfully enabled identity`,
          );
          this.growlerService.show(growlerData);
          this.refreshIdentity();
        }).catch((error) => {
          const errorMessage = this.zitiService.getErrorMessage(error);
          const growlerData = new GrowlerModel(
              'error',
              'Error',
              `Failed to Enable`,
              `Unable to enable identity: "${errorMessage}"`,
          );
          this.growlerService.show(growlerData);
          this.refreshIdentity();
        });
      },
    })
  }

  closeTestResult() {
    this.testResultOpen = false;
  }

  clear(): void {
  }
}
