/*
    Copyright NetFoundry Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import {Injectable, Inject, InjectionToken} from "@angular/core";
import {isEmpty, unset, keys, some, defer, cloneDeep, filter} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ExtensionService} from "../../extendable/extensions-noop.service";
import {Service} from "../../../models/service";
import moment from 'moment';
import dynamic from "ajv/dist/vocabularies/dynamic";
import {SchemaService} from "../../../services/schema.service";
import {Subscription} from "rxjs";

export const SERVICE_EXTENSION_SERVICE = new InjectionToken<any>('SERVICE_EXTENSION_SERVICE');

@Injectable({
    providedIn: 'root'
})
export class ServiceFormService {

    paging = {
        filter: "",
        noSearch: true,
        order: "asc",
        page: 1,
        searchOn: "name",
        sort: "name",
        total: 100
    }

    formData: any;
    configData: any;
    selectedConfigId: any = '';
    configs: any = [];
    configTypes: any = [];
    filteredConfigs: any = [];
    selectedConfigTypeId: any = '';
    selectedConfigType: any = {};
    addedConfigNames: any = [];
    addedTerminatorNames: any = [];
    addedTerminators: any = [];
    configJsonView = false;
    hideConfigJSON = false;
    configErrors: any = {};
    terminatorErrors: any = {};
    newConfigName: string = '';
    terminatorHost: string = '';
    terminatorPort: string = '';
    selectedSchema: any = {};
    items: any = [];
    routers: any = [];
    configDataLabel = 'Configuration Form';
    attachLabel = 'Create and Attach';
    errors: any = {};
    selectedRouterId: string = '';
    selectedRouter: any;
    selectedBindingId: string = '';
    terminatorProtocol = 'udp';

    associatedConfigs: any = [];
    associatedTerminators: any = [];

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

    subscription: Subscription = new Subscription();

    constructor(
        @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        private growlerService: GrowlerService,
        @Inject(SERVICE_EXTENSION_SERVICE)private extService: ExtensionService,
        private schemaSvc: SchemaService
    ) {}
 
    save(formData): Promise<any> {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getServiceDataModel(formData, isUpdate);
        const svc = isUpdate ? this.zitiService.patch.bind(this.zitiService) : this.zitiService.post.bind(this.zitiService);
        return svc('services', data, formData.id).then(async (result: any) => {
            const id = result?.data?.id || formData.id;
            let router = await this.zitiService.getSubdata('services', id, '').then((routerData) => {
                return routerData.data;
            });
            return this.extService.formDataSaved(router).then((formSavedResult: any) => {
                if (!formSavedResult) {
                    return router;
                }
                const growlerData = new GrowlerModel(
                    'success',
                    'Success',
                    `Services ${isUpdate ? 'Updated' : 'Created'}`,
                    `Successfully ${isUpdate ? 'updated' : 'created'} Service: ${formData.name}`,
                );
                this.growlerService.show(growlerData);
                return router;
            }).catch((result) => {
                return false;
            });
        }).catch((resp) => {
            let errorMessage;
            if (resp?.error?.error?.cause?.message) {
                errorMessage = resp?.error?.error?.cause?.message;
            } else if (resp?.error?.error?.cause?.reason) {
                errorMessage = resp?.error?.error?.cause?.reason;
            }else if (resp?.error?.message) {
                errorMessage = resp?.error?.message;
            } else {
                errorMessage = 'An unknown error occurred';
            }
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Error Creating Service`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw resp;
        })
    }

    addTerminators(serviceId) {
        const promises = [];
        this.addedTerminators.forEach((terminator) => {
            terminator.service = serviceId
            promises.push(this.zitiService.post('terminators', terminator));
        });
    }

    getServiceDataModel(formData, isUpdate) {
        const saveModel = new Service();
        const modelProperties = keys(saveModel);
        modelProperties.forEach((prop) => {
            switch(prop) {
                default:
                    saveModel[prop] = formData[prop];
            }
        });
        return saveModel;
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

    getAssociatedConfigs() {
        this.zitiService.getSubdata('services', this.formData.id, 'configs').then((result: any) => {
            this.associatedConfigs = result.data;
            this.addedConfigNames = this.associatedConfigs.map((cfg) => {
                return cfg.name;
            });
        });
    }

    getAssociatedTerminators() {
        this.zitiService.getSubdata('services', this.formData.id, 'terminators').then((result: any) => {
            this.associatedTerminators = result.data;
            this.addedTerminatorNames = this.associatedTerminators.map((cfg) => {
                return cfg.router?.name;
            });
        });
    }

    createConfig(configData) {
        return this.zitiService.post('configs', configData).then((result) => {
            return result;
        }).catch((response) => {
            const msg = response?.error?.error?.cause?.reason;
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Error Creating New Config`,
                msg,
            );
            this.growlerService.show(growlerData);
        });
    }

    configTypeChanged(dynamicForm?) {
        this.filteredConfigs = this.configs.filter((config) => {
            return config.configTypeId === this.selectedConfigTypeId;
        });
        this.configTypes.forEach((configType) => {
            if (this.selectedConfigTypeId === configType.id) {
                this.selectedConfigType = configType;
            }
        });
        this.selectedConfigId = !isEmpty(this.selectedConfigTypeId) ? 'add-new' : '';
        this.configChanged(dynamicForm);
    }

    routerChanged(event?: any) {
        let selectedRouter;
        this.routers.forEach((router) => {
            if (this.selectedRouterId === router.id) {
                selectedRouter = router;
            }
        });
        this.selectedRouter = selectedRouter;
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

    async createForm(dynamicForm) {
        this.clearForm();
        if (this.selectedConfigType && dynamicForm) {
            if (this.selectedSchema) {
                this.renderSchmea(this.selectedSchema, dynamicForm);
            }
        }
    }

    clearForm() {
        this.items.forEach((item: any) => {
            if (item?.component) item.component.destroy();
        });
        this.items = [];
        if (this.subscription) this.subscription.unsubscribe();
    }

    renderSchmea(schema: any, dynamicForm: any) {
        if (schema.properties) {
            this.items = this.schemaSvc.render(schema, dynamicForm, this.lColorArray, this.bColorArray);
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

    async attachConfig(addedConfigId) {
        let configId;
        if (this.selectedConfigId === 'add-new') {
            if (!this.configJsonView) {
                this.getConfigDataFromForm();
            }
            if (!this.validateConfig()) {
                return;
            }
            const newConfig = {
                configTypeId: this.selectedConfigTypeId,
                data: this.configData,
                name: this.newConfigName
            }
            configId = await this.createConfig(newConfig)
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
            this.selectedConfigTypeId = '';
            this.selectedConfigId = '';
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

    removeConfig(nameToRemove) {
        let configIdToRemove;
        this.configs.forEach((availableConfig) => {
            if (availableConfig.name === nameToRemove) {
                configIdToRemove = availableConfig.id;
            }
        });
        if (configIdToRemove) {
            const newConfigs = filter(this.formData.configs, configId => {
                return configId !== configIdToRemove;
            });
            const newConfigNames = filter(this.addedConfigNames, (configName) => {
                return configName !== nameToRemove;
            });
            this.formData.configs = newConfigs;
            this.addedConfigNames = newConfigNames;
        }
    }

    getConfigDataFromForm() {
        const data = {};
        this.addItemsToConfig(this.items, data);
        this.configData = data;
        this.hideConfigJSON = false;
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

    async configChanged(dynamicForm) {
        let selectedConfig: any = {};
        this.configData = undefined;
        let data;
        let attachLabel = 'Attach to Service';
        if (this.selectedConfigId === 'add-new') {
            data = {};
            this.selectedSchema = await this.zitiService.schema(this.selectedConfigType.schema);
            attachLabel = 'Create and Attach';
            this.createForm(dynamicForm);
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

    updateConfigData() {
        if (!this.configJsonView) {
            this.updateFormView(this.items, this.configData);
        } else {
            this.hideConfigJSON = true;
            defer(() => {
                this.getConfigDataFromForm();
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

    addTerminator() {
        let termAdded = false;
        this.addedTerminators.forEach((termName) => {
            if (this.selectedRouter.name === termName) {
                termAdded = true;
            }
        });
        if (!termAdded) {
            const terminatorModel = {
                address: this.terminatorProtocol + ':' + this.terminatorHost + ":" + this.terminatorPort,
                binding: this.selectedBindingId,
                router: this.selectedRouter.id,
                service: undefined
            }
            this.addedTerminatorNames = [...this.addedTerminatorNames, this.selectedRouter.name];
            this.addedTerminators.push(terminatorModel);
            this.selectedRouterId = '';
            this.selectedBindingId = '';
            this.terminatorPort = '';
            this.terminatorHost = '';
            this.terminatorProtocol = '';
        }
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
}