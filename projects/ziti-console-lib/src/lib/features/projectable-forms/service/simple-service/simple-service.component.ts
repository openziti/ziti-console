import {Component, EventEmitter, Inject, Input, Output} from '@angular/core';
import {ProjectableForm} from "../../projectable-form.class";
import {SETTINGS_SERVICE, SettingsService} from "../../../../services/settings.service";
import {SERVICE_EXTENSION_SERVICE, ServiceFormService} from "../service-form.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../../services/ziti-data.service";
import {GrowlerService} from "../../../messaging/growler.service";
import {ExtensionService} from "../../../extendable/extensions-noop.service";
import {GrowlerModel} from "../../../messaging/growler.model";

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
  serviceApiData = {
    name: "",
    attributes: [],
    configs: [],
    encryptionRequired: true
  };

  interceptConfigApiData = {
    name: "",
    configTypeId:"g7cIWbcGg",
    data: {
      portRanges: [],
      addresses: [],
      protocols: []
    }
  };
  hostConfigApiData = {
    name: '',
    configTypeId: "NH5p4FpGR",
    data: {
      address: "",
      port: undefined,
      forwardProtocol: true,
      allowedProtocols: []
    }
  };
  dialPolicyData = {
    name: "",
    type: "Dial",
    semantic: "AnyOf",
    serviceRoles: [],
    identityRoles: []
  };
  bindPolicyData = {
    name: "",
    type: "Bind",
    semantic: "AnyOf",
    serviceRoles: [],
    identityRoles: []
  };
  interceptConfigId;
  hostConfigId;
  sdkOnlyDial = false;
  sdkOnlyBind = false;
  formData = {};

  @Output() close: EventEmitter<any> = new EventEmitter<any>();
  @Output() selected: EventEmitter<any> = new EventEmitter<any>();

  constructor(
      @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
      public svc: ServiceFormService,
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      growlerService: GrowlerService,
      @Inject(SERVICE_EXTENSION_SERVICE) private extService: ExtensionService,
  ) {
    super(growlerService);
  }

  ngOnInit() {
    this.controllerDomain = this.settingsService?.settings?.selectedEdgeController;
    this.serviceApiUrl = `${this.controllerDomain}/edge/management/v1/services`;
    this.interceptConfigApiUrl = `${this.controllerDomain}/edge/management/v1/configs`;
    this.hostConfigApiUrl = `${this.controllerDomain}/edge/management/v1/configs`;
    this.dialPolicyApiUrl = `${this.controllerDomain}/edge/management/v1/service-policies`;
    this.bindPolicyApiUrl = `${this.controllerDomain}/edge/management/v1/service-policies`;
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
      this.closeModal(false, true, 'cards');
    }
  }

  toggleSdkOnlyDial() {
    this.sdkOnlyDial = !this.sdkOnlyDial;
  }

  toggleSdkOnlyBind() {
    this.sdkOnlyBind = !this.sdkOnlyBind;
  }

  serviceNameChanged(event) {
    this.interceptConfigApiData.name = `${this.serviceApiData.name}-Intercept`
    this.hostConfigApiData.name = `${this.serviceApiData.name}-Host`
    this.dialPolicyData.name = `${this.serviceApiData.name}-Dial`
    this.bindPolicyData.name = `${this.serviceApiData.name}-Bind`
  }

  interceptPortChanged($event) {
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
    const interceptConfigResult = await this.zitiService.post('configs', this.interceptConfigApiData, true);
    this.interceptConfigId = interceptConfigResult.id ? interceptConfigResult.id : interceptConfigResult.data.id;
    const hostConfigResult = await this.zitiService.post('configs', this.hostConfigApiData, true);
    this.hostConfigId = hostConfigResult.id ? hostConfigResult.id : hostConfigResult.data.id;
    this.serviceApiData.configs[0] = this.interceptConfigId;
    this.serviceApiData.configs[1] = this.hostConfigId;
    const serviceResult = await this.zitiService.post('services', this.serviceApiData, true);
    const serviceId = serviceResult.id ? serviceResult.id : serviceResult.data.id;
    this.dialPolicyData.serviceRoles = [`@${serviceId}`];
    this.bindPolicyData.serviceRoles = [`@${serviceId}`];
    this.dialPolicyData.identityRoles = this.bindPolicyData.identityRoles.map((role) => {
      return '#' + role;
    });
    this.bindPolicyData.identityRoles = this.bindPolicyData.identityRoles.map((role) => {
      return '#' + role;
    });
    await this.zitiService.post('service-policies', this.dialPolicyData);
    await this.zitiService.post('service-policies', this.bindPolicyData);
    const growlerData = new GrowlerModel(
        'success',
        'Success',
        `Simple Service ${this.serviceApiData.name} Created`,
        `Successfully entities for simple service ${this.serviceApiData.name}`,
    );
    this.growlerService.show(growlerData);
  }

  clear(): void {
  }
}
