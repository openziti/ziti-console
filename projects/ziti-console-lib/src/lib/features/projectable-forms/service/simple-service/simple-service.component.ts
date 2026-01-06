import {Component, EventEmitter, Inject, Input, Output} from '@angular/core';
import {ProjectableForm} from "../../projectable-form.class";
import {SETTINGS_SERVICE, SettingsService} from "../../../../services/settings.service";
import {SERVICE_EXTENSION_SERVICE, ServiceFormService} from "../service-form.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../../services/ziti-data.service";
import {GrowlerService} from "../../../messaging/growler.service";
import {ExtensionService} from "../../../extendable/extensions-noop.service";
import {GrowlerModel} from "../../../messaging/growler.model";
import {MatDialog} from "@angular/material/dialog";
import {CreationSummaryDialogComponent} from "../../../creation-summary-dialog/creation-summary-dialog.component";
import {isEmpty, isNil, isNaN, unset, cloneDeep, isEqual, forEach, set, get} from 'lodash';
import {ValidationService} from '../../../../services/validation.service';
import {ServicesPageService} from "../../../../pages/services/services-page.service";
import {ActivatedRoute, Router} from "@angular/router";
import {FilterObj} from "../../../data-table/data-table-filter.service";
import {ConfirmComponent} from "../../../confirm/confirm.component";
import {Location} from "@angular/common";
import {URLS} from "../../../../urls";
import {BehaviorSubject, forkJoin, Observable, of} from "rxjs";

// @ts-ignore
const {app} = window;

@Component({
  selector: 'lib-simple-service',
  templateUrl: './simple-service.component.html',
  styleUrls: ['./simple-service.component.scss']
})
export class SimpleServiceComponent extends ProjectableForm {
  @Input() serviceRoleAttributes: any[] = [];
  @Input() identityRoleAttributes: any[] = [];
  @Input() identityNamedAttributes: any[] = [];

  showForm = true;
  formView = 'simple';
  controllerDomain = '';
  zitiSessionId;
  interceptPort;
  hostProtocol = 'tcp';
  serviceCliCommand = '';
  interceptConfigCliCommand = '';
  hostConfigCliCommand = '';
  dialPolicyCliCommand = '';
  bindPolicyCliCommand = '';
  serviceApiUrl = '';
  interceptConfigApiUrl = '';
  hostConfigApiUrl = '';
  dialPolicyApiUrl = '';
  bindPolicyApiUrl = '';
  initServiceApiData = {
    name: "",
    roleAttributes: [],
    configs: [],
    encryptionRequired: true
  };
  initInterceptConfigApiData = {
    name: "",
    configTypeId:"g7cIWbcGg",
    data: {
      portRanges: [],
      addresses: [],
      protocols: ['tcp', 'udp']
    }
  };
  initHostConfigApiData = {
    name: '',
    configTypeId: "NH5p4FpGR",
    data: {
      address: "",
      port: undefined,
      forwardProtocol: true,
      allowedProtocols: ['tcp']
    }
  };
  initDialPolicyApiData = {
    name: "",
    type: "Dial",
    semantic: "AnyOf",
    serviceRoles: [],
    identityRoles: []
  };
  initBindPolicyApiData = {
    name: "",
    type: "Bind",
    semantic: "AnyOf",
    serviceRoles: [],
    identityRoles: []
  };
  serviceApiData;
  interceptConfigApiData;
  hostConfigApiData;
  dialPolicyApiData;
  bindPolicyApiData;
  dialPolicyNamedAttributes = [];
  dialPolicyRoleAttributes = [];
  bindPolicyNamedAttributes = [];
  bindPolicyRoleAttributes = [];
  identitiesNameIdMap = {};
  identitiesIdNameMap = {};
  interceptConfigId;
  hostConfigId;
  serviceId;
  sdkOnlyDial = false;
  sdkOnlyBind = false;
  dialogRef: any;

  interceptIncrement = -1;
  hostIncrement = -1;
  serviceIncrement = -1;
  dialIncrement = -1;
  bindIncrement = -1;

  serviceDataChange = false;
  interceptDataChange = false;
  hostDataChange = false;
  dialDataChange = false;
  bindDataChange = false;
  identitiesInit: BehaviorSubject<any> = new BehaviorSubject<any>(false);
  entitiesInit = false;

  multiActions = [];

  override entityType = 'services';

  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() selected: EventEmitter<any> = new EventEmitter<any>();

  constructor(
      @Inject(SETTINGS_SERVICE) protected override settingsService: SettingsService,
      public svc: ServiceFormService,
      @Inject(ZITI_DATA_SERVICE) override zitiService: ZitiDataService,
      growlerService: GrowlerService,
      @Inject(SERVICE_EXTENSION_SERVICE) extService: ExtensionService,
      private dialogForm: MatDialog,
      private validationService: ValidationService,
      private servicesPageService: ServicesPageService,
      protected override router: Router,
      protected override route: ActivatedRoute,
      location: Location
  ) {
    super(growlerService, extService, zitiService, router, route, location, settingsService);
    this.svc.formData = {};
  }

  serviceDataSet: boolean;
  @Input() override set formData(data) {
    if (!data?.configs) {
      data.configs = [];
    }
    this.svc.formData = data;
    if (!isEmpty(data?.id)) {
      this.initAssociatedData();
      if (get(this.formData, 'tags.service-type') === 'simple') {
        this.multiActions = [
          {id: 'convert-to-advanced', label: 'Convert to Advanced', hidden: false}
        ]
      } else {
        this.multiActions = []
      }
    } else {
      this.associatedDataInit = true;
    }
    this.serviceDataSet = true;
    this.checkAllDataInit();
  }

  override get formData(): any {
    return this.svc?.formData;
  }

  entityIdInit: boolean;
  override set entityId(id: String) {
    this._entityId = id;
    if (isEmpty(id) || id === 'create') {
      this.serviceDataSet = true;
      this.associatedDataInit = true;
    }
    this.entityIdInit = true;
    this.checkAllDataInit();
  }

  override get entityId(): String {
    return this._entityId;
  }

  override ngOnInit() {
    super.ngOnInit();
    this.controllerDomain = this.settingsService?.settings?.selectedEdgeController;
    this.zitiSessionId = this.settingsService?.settings?.session?.id;
    this.initFormData();
    this.getIdentityNamedAttributes();
  }

  formDataSet = false;
  initFormData() {
    this.serviceApiUrl = `${this.controllerDomain}/edge/management/v1/services`;
    this.interceptConfigApiUrl = `${this.controllerDomain}/edge/management/v1/configs`;
    this.hostConfigApiUrl = `${this.controllerDomain}/edge/management/v1/configs`;
    this.dialPolicyApiUrl = `${this.controllerDomain}/edge/management/v1/service-policies`;
    this.bindPolicyApiUrl = `${this.controllerDomain}/edge/management/v1/service-policies`;
    this.serviceCliCommand = '';
    this.interceptConfigCliCommand = '';
    this.hostConfigCliCommand = '';
    this.dialPolicyCliCommand = '';
    this.bindPolicyCliCommand = '';
    this.interceptConfigId = '';
    this.hostConfigId = '';
    this.serviceId = '';
    this.sdkOnlyDial = false;
    this.sdkOnlyBind = false;
    this.interceptPort = undefined;
    this.dialPolicyNamedAttributes = [];
    this.dialPolicyRoleAttributes = [];
    this.bindPolicyNamedAttributes = [];
    this.bindPolicyRoleAttributes = [];
    this.serviceApiData = cloneDeep(this.initServiceApiData);
    this.interceptConfigApiData = cloneDeep(this.initInterceptConfigApiData);
    this.hostConfigApiData = cloneDeep(this.initHostConfigApiData);
    this.dialPolicyApiData = cloneDeep(this.initDialPolicyApiData);
    this.bindPolicyApiData = cloneDeep(this.initBindPolicyApiData);
    const serviceRolesPromise = this.servicesPageService.getServiceRoleAttributes().then((result) => {
      this.serviceRoleAttributes = result.data;
    });
    const identityRolesPromise = this.servicesPageService.getIdentityRoleAttributes().then((result) => {
      this.identityRoleAttributes = result.data;
    });
    return Promise.all([serviceRolesPromise, identityRolesPromise]).finally(() => {
      this.formDataSet = true;
      this.checkAllDataInit();
    });
  }

  associatedDataInit: boolean;
  initAssociatedData() {
    if (this.entitiesInit) {
      this.dataInit = true;
      this.isLoading = false;
      return;
    }
    this.entitiesInit = true;
    this.serviceApiData = this.svc.formData;
    this.identitiesInit.subscribe((val) => {
      if (val === true) {
        const configsPromise = this.getAssociatedConfigs();
        const policiesPromise = this.getAssocaitedPolicies();
        Promise.all([configsPromise, policiesPromise]).finally(() => {
          this.associatedDataInit = true;
          this.setInitData();
          this.checkAllDataInit();
        });
      }
    });
  }

  setInitData() {
    this.initServiceApiData = cloneDeep(this.serviceApiData);
    this.initInterceptConfigApiData = cloneDeep(this.interceptConfigApiData);
    this.initHostConfigApiData = cloneDeep(this.hostConfigApiData);
    this.initDialPolicyApiData = cloneDeep(this.dialPolicyApiData);
    this.initBindPolicyApiData = cloneDeep(this.bindPolicyApiData);
    this._dataChange = false;
  }

  getAssociatedConfigs(): Promise<any> {
    return this.zitiService.getSubdata('services', this.formData.id, 'configs').then((result: any) => {
      const associatedConfigs = result.data;
      associatedConfigs.forEach((config) => {
        if (config.configTypeId == this.initInterceptConfigApiData.configTypeId) {
          this.interceptConfigApiData = config;
          const portRange = this.interceptConfigApiData.data.portRanges[0];
          this.interceptPort = portRange?.high;
        } else if (config.configTypeId == this.initHostConfigApiData.configTypeId) {
          this.hostConfigApiData = config;
        }
      });
    });
  }

  getAssocaitedPolicies(): Promise<any> {
    return this.zitiService.getSubdata('services', this.formData.id, 'service-policies').then((result: any) => {
      const associatedServicePolicies = result.data;
      associatedServicePolicies.forEach((policy) => {
        if (policy.type?.toLowerCase() == 'dial') {
          this.dialPolicyApiData = policy;
          const roleAttributes = [];
          const namedAttributes = [];
          policy.identityRoles.forEach((attr) => {
            if (attr.charAt(0) === '#') {
              roleAttributes.push(attr.slice(1));
            } else if (attr.charAt(0) === '@') {
              namedAttributes.push(this.identitiesIdNameMap[attr.slice(1)]);
            }
          });
          this.dialPolicyRoleAttributes = roleAttributes;
          this.dialPolicyNamedAttributes = namedAttributes;
        } else if (policy.type?.toLowerCase() == 'bind') {
          const roleAttributes = [];
          const namedAttributes = [];
          policy.identityRoles.forEach((attr) => {
            if (attr.charAt(0) === '#') {
              roleAttributes.push(attr.slice(1));
            } else if (attr.charAt(0) === '@') {
              namedAttributes.push(this.identitiesIdNameMap[attr.slice(1)]);
            }
          });
          this.bindPolicyRoleAttributes = roleAttributes;
          this.bindPolicyNamedAttributes = namedAttributes;
          this.bindPolicyApiData = policy;
        }
      });
    })
  }

  getIdentityNamedAttributes(filter?) {
    const paging = {
      searchOn: 'name',
      filter: filter || '',
      total: 30,
      page: 1,
      sort: 'name',
      order: 'asc'
    };
    const filters = [];
    if (!isEmpty(filter)) {
      filters.push({
        filterName: 'name',
        columnId: 'name',
        value: filter || '%',
        label: '',
        type: 'TEXTINPUT',
      });
    }
    this.zitiService.get('identities', paging, filters).then((result) => {
      const namedAttributes = result.data.map((identity) => {
        this.identitiesNameIdMap[identity.name] = identity.id;
        this.identitiesIdNameMap[identity.id] = identity.name;
        return identity.name;
      });
      this.identityNamedAttributes = namedAttributes;
    }).finally(() => {
      this.identitiesInit.next(true);
    });
  }

  checkAllDataInit() {
    if (this.associatedDataInit && this.formDataSet && this.entityIdInit && this.serviceDataSet) {
      this.dataInit = true;
      this.isLoading = false;
    }
  }

  multiActionRequested(action) {
    switch(action.id) {
      case 'save':
        this.save();
        break;
      case 'convert-to-advanced':
        this.convertToAdvanced();
        break;
    }
  }

  headerActionRequested(action) {
    switch(action.name) {
      case 'save':
        this.save();
        break;
      case 'close':
        if (this.isEdit) {
          this.router?.navigateByUrl(URLS.ZITI_SERVICES);
        } else {
          this.router?.navigateByUrl(URLS.ZITI_SERVICE_SELECT);
        }
        break;
      case 'toggle-view':
        this.formView = action.data;
        break;
    }
  }

  toggleSdkOnlyDial() {
    this.sdkOnlyDial = !this.sdkOnlyDial;
  }

  toggleSdkOnlyBind() {
    this.sdkOnlyBind = !this.sdkOnlyBind;
  }

  serviceNameChanged(event) {
    this.interceptConfigApiData.name = `${this.serviceApiData.name}-intercept-config`
    this.hostConfigApiData.name = `${this.serviceApiData.name}-host-config`
    this.dialPolicyApiData.name = `${this.serviceApiData.name}-dial-policy`
    this.bindPolicyApiData.name = `${this.serviceApiData.name}-bind-policy`
  }

  interceptPortChanged($event) {
    if (isNil(this.interceptPort) || isNaN(this.interceptPort)) {
      this.interceptConfigApiData.data.portRanges = [];
      return;
    }
    this.interceptConfigApiData.data.portRanges[0] = {
      high: this.interceptPort,
      low: this.interceptPort
    };
  }

  hostProtocolsChanged($event) {
    switch (this.hostProtocol) {
      case 'both':
        this.hostConfigApiData.data.allowedProtocols = ['tcp', 'udp']
        break;
      default:
        this.hostConfigApiData.data.allowedProtocols = [this.hostProtocol];
        break;
    }
  }

  async save(refresh?) {
    this.serviceApiData.name = this.serviceApiData.name.trim();
    if (!this.validate()) {
      return;
    }
    const isNewService = isEmpty(this.serviceApiData?.id);
    if (isNewService) {
      const hasConflicts: any = await this.checkNameConflicts();
      if (hasConflicts) {
        return;
      }
    }

    const summaryData = this.showSummary();
    this.serviceApiData.configs = [];

    const interceptCfgPromise = await this.saveInterceptConfig(summaryData);
    const hostCfgPromise = await this.saveHostConfig(summaryData);
    const servicePromise = await this.saveService(summaryData);
    const dialPolicyPromise = await this.savePolicy(summaryData, 'Dial');
    const bindPolicyPromise = await this.savePolicy(summaryData, 'Bind');

    summaryData?.forEach((entityType) => {
      entityType.entities?.forEach((entity) => {
        if (entity.type === 'services') {
          entity.cliCommand = this.serviceCliCommand;
          entity.apiRequest = this.getServicesApiRequest();
        } else if (entity.type === 'configs' && entity.subtype === 'intercept') {
          entity.cliCommand = this.interceptConfigCliCommand;
          entity.apiRequest = this.getInterceptConfigApiRequest();
        } else if (entity.type === 'configs' && entity.subtype === 'host') {
          entity.cliCommand = this.hostConfigCliCommand;
          entity.apiRequest = this.getHostConfigApiRequest();
        } else if (entity.type === 'service-policies' && entity.subtype === 'dial') {
          entity.cliCommand = this.dialPolicyCliCommand;
          entity.apiRequest = this.getDialApiRequest();
        } else if (entity.type === 'service-policies' && entity.subtype === 'bind') {
          entity.cliCommand = this.bindPolicyCliCommand;
          entity.apiRequest = this.getBindApiRequest();
        }
      });
    });
  }

  showSummary() {
    const interceptSummary = {
      name: this.interceptConfigApiData.name,
      type: 'configs',
      subtype: 'intercept',
      apiData: this.interceptConfigApiData,
      cliCommand: this.interceptConfigCliCommand,
      apiRequest: '',
      apiUrl: this.interceptConfigApiUrl,
      status: 'loading',
      retry: this.saveInterceptConfig.bind(this),
    };
    const hostSummary = {
      name: this.hostConfigApiData.name,
      type: 'configs',
      subtype: 'host',
      apiData: this.hostConfigApiData,
      cliCommand: this.hostConfigCliCommand,
      apiRequest: '',
      apiUrl: this.hostConfigApiUrl,
      status: 'loading',
      retry: this.saveHostConfig.bind(this)
    };
    const summaryData: any = [
      {
        title: 'Services',
        entities: [
          {
            name: this.serviceApiData.name,
            type: 'services',
            apiData: this.serviceApiData,
            cliCommand: this.serviceCliCommand,
            apiRequest: '',
            apiUrl: this.serviceApiUrl,
            status: 'loading',
            retry: this.saveService.bind(this)
          }
        ]
      },
      {
        title: 'Service Policies',
        entities: [
          {
            name: this.dialPolicyApiData.name,
            type: 'service-policies',
            subtype: 'dial',
            apiData: this.dialPolicyApiData,
            cliCommand: this.dialPolicyCliCommand,
            apiRequest: '',
            apiUrl: this.dialPolicyApiUrl,
            status: 'loading',
            retry: (summaryData) => { this.savePolicy(summaryData, 'Dial') }
          },
          {
            name: this.bindPolicyApiData.name,
            type: 'service-policies',
            subtype: 'bind',
            apiData: this.bindPolicyApiData,
            cliCommand: this.bindPolicyCliCommand,
            apiRequest: '',
            apiUrl: this.bindPolicyApiUrl,
            status: 'loading',
            retry: (summaryData) => { this.savePolicy(summaryData, 'Bind') }
          }
        ]
      }
    ];
    if (!this.sdkOnlyDial && !this.sdkOnlyBind) {
      summaryData.splice(0,0,{
        title: 'Configurations',
        entities: [interceptSummary, hostSummary]
      });
    } else if (!this.sdkOnlyDial) {
      summaryData.splice(0,0,{
        title: 'Configurations',
        entities: [interceptSummary]
      });
    } else if (!this.sdkOnlyBind) {
      summaryData.splice(0,0,{
        title: 'Configurations',
        entities: [hostSummary]
      });
    }
    const data = {
      summaryData: summaryData,
      isEdit: this.isEdit
    };
    this.dialogRef = this.dialogForm.open(CreationSummaryDialogComponent, {
      data: data,
      autoFocus: false,
    });
    this.dialogRef.afterClosed().subscribe((result) => {
      if (result === 'new') {
        this.initFormData();
      } else if (result === 'cancel') {
        /// Do nothing, stay on page
      } else {
        this.initDataModels();
        this._dataChange = false;
        this.router?.navigateByUrl(`${this.basePath}`);
      }
    });
    return summaryData;
  }

  async checkNameConflicts() {
    const filter: FilterObj = {
      filterName: 'name',
      columnId: 'name',
      value: this.serviceApiData.name,
      label: '',
      type: 'TEXTINPUT',
      hidden: false,
      verb: '='
    }

    const results: any = {
      serviceConflict: false,
      interceptConflict: false,
      hostConflict: false,
      dialPolicyConflict: false,
      bindPolicyConflict: false,
      names: []
    };
    const paging = cloneDeep(this.zitiService.DEFAULT_PAGING);
    paging.noSearch = false;
    const serviceProm = this.zitiService.get('services', paging, [filter]).then((result) => {
      if (result.data?.length > 0) {
        results.serviceConflict = true;
        results.names.push(this.serviceApiData.name);
      }
    });
    filter.value = this.interceptConfigApiData.name;
    const interceptProm = this.zitiService.get('configs', paging, [filter]).then((result) => {
      if (result.data?.length > 0) {
        results.interceptConflict = true;
        results.names.push(this.interceptConfigApiData.name);
      }
    });
    filter.value = this.hostConfigApiData.name;
    const hostProm = this.zitiService.get('configs', paging, [filter]).then((result) => {
      if (result.data?.length > 0) {
        results.hostConflict = true;
        results.names.push(this.hostConfigApiData.name);
      }
    });
    filter.value = this.dialPolicyApiData.name;
    const dialProm = this.zitiService.get('service-policies', paging, [filter]).then((result) => {
      if (result.data?.length > 0) {
        results.dialPolicyConflict = true;
        results.names.push(this.dialPolicyApiData.name);
      }
    });
    filter.value = this.bindPolicyApiData.name;
    const bindProm = this.zitiService.get('service-policies', paging, [filter]).then((result) => {
      if (result.data?.length > 0) {
        results.bindPolicyConflict = true;
        results.names.push(this.bindPolicyApiData.name);
      }
    });

    return Promise.all([serviceProm, interceptProm, hostProm, dialProm, bindProm]).then(() => {
      let hasConflict = results.names.length > 0;
      if (hasConflict) {
        this.errors.name = true;
        this.showConflictWarning(results);
      }
      return hasConflict;
    });
  }

  showConflictWarning(conflictData) {

    const data = {
      appendId: 'SimpleServiceConflicts',
      title: 'Name Conflict',
      message: `The name you have entered has conflicts for the following entities`,
      bulletList: conflictData.names,
      submessage: `Please update the entered name and try again.`,
      confirmLabel: 'Return',
      showCancelLink: false,
      imageUrl: '../../assets/svgs/Growl_Error.svg'
    };
    this.dialogRef = this.dialogForm.open(ConfirmComponent, {
      data: data,
      autoFocus: false,
    });
    this.dialogRef.afterClosed(() => {
      this.nameFieldInput.nativeElement.focus();
    })
  }

  async saveInterceptConfig(summaryData) {
    const isNewConfig = isEmpty(this.interceptConfigApiData?.id);

    // Conditional Deletion (Identical Logic)
    if (this.sdkOnlyDial && !isNewConfig) {
      return this.zitiService.delete('configs', this.interceptConfigApiData.id);
    } else if (this.sdkOnlyDial && isNewConfig) {
      return;
    }

    // Use the Helper Function
    const { status } = await this.saveConfig(
        this.interceptConfigApiData,
        'interceptIncrement',
        'interceptConfigId',
        'interceptConfigCliCommand'
    );

    // Apply final status logic
    summaryData[0].entities[0].status = status;
  }

  async saveHostConfig(summaryData) {
    const isNewConfig = isEmpty(this.hostConfigApiData?.id);

    // Conditional Deletion (Identical Logic)
    if (this.sdkOnlyDial && !isNewConfig) {
      return this.zitiService.delete('configs', this.hostConfigApiData.id);
    } else if (this.sdkOnlyDial && isNewConfig) {
      return;
    }

    // Use the Helper Function
    const { status, configApiData } = await this.saveConfig(
        this.hostConfigApiData,
        'hostIncrement',
        'hostConfigId',
        'hostConfigCliCommand'
    );

    // Apply final status logic (slightly different than intercept)
    if (this.sdkOnlyDial) {
      summaryData[0].entities[0].status = status;
      summaryData[0].entities[0].apiData = configApiData;
    } else {
      summaryData[0].entities[1].status = status;
      summaryData[0].entities[0].apiData = configApiData;
    }
  }

  async saveConfig(
      configApiData: any,      // e.g., this.interceptConfigApiData
      incrementer: string,     // The name of the incrementer property ('interceptIncrement' or 'hostIncrement')
      configIdProp: string,    // The name of the ID property ('interceptConfigId' or 'hostConfigId')
      cliCommandProp: string   // The name of the CLI command property ('interceptConfigCliCommand' or 'hostConfigCliCommand')
  ): Promise<any> {

    const isNewConfig = isEmpty(configApiData?.id);
    const incrementValue = this[incrementer] as number; // Get current increment value
    let status: string;
    let configResult: any;

    if (isNewConfig) {
      this[incrementer] = incrementValue + 1; // Increment for naming

      let postFix = '';
      if (this[incrementer] > 0) {
        postFix = '_' + this[incrementer];
      }

      configApiData.name = configApiData.name + postFix;

      configResult = await this.saveEntity('configs', configApiData).catch((result) => result);
    } else {
      configResult = await this.updateEntity('configs', configApiData).catch((result) => result);
    }

    if (configResult.error) {
      status = 'error';
    } else {
      // Set the config ID property dynamically (e.g., this.interceptConfigId)
      this[configIdProp] = configApiData.id || configResult.id || configResult.data.id;

      // Add the new config ID to serviceApiData (assuming serviceApiData is accessible via 'this')
      this.serviceApiData.configs.push(this[configIdProp]);

      // Set the CLI command dynamically
      this[cliCommandProp] = `ziti edge create config '${configApiData.name}' '${configApiData.configTypeId}' '${JSON.stringify(configApiData.data)}'`;

      status = 'done';
      this[incrementer] = -1; // Reset incrementer
    }

    return { status, configResult, configApiData };
  }

  async saveService(summaryData) {
    const isNewService = isEmpty(this.serviceApiData?.id);

    let serviceResult;
    if (isNewService) {
      this.serviceIncrement++;
      let postFix = '';
      if (this.serviceIncrement > 0) {
        postFix = '_' + this.serviceIncrement;
      }
      this.serviceApiData.name = this.serviceApiData.name + postFix;
      set(this.serviceApiData, 'tags.service-type', 'simple');
      serviceResult = await this.saveEntity('services', this.serviceApiData).catch((result) => {
        return result;
      });
    } else {
      serviceResult = await this.updateEntity('services', this.serviceApiData).catch((result) => {
        return result;
      });
    }

    let serviceStatus;
    if (serviceResult.error) {
      serviceStatus = 'error';
    } else {
      this.serviceId = this.serviceApiData.id ? this.serviceApiData.id : (serviceResult.id ? serviceResult.id : serviceResult.data.id);
      serviceStatus = 'done';
      let cliConfigIds = '';
      if (!this.sdkOnlyDial && !this.sdkOnlyBind) {
        cliConfigIds = `--configs '${this.interceptConfigId},${this.hostConfigId}'`;
      } else if (!this.sdkOnlyBind && this.sdkOnlyBind) {
        cliConfigIds = `--configs '${this.interceptConfigId}'`;
      } else if (this.sdkOnlyBind && !this.sdkOnlyBind) {
        cliConfigIds = `--configs '${this.interceptConfigId}'`;
      }
      this.serviceCliCommand = `ziti edge create service '${this.serviceApiData.name}' ${cliConfigIds}`
      this.serviceIncrement = -1;
    }
    const summaryIndex = (this.sdkOnlyDial && this.sdkOnlyBind) ? 0 : 1;
    summaryData[summaryIndex].entities[0].status = serviceStatus;
  }

  async savePolicy(summaryData, type = 'Dial') {
    const isNewPolicy = isEmpty(this.serviceApiData?.id);

    let policyApiData, policyResult, roleAttributes, namedAttributes;
    let cliRoles = '';
    let status = '';
    if (isNewPolicy) {
      if (type === 'Dial') {
        this.dialIncrement++;
        let postFix = '';
        if (this.dialIncrement > 0) {
          postFix = '_' + this.dialIncrement;
        }
        this.dialPolicyApiData.name = this.dialPolicyApiData.name + postFix;
        policyApiData = this.dialPolicyApiData;
        roleAttributes = this.dialPolicyRoleAttributes;
        namedAttributes = this.dialPolicyNamedAttributes;
      } else {
        this.bindIncrement++;
        let postFix = '';
        if (this.bindIncrement > 0) {
          postFix = '_' + this.bindIncrement;
        }
        this.bindPolicyApiData.name = this.bindPolicyApiData.name + postFix;
        policyApiData = this.bindPolicyApiData;
        roleAttributes = this.bindPolicyRoleAttributes;
        namedAttributes = this.bindPolicyNamedAttributes;
      }
      policyApiData.serviceRoles = [`@${this.serviceId}`];
      policyApiData.identityRoles = namedAttributes.map((name) => {
        cliRoles += '@' + this.identitiesNameIdMap[name] + ',';
        return '@' + this.identitiesNameIdMap[name];
      });
      policyApiData.identityRoles = [...policyApiData.identityRoles, ...roleAttributes.map((role) => {
        cliRoles += '#' + role + ',';
        return '#' + role;
      })];
      cliRoles = cliRoles.slice(0, -1);
      policyResult = await this.saveEntity('service-policies', policyApiData).catch((result) => {
        return result;
      });
    } else {
      if (type === 'Dial') {
        policyApiData = this.dialPolicyApiData;
        roleAttributes = this.dialPolicyRoleAttributes;
        namedAttributes = this.dialPolicyNamedAttributes;
      } else {
        policyApiData = this.bindPolicyApiData;
        roleAttributes = this.bindPolicyRoleAttributes;
        namedAttributes = this.bindPolicyNamedAttributes;
      }
      policyApiData.serviceRoles = [`@${this.serviceId}`];
      policyApiData.identityRoles = namedAttributes.map((name) => {
        cliRoles += '@' + this.identitiesNameIdMap[name] + ',';
        return '@' + this.identitiesNameIdMap[name];
      });
      policyApiData.identityRoles = [...policyApiData.identityRoles, ...roleAttributes.map((role) => {
        cliRoles += '#' + role + ',';
        return '#' + role;
      })];
      cliRoles = cliRoles.slice(0, -1);
      policyResult = await this.updateEntity('service-policies', policyApiData).catch((result) => {
        return result;
      });
    }

    if (policyResult.error) {
      status = 'error';
    } else {
      status = 'done';
    }
    const summaryIndex = (this.sdkOnlyDial && this.sdkOnlyBind) ? 1 : 2;
    const entityIndex = type === 'Dial' ? 0 : 1;
    summaryData[summaryIndex].entities[entityIndex].status = status;
    const cliCommand = `ziti edge create service-policy '${policyApiData.name}' ${type} --semantic AnyOf --service-roles '@${this.serviceId}' --identity-roles '${cliRoles}'`;
    if (type === 'Dial') {
      this.dialPolicyCliCommand = cliCommand;
      if (status === 'done') {
        this.dialIncrement = -1;
      } else {
        this.bindIncrement = -1;
      }
    } else {
      this.bindPolicyCliCommand = cliCommand;
    }
  }

  saveEntity(type, data) {
    return this.zitiService.post(type, data, true);
  }

  updateEntity(type, data) {
    return this.zitiService.patch(type, data, data.id, true);
  }

  validate() {
    this.errors = {};
    this.validateServiceName();
    this.validateInterceptAddress();
    this.validateInterceptPort();
    this.validateHostAddress();
    this.validateHostPort();
    this.validateDialIdentities()
    this.validateBindIdentities();
    return isEmpty(this.errors);
  }

  validateServiceName() {
    if (isEmpty(this.serviceApiData.name)) {
      this.errors.name = true;
    } else {
      unset(this.errors, 'name');
    }
  }

  validateInterceptAddress() {
    if (this.sdkOnlyDial) {
      unset(this.errors, 'interceptAddress');
      unset(this.errors, 'interceptAddressFormat');
      return;
    }
    if (isEmpty(this.interceptConfigApiData.data.addresses) || isEmpty(this.interceptConfigApiData.data.addresses[0])) {
      this.errors.interceptAddress = true;
    } else if (!this.validationService.isValidInterceptHost(this.interceptConfigApiData.data.addresses[0])) {
      this.errors.interceptAddress = true;
      this.errors.interceptAddressFormat = true;
    } else {
      unset(this.errors, 'interceptAddress');
      unset(this.errors, 'interceptAddressFormat');
    }
  }

  validateInterceptPort() {
    if (this.sdkOnlyDial) {
      unset(this.errors, 'interceptPort');
      return;
    }
    if (isEmpty(this.interceptConfigApiData.data.portRanges)) {
      this.errors.interceptPort = true;
    } else if (this.validationService.validatePortRanges(this.interceptConfigApiData.data.portRanges)) {
      this.errors.interceptPort = true;
    } else {
      unset(this.errors, 'interceptPort');
    }
  }

  validateHostAddress() {
    if (!this.sdkOnlyBind && isEmpty(this.hostConfigApiData.data.address)) {
      this.errors.hostAddress = true;
    } else {
      unset(this.errors, 'hostAddress');
    }
  }

  validateHostPort() {
    if (this.sdkOnlyBind) {
      unset(this.errors, 'hostPort');
      return;
    }
    if (isNil(this.hostConfigApiData.data.port) || isNaN(this.hostConfigApiData.data.port)) {
      this.errors.hostPort = true;
    } else if (!this.validationService.isValidPort(this.hostConfigApiData.data.port)) {
      this.errors.hostPort = true;
    } else {
      unset(this.errors, 'hostPort');
    }
  }

  validateDialIdentities() {
    if (isEmpty([...this.dialPolicyNamedAttributes, ...this.dialPolicyRoleAttributes])) {
      this.errors.dialIdentities = true;
    } else {
      unset(this.errors, 'dialIdentities');
    }
  }

  validateBindIdentities() {
    if (isEmpty([...this.bindPolicyNamedAttributes, ...this.bindPolicyRoleAttributes])) {
      this.errors.bindIdentities = true;
    } else {
      unset(this.errors, 'bindIdentities');
    }
  }

  getServicesApiRequest() {
    return `curl '${this.controllerDomain}/edge/management/v1/services' \\
      -H 'accept: application/json, text/plain, */*' \\
      -H 'content-type: application/json' \\
      -H 'zt-session: ${this.zitiSessionId}' \\
      --data-raw '${JSON.stringify(this.serviceApiData)}' \\`
  }

  getInterceptConfigApiRequest() {
    return `curl '${this.controllerDomain}/edge/management/v1/configs' \\
      -H 'accept: application/json, text/plain, */*' \\
      -H 'content-type: application/json' \\
      -H 'zt-session: ${this.zitiSessionId}' \\
      --data-raw '${JSON.stringify(this.interceptConfigApiData)}' \\`
  }

  getHostConfigApiRequest() {
    return `curl '${this.controllerDomain}/edge/management/v1/configs' \\
      -H 'accept: application/json, text/plain, */*' \\
      -H 'content-type: application/json' \\
      -H 'zt-session: ${this.zitiSessionId}' \\
      --data-raw '${JSON.stringify(this.hostConfigApiData)}' \\`
  }

  getDialApiRequest() {
    return `curl '${this.controllerDomain}/edge/management/v1/service-policies' \\
      -H 'accept: application/json, text/plain, */*' \\
      -H 'content-type: application/json' \\
      -H 'zt-session: ${this.zitiSessionId}' \\
      --data-raw '${JSON.stringify(this.dialPolicyApiData)}' \\`;
  }

  getBindApiRequest() {
    return `curl '${this.controllerDomain}/edge/management/v1/service-policies' \\
      -H 'accept: application/json, text/plain, */*' \\
      -H 'content-type: application/json' \\
      -H 'zt-session: ${this.zitiSessionId}' \\
      --data-raw '${JSON.stringify(this.bindPolicyApiData)}' \\`;
  }

  initDataModels() {
    this.serviceApiData = this.initServiceApiData;
    this.interceptConfigApiData.data = this.initInterceptConfigApiData.data;
    this.hostConfigApiData.data = this.initHostConfigApiData.data;
    this.dialPolicyApiData = this.initDialPolicyApiData;
    this.bindPolicyApiData = this.initBindPolicyApiData;
  }

  convertToAdvanced() {
    const data = {
      appendId: 'ConvertSimpleService',
      title: 'Convert Service',
      message: `Are you sure you would like to convert this simple service to an advanced service? This change cannot be undone.`,
      bulletList: [],
      confirmLabel: 'Yes',
      cancelLabel: 'Oops, no get me out of here',
      imageUrl: '../../assets/svgs/Growl_Warning.svg',
      showCancelLink: true
    };
    this.dialogRef = this.dialogForm.open(ConfirmComponent, {
      data: data,
      autoFocus: false,
    });
    this.dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmed) {
        this.serviceApiData.tags['service-type'] = 'advanced';
        this.updateEntity('services', this.serviceApiData)
          .then(() => {
            const growlerData = new GrowlerModel(
                'success',
                'Success',
                `Service Updated`,
                `Successfully converted ${this.serviceApiData.name} to an advanced service.`,
            );
            this.growlerService.show(growlerData);
            this.setInitData();
            this.router.navigate([URLS.ZITI_ADVANCED_SERVICE + '/' + this.serviceApiData.id]);
          })
          .catch((result) => {
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Failed to Update Service`,
                `Unable to convert ${this.serviceApiData.name} to an advanced service.`,
            );
            this.growlerService.show(growlerData);
          });
      }
    });

  }

  override checkDataChange() {
    const serviceDataChange = !isEqual(this.initServiceApiData, this.serviceApiData);
    const interceptDataChange = !isEqual(this.initInterceptConfigApiData.data, this.interceptConfigApiData.data);
    const hostDataChange = !isEqual(this.initHostConfigApiData.data, this.hostConfigApiData.data);
    const dialDataChange = !isEqual(this.initDialPolicyApiData, this.dialPolicyApiData);
    const bindDataChange = !isEqual(this.initBindPolicyApiData, this.bindPolicyApiData);
    const dataChange = serviceDataChange !== this.serviceDataChange || interceptDataChange !== this.interceptDataChange || hostDataChange !== this.hostDataChange ||
        dialDataChange !== this.dialDataChange || bindDataChange !== this.bindDataChange;
    if (dataChange) {
      this.serviceDataChange = serviceDataChange;
      this.interceptDataChange = interceptDataChange;
      this.hostDataChange = hostDataChange;
      this.dialDataChange = dialDataChange;
      this.bindDataChange = bindDataChange;
      this.dataChange.emit(dataChange);
    }
    this._dataChange = serviceDataChange || interceptDataChange || hostDataChange || dialDataChange || bindDataChange;
    app.isDirty = false;
  }

  clear(): void {
  }
}
