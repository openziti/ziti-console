import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  AfterViewInit, Inject
} from '@angular/core';
import {ProjectableForm} from "../projectable-form.class";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";

import {isEmpty, forEach, delay, unset, keys, forOwn, cloneDeep, isEqual, set} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {Identity} from "../../../models/identity";
import { IdentityFormService } from './identity-form.service';
import {MatDialogRef} from "@angular/material/dialog";
import {IdentitiesPageService} from "../../../pages/identities/identities-page.service";

@Component({
  selector: 'lib-identity-form',
  templateUrl: './identity-form.component.html',
  styleUrls: ['./identity-form.component.scss'],
  providers: [
    {
      provide: MatDialogRef,
      useValue: {}
    }
  ]
})
export class IdentityFormComponent extends ProjectableForm implements OnInit, OnChanges, AfterViewInit {
  @Input() formData: any = {};
  @Input() identityRoleAttributes: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() dataChange: EventEmitter<any> = new EventEmitter<any>();

  override entityType = 'identity';

  initData: any = {};
  isEditing = false;
  enrollmentExpiration: any;
  jwt: any;
  isLoading = false;
  associatedServicePolicies: any = [];
  associatedServicePolicyNames: any = [];
  associatedServices: any = [];
  associatedServiceNames: any = [];
  servicesLoading = false;
  servicePoliciesLoading = false;
  authPolicies: any = [
    {id: 'default', name: 'Default'}
  ];

  showMore = false;
  errors: any = {};
  formView = 'simple';
  enrollmentType = 'ott';
  enrollmentCA;
  enrollmentUPDB = '';
  settings: any = {};
  testResult: string = '';
  testResultOpen = false;

  @ViewChild('nameFieldInput') nameFieldInput: ElementRef;
  constructor(
      @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
      public svc: IdentityFormService,
      public identitiesService: IdentitiesPageService,
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      private growlerService: GrowlerService
  ) {
    super();
    this.identityRoleAttributes = ['test'];
  }

  ngOnInit(): void {
    this.settingsService.settingsChange.subscribe((results:any) => {
      this.settings = results;
    });
    this.jwt = this.identitiesService.getJWT(this.formData);
    this.enrollmentExpiration = this.identitiesService.getEnrollmentExpiration(this.formData);
    this.getAssociatedServices();
    this.getAssociatedServicePolicies();
    this.getAuthPolicies();
    this.initData = cloneDeep(this.formData);
    this.watchData();
    this.loadTags();
  }

  override ngAfterViewInit() {
    super.ngAfterViewInit();
    this.nameFieldInput.nativeElement.focus();
    this.resetTags();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.isEditing = !isEmpty(this.formData.id);
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
      this.authPolicies = [{id: 'default', name: 'Default'}, ...result.data];
    });
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
        this.closeModal();
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
      default:
        this.formData.enrollment = {ott: true}
        break;
    }
  }

  save(event?) {
    console.log(event);
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
      this.closeModal(true, true);
    }).finally(() => {
      this.isLoading = false;
    });
  }

  validate() {
    this.errors = {};
    if (isEmpty(this.formData.name)) {
      this.errors['name'] = true;
    }
    return isEmpty(this.errors);
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
          roleAttributes: this.formData.roleAttributes || '',
          authPolicyId: this.formData.authPolicyId || '',
          externalId: this.formData.externalId || '',
          defaultHostingCost: this.formData.defaultHostingCost || '0',
          defaultHostingPrecedence: this.formData.defaultHostingPrecedence || 'defaultHostingPrecedence',
          tags: this.formData.tags || ''
    }
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

  closeTestResult() {
    this.testResultOpen = false;
  }

  copyToClipboard(val) {
    navigator.clipboard.writeText(val);
    const growlerData = new GrowlerModel(
        'success',
        'Success',
        `Text Copied`,
        `API call URL copied to clipboard`,
    );
    this.growlerService.show(growlerData);
  }

  closeModal(refresh = false, ignoreChanges = false): void {
    console.log('test');
    if (!ignoreChanges && this._dataChange) {
      const confirmed = confirm('You have unsaved changes. Do you want to leave this page and discard your changes or stay on this page?');
      if (!confirmed) {
        return;
      }
    }
    this.close.emit({refresh: refresh});
  }

  clear(): void {
  }

  rawDataChanged(event) {
    console.log(event);
  }

  _dataChange = false;
  watchData() {
    delay(() => {
      const dataChange = !isEqual(this.initData, this.formData);
      if (dataChange !== this._dataChange) {
        this.dataChange.emit(dataChange);
      }
      this._dataChange = dataChange;
      this.watchData();
    }, 100);
  }
}
