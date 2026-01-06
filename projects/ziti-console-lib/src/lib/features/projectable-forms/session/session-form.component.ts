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

import {isEmpty, delay, cloneDeep, isEqual, set, unset} from 'lodash';
import moment from "moment";

import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {SessionFormService} from './session-form.service';
import {MatDialogRef} from "@angular/material/dialog";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";
import {ActivatedRoute, Router} from "@angular/router";
import {Location} from "@angular/common";
import {Session} from "../../../models/session";

@Component({
  selector: 'lib-sessions-form',
  templateUrl: './session-form.component.html',
  styleUrls: ['./session-form.component.scss'],
  providers: [
    {
      provide: MatDialogRef,
      useValue: {}
    }
  ]
})
export class SessionFormComponent extends ProjectableForm implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() edgeRouterRoleAttributes: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Input() headerToggle = false;

  override entityType = 'sessions';
  override entityClass = Session;

  moment = moment;

  associatedIdentity: any = {};
  formView = 'simple';
  isEditing = false;
  servicesLoading = false;
  identityLoading = false;
  authPolicies: any = [
    {id: 'default', name: 'Default'}
  ];

  associatedEdgeRouters = [];
  associatedServicePolicies = [];
  associatedEdgeRoutersMap = {};
  associatedServicePoliciesMap = {};

  settings: any = {};

  constructor(
      @Inject(SETTINGS_SERVICE) protected override settingsService: SettingsService,
      public svc: SessionFormService,
      @Inject(ZITI_DATA_SERVICE) override zitiService: ZitiDataService,
      growlerService: GrowlerService,
      @Inject(SHAREDZ_EXTENSION) extService: ExtensionService,
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
    this.subscription.add(
      this.extService.formDataChanged.subscribe((data) => {
        if (data.isEmpty) {
          return;
        }
        this.formData = data;
        this.initAssociatedEntities();
      })
    );
  }

  override entityUpdated() {
    this.initAssociatedEntities();
  }

  initAssociatedEntities() {
    this.getAssociatedIdentity();
    this.getAssociatedEdgeRouters();
    this.getAssociatedServicePolicies();
  }

  getAssociatedIdentity() {
    this.identityLoading = true;
    this.zitiService.getSubdata('identities', this.formData.identityId, '').then((result) => {
      this.associatedIdentity = result?.data || {};
    }).finally(() => {
      this.identityLoading = false;
    });
  }

  getAssociatedEdgeRouters() {
    if (!this.formData.edgeRouters) {
      this.associatedEdgeRouters = []
      return;
    }
    this.associatedEdgeRouters = this.formData.edgeRouters.map((router) => {
      const item = cloneDeep(router);
      this.associatedEdgeRoutersMap[item.name] = item;
      item.href = '/routers/' + item.id;
      return item;
    });
  }

  getAssociatedServicePolicies() {
    if (!this.formData.servicePolicies) {
      this.associatedServicePolicies = []
      return;
    }
    this.associatedServicePolicies = this.formData.servicePolicies.map((policy) => {
      const item = cloneDeep(policy);
      this.associatedServicePoliciesMap[item.name] = item;
      item.href = '/service-policies/' + item.id;
      return item;
    });
  }

  previewEdgeRouter(routerName, router) {
    const selectedRouter = this.associatedEdgeRoutersMap[routerName];
    router.navigateByUrl('/routers/' + selectedRouter.id);
  }

  previewServicePolicy(policyName, router) {
    const selectedRouter = this.associatedServicePoliciesMap[policyName];
    router.navigateByUrl('/service-policies/' + selectedRouter.id);
  }

  identityNameLinkClicked(event) {
    this.router.navigateByUrl('/identities/' + this.associatedIdentity.id);
    event.preventDefault();
  }

  serviceNameLinkClicked(event) {
    this.router.navigateByUrl('/services/advanced/' + this.formData.service.id);
    event.preventDefault();
  }

  apiSessionLinkClicked(event) {
    this.router.navigateByUrl('/api-sessions/' + this.formData.apiSessionId);
    event.preventDefault();
  }

  ngOnDestroy() {
    this.extService?.closed?.emit({});
    this.subscription.unsubscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.isEditing = !isEmpty(this.formData.id);
  }

  get hasEnrolmentToken() {
    return !isEmpty(this.formData.enrollmentJwt) || !isEmpty(this.formData.enrollmentToken);
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
        break;
    }
  }

  async save(event?) {}

  get apiCallURL() {
    return this.settings.selectedEdgeController + '/edge/management/v1/sessions' + (this.formData.id ? `/${this.formData.id}` : '');
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

  toggleDisabled(state = undefined) {
    if (state !== undefined) {
      this.formData.disabled = state;
      return;
    }
    this.formData.disabled = !this.formData.disabled;
  }

  toggleNoTraversal() {
    this.formData.noTraversal = !this.formData.noTraversal;
  }

  clear(): void {
  }
}
