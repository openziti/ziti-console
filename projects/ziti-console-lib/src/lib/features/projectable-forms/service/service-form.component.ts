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

import {isEmpty, forEach, delay, unset, keys, defer, cloneDeep, isEqual} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {EdgeRouter} from "../../../models/edge-router";
import {SERVICE_EXTENSION_SERVICE, ServiceFormService} from './service-form.service';
import {MatDialogRef} from "@angular/material/dialog";
import {IdentitiesPageService} from "../../../pages/identities/identities-page.service";
import {ExtensionService} from "../../extendable/extensions-noop.service";
import {TranslateService} from "@ngx-translate/core";

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
  @Input() formData: any = {};
  @Input() serviceRoleAttributes: any[] = [];
  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() dataChange: EventEmitter<any> = new EventEmitter<any>();

  paging = {
    filter: "",
    noSearch: true,
    order: "asc",
    page: 1,
    searchOn: "name",
    sort: "name",
    total: 100
  }

  initData: any = {};
  isEditing = false;
  enrollmentExpiration: any;
  jwt: any;
  token: any;
  isLoading = false;
  strategies = [
    {id: 'smartrouting', label: this.translateService.instant('SmartRouting')},
    {id: 'weighted', label: this.translateService.instant('Weighted')},
    {id: 'random', label: this.translateService.instant('Random')},
    {id: 'ha', label: this.translateService.instant('HighAvailability')},
  ];
  associatedIdentities: any = [];
  associatedIdentityNames: any = [];
  identitiesLoading = false;
  configTypes: any = [];
  configs: any = [];
  filteredConfigs: any = [];
  selectedConfigTypeId: any = '';
  selectedConfigType: any = {};
  selectedSchema: any = {};
  selectedConfigId: any = '';
  configData: any;
  addedConfigNames: any = [];
  newConfigName: string = '';
  showMore = false;
  errors: any = {};
  configErrors: any = {};
  formView = 'simple';
  settings: any = {};
  subscription: Subscription = new Subscription();

  @ViewChild('nameFieldInput') nameFieldInput: ElementRef;
  constructor(
      @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
      public svc: ServiceFormService,
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      private growlerService: GrowlerService,
      @Inject(SERVICE_EXTENSION_SERVICE) private extService: ExtensionService,
      private translateService: TranslateService
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
    this.getAssociatedIdentities();
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
    this.resetTags();
    this.getConfigTypes();
    this.getConfigs();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.isEditing = !isEmpty(this.formData.id);
  }

  getConfigTypes() {
    this.zitiService.get('config-types', this.paging, []).then((result: any) => {
      this.configTypes = result.data;
    });
  }

  getConfigs() {
    this.zitiService.get('configs', this.paging, []).then((result: any) => {
      this.configs = result.data;
    });
  }

  configTypeChanged(event: any) {
    this.filteredConfigs = this.configs.filter((config) => {
      return config.configTypeId === this.selectedConfigTypeId;
    });
    this.configTypes.forEach((configType) => {
      if (this.selectedConfigTypeId === configType.id) {
        this.selectedConfigType = configType;
      }
    });
    this.selectedConfigId = '';
    this.configChanged();
  }

  async configChanged(event?: any) {
    let selectedConfig: any = {};
    this.configData = undefined;
    let data;
    if (this.selectedConfigId === 'add-new') {
      data = {};
      this.selectedSchema = await this.zitiService.schema(this.selectedConfigType.schema);
    } else if (this.selectedConfigId) {
      this.filteredConfigs.forEach((config) => {
        if (this.selectedConfigId === config.id) {
          selectedConfig = config;
        }
      });
      data = selectedConfig?.data || {};
    }
    if (!this.configData) {
      this.configData = data;
    } else {
      defer(() => {
        this.configData = cloneDeep(data);
      });
    }
  }

  async attachConfig(addedConfigId) {
    if (this.selectedConfigId === 'add-new') {
      if (!this.validateConfig()) {
        return;
      }
      const newConfig = {
        configTypeId: this.selectedConfigTypeId,
        data: this.configData,
        name: this.newConfigName
      }
      const config = await this.svc.createConfig(newConfig);
      return;
    }
    let configAdded = false;
    this.formData.configs.forEach((configId) => {
      if (configId === addedConfigId) {
        configAdded = true;
      }
    });
    if (!configAdded) {
      let configName = '';
      this.configs.forEach((config) => {
        if (config.id === addedConfigId) {
          configName = config.name;
        }
      });
      if (!isEmpty(configName)) {
        this.addedConfigNames.push(configName);
      }
      this.formData.configs.push(addedConfigId);
    }
  }

  get showConfigData() {
    return this.selectedConfigId === 'add-new';
  }

  get showAttachButton() {
    return !isEmpty(this.selectedConfigId);
  }

  getAssociatedIdentities() {
    this.zitiService.getSubdata('services', this.formData.id, 'identities').then((result: any) => {
      this.associatedIdentities = result.data;
      this.associatedIdentityNames = this.associatedIdentities.map((svc) => {
        return svc.name;
      });
    });
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
      if (!isEmpty(result.id)) {
        this.formData = result;
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

  validateConfig() {
    this.configErrors = {};
    if (isEmpty(this.newConfigName)) {
      this.configErrors['configName'] = true;
    }
    return isEmpty(this.configErrors);
  }

  get apiCallURL() {
    return this.settings.selectedEdgeController + '/edge/management/v1/services' + (this.formData.id ? `/${this.formData.id}` : '');
  }

  get apiData() {
    const data: any = {
          name: this.formData?.name || '',
          encryptionRequired: this.formData?.encryptionRequired || '',
          terminatorStrategy: this.formData.terminatorStrategy || '',
          tags: this.formData.tags || ''
    }
    return data;
  }

  _apiData = {};
  set apiData(data) {
    this._apiData = data;
  }

  toggleEncryptionRequired() {
    this.formData.encryptionRequired = !this.formData.encryptionRequired;
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
