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
import {isEmpty, isNil, isNaN, unset, cloneDeep} from 'lodash';

@Component({
  selector: 'lib-simple-service',
  templateUrl: './simple-service.component.html',
  styleUrls: ['./simple-service.component.scss']
})
export class SimpleServiceComponent extends ProjectableForm {
  @Input() serviceRoleAttributes: any[] = [];
  @Input() identityRoleAttributes: any[] = [];
  @Input() identityNamedAttributes: any[] = [];

  moreActions = [
    {name: 'copyCLI', action: 'copy-cli', label: 'Copy as CLI'},
    {name: 'copyAPI', action: 'copy-api', label: 'Copy as API'}
  ]
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
    attributes: [],
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
  interceptConfigId;
  hostConfigId;
  serviceId;
  sdkOnlyDial = false;
  sdkOnlyBind = false;
  formData = {};
  dialogRef: any;

  interceptIncrement = -1;
  hostIncrement = -1;
  serviceIncrement = -1;
  dialIncrement = -1;
  bindIncrement = -1;

  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() selected: EventEmitter<any> = new EventEmitter<any>();

  constructor(
      @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
      public svc: ServiceFormService,
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      growlerService: GrowlerService,
      @Inject(SERVICE_EXTENSION_SERVICE) private extService: ExtensionService,
      private dialogForm: MatDialog,
  ) {
    super(growlerService);
  }

  ngOnInit() {
    this.controllerDomain = this.settingsService?.settings?.selectedEdgeController;
    this.zitiSessionId = this.settingsService?.settings?.session?.id;
    this.initFormData();
    this.getIdentityNamedAttributes();
  }

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
  }

  getIdentityNamedAttributes() {
    this.zitiService.get('identities', {}, []).then((result) => {
      const namedAttributes = result.data.map((identity) => {
        this.identitiesNameIdMap[identity.name] = identity.id;
        return identity.name;
      });
      this.identityNamedAttributes = namedAttributes;
    });
  }

  headerActionRequested(action) {
    switch(action.name) {
      case 'save':
        this.save();
        break;
      case 'close':
        this.closeModalHandler();
        break;
      case 'toggle-view':
        this.formView = action.data;
        break;
    }
  }

  closeModalHandler() {
    if (!this.showForm) {
      this.showForm = true;
    } else {
      this.closeModal(true, true, 'cards');
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
    if (!this.validate()) {
      return;
    }
    const summaryData = this.showSummary();
    this.serviceApiData.configs = [];
    await this.createInterceptConfig(summaryData);
    await this.createHostConfig(summaryData);
    await this.createService(summaryData);
    await this.createPolicy(summaryData, 'Dial');
    await this.createPolicy(summaryData, 'Bind');

    const growlerData = new GrowlerModel(
        'success',
        'Success',
        `Simple Service ${this.serviceApiData.name} Created`,
        `Successfully created entities for simple service ${this.serviceApiData.name}`,
    );
    this.growlerService.show(growlerData);

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
      retry: this.createInterceptConfig.bind(this),
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
      retry: this.createHostConfig.bind(this)
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
            retry: this.createService.bind(this)
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
            retry: (summaryData) => { this.createPolicy(summaryData, 'Dial') }
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
            retry: (summaryData) => { this.createPolicy(summaryData, 'Bind') }
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
      summaryData: summaryData
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
        this.closeModal(true, true, '');
      }
    });
    return summaryData;
  }

  async createInterceptConfig(summaryData) {
    if (this.sdkOnlyDial) {
      return;
    }
    let status;
    this.interceptIncrement++;
    let postFix = '';
    if (this.interceptIncrement > 0) {
      postFix = '_' + this.interceptIncrement;
    }
    this.interceptConfigApiData.name = this.interceptConfigApiData.name + postFix;
    const interceptConfigResult: any = await this.zitiService.post('configs', this.interceptConfigApiData, true).catch((result) => {
      return result;
    });
    if (interceptConfigResult.error) {
      status = 'error';
    } else {
      this.interceptConfigId = interceptConfigResult.id ? interceptConfigResult.id : interceptConfigResult.data.id;
      this.serviceApiData.configs.push(this.interceptConfigId);
      this.interceptConfigCliCommand = `ziti edge create config '${this.interceptConfigApiData.name}' '${this.interceptConfigApiData.configTypeId}' '${JSON.stringify(this.interceptConfigApiData.data)}'`;
      status = 'done';
      this.interceptIncrement = -1;
    }
    summaryData[0].entities[0].status = status;
  }

  async createHostConfig(summaryData) {
    if (this.sdkOnlyBind) {
      return;
    }
    let status;
    this.hostIncrement++;
    let postFix = '';
    if (this.hostIncrement > 0) {
      postFix = '_' + this.hostIncrement;
    }
    this.hostConfigApiData.name = this.hostConfigApiData.name + postFix;
    const hostConfigResult: any = await this.zitiService.post('configs', this.hostConfigApiData, true).catch((result) => {
      return result;
    });
    if (hostConfigResult.error) {
      status = 'error';
    } else {
      this.hostConfigId = hostConfigResult.id ? hostConfigResult.id : hostConfigResult.data.id;
      this.serviceApiData.configs.push(this.hostConfigId);
      this.hostConfigCliCommand = `ziti edge create config '${this.hostConfigApiData.name}' '${this.hostConfigApiData.configTypeId}' '${JSON.stringify(this.hostConfigApiData.data)}'`;
      status = 'done';
      this.hostIncrement = -1;
    }
    if (this.sdkOnlyDial) {
      summaryData[0].entities[0].status = status;
      summaryData[0].entities[0].apiData = this.hostConfigApiData;
    } else {
      summaryData[0].entities[1].status = status;
      summaryData[0].entities[0].apiData = this.hostConfigApiData;
    }
  }

  async createService(summaryData) {
    this.serviceIncrement++;
    let postFix = '';
    if (this.serviceIncrement > 0) {
      postFix = '_' + this.serviceIncrement;
    }
    this.serviceApiData.name = this.serviceApiData.name + postFix;
    const serviceResult: any = await this.zitiService.post('services', this.serviceApiData, true).catch((result) => {
      return result;
    });
    let serviceStatus;
    if (serviceResult.error) {
      serviceStatus = 'error';
    } else {
      this.serviceId = serviceResult.id ? serviceResult.id : serviceResult.data.id;
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

  async createPolicy(summaryData, type = 'Dial') {
    let policyApiData, roleAttributes, namedAttributes;
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
    let cliRoles = '';
    let status = '';
    policyApiData.identityRoles = namedAttributes.map((name) => {
      cliRoles += '@' + this.identitiesNameIdMap[name] + ',';
      return '@' + this.identitiesNameIdMap[name];
    });
    policyApiData.identityRoles = [...policyApiData.identityRoles, ...roleAttributes.map((role) => {
      cliRoles += '#' + role + ',';
      return '#' + role;
    })];
    cliRoles = cliRoles.slice(0, -1);
    const dialPolicyResult = await this.zitiService.post('service-policies', policyApiData).catch((result) => {
      return result;
    });
    if (dialPolicyResult.error) {
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
    if (!this.sdkOnlyDial && (isEmpty(this.interceptConfigApiData.data.addresses) || isEmpty(this.interceptConfigApiData.data.addresses[0]))) {
      this.errors.interceptAddress = true;
    } else {
      unset(this.errors, 'interceptAddress');
    }
  }

  validateInterceptPort() {
    if (!this.sdkOnlyDial && isEmpty(this.interceptConfigApiData.data.portRanges)) {
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
    if (!this.sdkOnlyBind && isNil(this.hostConfigApiData.data.port) || isNaN(this.hostConfigApiData.data.port)) {
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

  clear(): void {
  }
}
