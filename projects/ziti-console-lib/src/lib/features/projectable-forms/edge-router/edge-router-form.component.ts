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
  Inject
} from '@angular/core';
import {Subscription} from 'rxjs';
import {ProjectableForm} from "../projectable-form.class";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";

import {isEmpty, forEach, delay, unset, keys, cloneDeep, isEqual} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {EdgeRouter} from "../../../models/edge-router";
import {EDGE_ROUTER_EXTENSION_SERVICE, EdgeRouterFormService} from './edge-router-form.service';
import {MatDialogRef} from "@angular/material/dialog";
import {IdentitiesPageService} from "../../../pages/identities/identities-page.service";
import {ExtensionService} from "../../extendable/extensions-noop.service";

@Component({
  selector: 'lib-edge-router-form',
  templateUrl: './edge-router-form.component.html',
  styleUrls: ['./edge-router-form.component.scss'],
  providers: [
    {
      provide: MatDialogRef,
      useValue: {}
    }
  ]
})
export class EdgeRouterFormComponent extends ProjectableForm implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() formData: any = {};
  @Input() edgeRouterRoleAttributes: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() dataChange: EventEmitter<any> = new EventEmitter<any>();

  initData: any = {};
  isEditing = false;
  enrollmentExpiration: any;
  jwt: any;
  token: any;
  isLoading = false;
  associatedIdentities: any = [];
  associatedIdentityNames: any = [];
  associatedServices: any = [];
  associatedServiceNames: any = [];
  servicesLoading = false;
  identitiesLoading = false;
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
  subscription: Subscription = new Subscription();

  @ViewChild('nameFieldInput') nameFieldInput: ElementRef;
  constructor(
      @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
      public svc: EdgeRouterFormService,
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      private growlerService: GrowlerService,
      @Inject(EDGE_ROUTER_EXTENSION_SERVICE) private extService: ExtensionService
  ) {
    super();
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
    this.getAssociatedServices();
    this.getAssociatedIdentities();
    this.getAuthPolicies();
    this.initData = cloneDeep(this.formData);
    this.watchData();
    this.extService.updateFormData(this.formData);
    this.subscription.add(
      this.extService.formDataChanged.subscribe((data) => {
        if (data.isEmpty) {
          return;
        }
        this.formData = data;
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
  }

  ngOnChanges(changes: SimpleChanges) {
    this.isEditing = !isEmpty(this.formData.id);
  }

  getAssociatedServices() {
    this.zitiService.getSubdata('edge-routers', this.formData.id, 'services').then((result: any) => {
      this.associatedServices = result.data;
      this.associatedServiceNames = this.associatedServices.map((svc) => {
        return svc.name;
      });
    });
  }

  getAssociatedIdentities() {
    this.zitiService.getSubdata('edge-routers', this.formData.id, 'identities').then((result: any) => {
      this.associatedIdentities = result.data;
      this.associatedIdentityNames = this.associatedIdentities.map((policy) => {
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
    return !isEmpty(this.formData.enrollmentJwt) || !isEmpty(this.formData.enrollmentToken);
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
        this.closeModal(true);
        break;
      case 'toggle-view':
        this.formView = action.data;
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

  async save(event?) {
    const isValid = this.validate();
    const isExtValid = await this.extService.validateData();
    if(!isValid || !isExtValid) {
      return;
    }

    this.isLoading = true;
    this.svc.save(this.formData).then((result) => {
      if (result?.close) {
        this.closeModal(true, true);
      }
      if (!isEmpty(result?.id)) {
        this.formData = result?.data || this.formData;
        this.initData = this.formData;
      } else {
        this.initData = this.formData;
      }
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
          appData: this.formData?.appData || '',
          roleAttributes: this.formData.roleAttributes || '',
          isTunnelerEnabled: this.formData.isTunnelerEnabled,
          noTraversal: this.formData.noTraversal,
          cost: this.formData.cost || '0',
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

  toggleTunnelerEnabled() {
    this.formData.isTunnelerEnabled = !this.formData.isTunnelerEnabled;
  }

  toggleNoTraversal() {
    this.formData.noTraversal = !this.formData.noTraversal;
  }

  serviceSelected(serviceName) {

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

  closeModal(refresh = true, ignoreChanges = false): void {
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
