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
import {ProjectableForm} from "../projectable-form.class";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";

import {isEmpty, forEach, delay, unset, keys, defer, cloneDeep, isEqual, some} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {SERVICE_EXTENSION_SERVICE, ServiceFormService} from './service-form.service';
import {MatDialogRef} from "@angular/material/dialog";
import {ExtensionService} from "../../extendable/extensions-noop.service";
import {SchemaService} from "../../../services/schema.service";

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
    {id: 'smartrouting', label: 'Smart Routing'},
    {id: 'weighted', label: 'Weighted'},
    {id: 'random', label: 'Random'},
    {id: 'ha', label: 'High Availability'},
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
  associatedIdentities: any = [];
  associatedIdentityNames: any = [];
  identitiesLoading = false;
  configTypes: any = [];
  configs: any = [];
  routers: any = [];
  filteredConfigs: any = [];
  selectedConfigTypeId: any = '';
  selectedConfigType: any = {};
  selectedSchema: any = {};
  selectedConfigId: any = '';
  selectedRouterId: string = '';
  selectedRouter: string = '';
  selectedBindingId: string = '';
  configData: any;
  addedConfigNames: any = [];
  addedTerminators: any = [];
  newConfigName: string = '';
  terminatorHost: string = '';
  terminatorPort: string = '';
  showMore = false;
  errors: any = {};
  configErrors: any = {};
  terminatorErrors: any = {};
  formView = 'simple';
  settings: any = {};
  terminatorProtocol = 'udp';
  subscription: Subscription = new Subscription();
  hideConfigJSON = false;
  configJsonView = false;
  configDataLabel = 'Configuration Form';
  attachLabel = 'Create and Attach';
  items: any = [];

  lColorArray = [
    'black',
    'white',
    'black',
  ]

  bColorArray = [
    '#33aaff',
    'var(--secondary)',
    '#fafafa',
  ]

  @ViewChild("dynamicform", {read: ViewContainerRef}) dynamicForm!: ViewContainerRef;
  constructor(
      @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
      public svc: ServiceFormService,
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      private growlerService: GrowlerService,
      @Inject(SERVICE_EXTENSION_SERVICE) private extService: ExtensionService,
      private schemaSvc: SchemaService
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
        //this.formData = data;
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
    this.getConfigs().then(() => {
      this.updatedAddedConfigs();
    });
    this.getRouters();
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
    return this.zitiService.get('configs', this.paging, []).then((result: any) => {
      this.configs = result.data;
      this.configTypeChanged();
    });
  }

  getRouters() {
    this.zitiService.get('edge-routers', this.paging, []).then((result: any) => {
      this.routers = result.data;
    });
  }

  updatedAddedConfigs() {
    this.addedConfigNames = [];
    this.configs.forEach((availableConfig) => {
      const cfgExists = some(this.formData.configs, configId => {
        return availableConfig.id == configId;
      });
      if (cfgExists) {
        this.addedConfigNames.push(availableConfig.name);
        this.addedConfigNames = [...this.addedConfigNames];
      }
    })
  }

  toggleJSONView() {
    this.configJsonView = !this.configJsonView;
    this.configDataLabel = this.configJsonView ? 'JSON Configuration' : 'Configuration Form';
    this.updateConfigData();
  }

  updateConfigData() {
    if (!this.configJsonView) {
      this.updateFormView(this.items, this.configData);
    } else {
      this.hideConfigJSON = true;
      defer(() => {
        const data = {};
        this.addItemsToConfig(this.items, data);
        this.configData = data;
        this.hideConfigJSON = false;
      });
    }
  }

  updateFormView(items, data) {
    items.forEach((item) => {
      if (item.items) {
        this.updateFormView(item.items, data[item.key]);
      } else if (item?.component?.instance?.setProperties) {
        let val;
        switch (item.key) {
          case 'forwardingconfig':
            val = {
              protocol: data.protocol,
              address: data.address,
              port: data.port,
              forwardProtocol: data.forwardProtocol,
              forwardAddress: data.forwardAddress,
              forwardPort: data.forwardPort,
              allowedProtocols: data.allowedProtocols,
              allowedAddresses: data.allowedAddresses,
              allowedPortRanges: data.allowedPortRanges
            }
            break;
          default:
            val = data[item.key];
            break;
        }
        item?.component?.instance?.setProperties(val);
      } else if (item?.component?.setInput) {
        item.component.setInput('fieldValue', data[item.key]);
      }
    });
    return data;
  }

  addItemsToConfig(items, data) {
    items.forEach((item) => {
      let props = [];
      if (item.items) {
        data[item.key] = this.addItemsToConfig(item.items, {});
      } else if (item?.component?.instance?.getProperties) {
        props = item?.component?.instance?.getProperties();
      } else if (item?.component?.instance) {
        props = [{key: item.key, value: item.component.instance.fieldValue}];
      }
      props.forEach((prop) => {
        data[prop.key] = prop.value;
      });
    });
    return data;
  }

  configTypeChanged(event?: any) {
    this.filteredConfigs = this.configs.filter((config) => {
      return config.configTypeId === this.selectedConfigTypeId;
    });
    this.configTypes.forEach((configType) => {
      if (this.selectedConfigTypeId === configType.id) {
        this.selectedConfigType = configType;
      }
    });
    this.selectedConfigId = !isEmpty(this.selectedConfigTypeId) ? 'add-new' : '';
    this.configChanged();
  }

  async configChanged(event?: any) {
    let selectedConfig: any = {};
    this.configData = undefined;
    let data;
    let attachLabel = 'Attach to Service';
    if (this.selectedConfigId === 'add-new') {
      data = {};
      this.selectedSchema = await this.zitiService.schema(this.selectedConfigType.schema);
      await this.createForm();
      attachLabel = 'Create and Attach';
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
    this.updateConfigData();
    this.attachLabel = attachLabel;
  }

  async createForm() {
    this.clearForm();
    if (this.selectedConfigType && this.dynamicForm) {
      if (this.selectedSchema) {
        this.renderSchmea(this.selectedSchema);
      }
    }
  }

  renderSchmea(schema: any) {
    if (schema.properties) {
      this.items = this.schemaSvc.render(schema, this.dynamicForm, this.lColorArray, this.bColorArray);
      for (let obj of this.items) {
        const cRef = obj.component;
        cRef.instance.errors = this.errors;
        if (cRef?.instance.valueChange) {
          const pName: string[]  = cRef.instance.parentage;
          let parentKey;
          if(pName) parentKey = pName.join('.');
          if (parentKey && !this.formData[parentKey]) this.formData[parentKey] = {};
        }
      }
    }
  }

  clearForm() {
    this.items.forEach((item: any) => {
      if (item?.component) item.component.destroy();
    });
    this.errors = {};
    this.items = [];
    this.formData = {
      configs: [],
      encryptionRequired: true,
      terminatorStrategy: '',
    };
    if (this.subscription) this.subscription.unsubscribe();
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
      const configId = await this.svc.createConfig(newConfig)
          .then((result) => {
            return result?.data?.id;
          })
          .catch((result) => {
        const errorField = result?.error?.error?.cause?.field;
        if (!isEmpty(errorField)) {
          this.configErrors[errorField] = true;
        }
        const errorMessage = result?.error?.error?.cause?.reason;
        const growlerData = new GrowlerModel(
            'error',
            'Error',
            `Error Creating Config`,
            errorMessage,
        );
        this.growlerService.show(growlerData);
        return undefined;
      });
      if (!isEmpty(configId)) {
        this.formData.configs.push(configId);
        this.addedConfigNames.push(this.newConfigName);
        this.addedConfigNames = [...this.addedConfigNames];
        this.getConfigs();
        const growlerData = new GrowlerModel(
            'success',
            'Success',
            `New Config Attached`,
            `New Config ${this.newConfigName} has been created and attached to the service`,
        );
        this.growlerService.show(growlerData);
        this.newConfigName = '';
        this.selectedConfigTypeId = '';
        this.selectedConfigId = '';
        return;
      }
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
        this.addedConfigNames = [...this.addedConfigNames];
      }
      this.formData.configs.push(addedConfigId);
    } else {
      const growlerData = new GrowlerModel(
          'warning',
          'Info',
          `Config Already Attached`,
          'Config has already been attached to this service',
      );
      this.growlerService.show(growlerData);
    }
  }

  routerChanged(event?: any) {
    let selectedRouter;
    if (this.selectedConfigId) {
      this.routers.forEach((router) => {
        if (this.selectedRouterId === router.id) {
          selectedRouter = router;
        }
      });
    }
    this.selectedRouter = selectedRouter;
  }

  addTerminator(item) {
    let termAdded = false;
    this.addedTerminators.forEach((termName) => {
      if (item.name === termName) {
        termAdded = true;
      }
    });
    if (!termAdded) {
      this.addedTerminators.push(item.name);
    }
  }

  bindingTypeChanged(event?: any) {

  }

  terminatorProtocolChanged(event?: any) {

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
      this.configErrors['name'] = true;
    }
    return isEmpty(this.configErrors);
  }

  toggleEncryptionRequired() {
    this.formData.encryptionRequired = !this.formData.encryptionRequired;
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
