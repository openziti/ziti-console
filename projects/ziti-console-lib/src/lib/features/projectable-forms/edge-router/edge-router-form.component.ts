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

import {isEmpty, delay, cloneDeep, isEqual, set} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {EDGE_ROUTER_EXTENSION_SERVICE, EdgeRouterFormService} from './edge-router-form.service';
import {MatDialogRef} from "@angular/material/dialog";
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

  formView = 'simple';
  isEditing = false;
  isLoading = false;
  servicesLoading = false;
  identitiesLoading = false;
  authPolicies: any = [
    {id: 'default', name: 'Default'}
  ];

  showMore = false;
  settings: any = {};
  subscription: Subscription = new Subscription();

  constructor(
      @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
      public svc: EdgeRouterFormService,
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      growlerService: GrowlerService,
      @Inject(EDGE_ROUTER_EXTENSION_SERVICE) extService: ExtensionService
  ) {
    super(growlerService, extService);
  }

  ngOnInit(): void {
    this.subscription.add(
      this.settingsService.settingsChange.subscribe((results:any) => {
        this.settings = results;
      })
    );
    this.svc.getAssociatedServices(this.formData.id);
    this.svc.getAssociatedIdentities(this.formData.id);
    this.svc.getAuthPolicies().then(result => {
      this.authPolicies = result;
    });
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
    this.extService.closed.emit({});
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
      return;
    }

    this.isLoading = true;
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
}
