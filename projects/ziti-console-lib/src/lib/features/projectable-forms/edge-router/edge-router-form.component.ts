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

import {isEmpty, delay, cloneDeep, isEqual, set, unset} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {EDGE_ROUTER_EXTENSION_SERVICE, EdgeRouterFormService} from './edge-router-form.service';
import {MatDialogRef} from "@angular/material/dialog";
import {ExtensionService} from "../../extendable/extensions-noop.service";
import {ActivatedRoute, Router} from "@angular/router";
import {EdgeRouter} from "../../../models/edge-router";
import {Location} from "@angular/common";
import { DEFAULT_APP_CONFIG } from '../../../ziti-console.constants';
import { DefaultAppConfig } from '../../../default-app-config';

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
  @Input() edgeRouterRoleAttributes: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();

  override entityType = 'edge-routers';
  override entityClass = EdgeRouter;

  formView = 'simple';
  isEditing = false;
  servicesLoading = false;
  identitiesLoading = false;
  authPolicies: any = [
    {id: 'default', name: 'Default'}
  ];

  settings: any = {};

  constructor(
      @Inject(SETTINGS_SERVICE) protected override settingsService: SettingsService,
      public svc: EdgeRouterFormService,
      @Inject(ZITI_DATA_SERVICE) override zitiService: ZitiDataService,
      growlerService: GrowlerService,
      @Inject(EDGE_ROUTER_EXTENSION_SERVICE) extService: ExtensionService,
      @Inject(DEFAULT_APP_CONFIG) public config: DefaultAppConfig,
      protected override router: Router,
      protected override route: ActivatedRoute,
      location: Location
  ) {
    super(growlerService, extService, zitiService, router, route, location, settingsService);
    this.edgeRouterRoleAttributes = [];
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
      })
    );
  }

  override entityUpdated() {
    if (this.formData.id) {
      this.formData.badges = [];
      this.formData.badges = [];
      if (this.formData.isOnline) {
        this.formData.badges.push({label: 'Online', class: 'online', circle: 'true'});
      } else {
        this.formData.badges.push({label: 'Offline', class: 'offline', circle: 'false'});
      }
      if (!this.formData.isVerified) {
        this.formData.badges.push({label: 'Unverified', class: 'unreg'});
      }
    }
    this.getEdgeRouterRoleAttributes();
    this.svc.getAssociatedServices(this.formData.id);
    this.svc.getAssociatedIdentities(this.formData.id);
    this.svc.getAuthPolicies().then(result => {
      this.authPolicies = result;
    });
    this.loadTags();
    unset(this.formData, '_links');
    this.initData = cloneDeep(this.formData);
    this.extService.updateFormData(this.formData);
  }

  getEdgeRouterRoleAttributes() {
    this.getRoleAttributes('edge-router-role-attributes').then((attributes) => {
      this.edgeRouterRoleAttributes = attributes;
    });
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

  async save(event?) {
    const isValid = this.validate();
    const isExtValid = await this.extService.validateData();
    this.formData.name = this.formData.name.trim()
    if(!isValid || !isExtValid) {
      return;
    }

    this.isLoading = true;
    this.svc.save(this.formData).then((result) => {
      if (result?.close) {
        if (this.isModal) {
          this.closeModal(true, true);
          return;
        }
        this.initData = this.formData;
        this._dataChange = false;
        this.returnToListPage();
        return;
      }
      const data = result?.data?.id ? result.data : result;
      if (!isEmpty(data.id)) {
        this.formData = data || this.formData;
        this.initData = this.formData;
      } else {
        this.initData = this.formData;
      }
      this.extService.updateFormData(this.formData);
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
    return this.settings.selectedEdgeController + '/edge/management/v1/edge-routers' + (this.formData.id ? `/${this.formData.id}` : '');
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

  refreshEdgeRouter() {
    this.svc.refreshRouter(this.formData.id).then(result => {
      this.formData = result.data;
      this.initData = cloneDeep(this.formData);
      this.extService.updateFormData(this.formData);
    })
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

  clear(): void {
  }

  isTunnelerDisabled(): boolean {
    return this.extService.disabledComponents.some(
      item => item.key === 'tunneler-disabled'
    );
  }

  get tunnelerEnabledReadOnly(): boolean {
    return this.config.isOpenZiti ? true : !this.isTunnelerDisabled()
  }
}
