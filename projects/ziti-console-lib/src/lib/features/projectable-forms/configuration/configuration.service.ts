import {Injectable, Inject} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {Resolver} from "@stoplight/json-ref-resolver";
import {SchemaService} from "../../../services/schema.service";
import {defer, isBoolean, isEmpty, isNil, keys} from "lodash";
import {GrowlerModel} from "../../messaging/growler.model";
import {GrowlerService} from "../../messaging/growler.service";
import {Config} from "../../../models/config";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";
import {SERVICE_EXTENSION_SERVICE} from "../service/service-form.service";
import {ValidationService} from "../../../services/validation.service";

@Injectable({
    providedIn: 'root'
})
export class ConfigurationService {
    private configTypes: any[] = [];

    items: any[] = [];
    errors: any[] = [];
    saveDisabled = false;
    configJsonView = false;
    configDataLabel = 'Configuration Form';

    constructor(
        @Inject(ZITI_DATA_SERVICE) private dataService: ZitiDataService,
        @Inject(SHAREDZ_EXTENSION)private extService: ExtensionService,
        private schemaSvc: SchemaService,
        private growlerService: GrowlerService,
        private validationService: ValidationService
    ) {
    }

    async getSchema(schemaType: string): Promise<any> {
        if (!schemaType) return Promise.resolve();
        for (let idx = 0; idx < this.configTypes.length; idx++) {
            if(this.configTypes[idx].id === schemaType)
                return this.configTypes[idx].schema;
        }
    }

    getConfigTypes() {
        const paging = {
            filter: "",
            noSearch: false,
            order: "asc",
            page: 1,
            searchOn: "name",
            sort: "name",
            total: 50
        };
        return this.dataService.get('config-types', paging, [])
        .then(async (body: any) => {
            if (body.error) throw body.error;
            this.configTypes = [];
            const promises: Promise<any>[] = [];
            const resolver = new Resolver();
            body.data.map( (row: any) => {
                const schema = row.schema;
                promises.push(resolver.resolve(schema, {}).then(s => {
                    row.schema = s.result;
                    this.configTypes.push(row);
                }))
            });
            return Promise.all(promises).then(() => this.configTypes);
        });
    }

    getAssociatedServices(configId) {
        return this.dataService.getSubdata('configs', configId, 'services').then((result: any) => {
            const associatedServices = result.data;
            const associatedServiceNames = associatedServices.map((svc) => {
                return svc.name;
            });
            return {associatedServices, associatedServiceNames};
        });
    }

    toggleJSONView() {
        this.configJsonView = !this.configJsonView;
        this.configDataLabel = this.configJsonView ? 'JSON Configuration' : 'Configuration Form';
        if (this.configJsonView) {
            //this.configSubscriptions.unsubscribe();
        }
    }

    save(formData) {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getConfigDataModel(formData, isUpdate);
        let prom;
        if (isUpdate) {
            prom = this.dataService.patch('configs', data, formData.id, true);
        } else {
            prom = this.dataService.post('configs', data, true);
        }

        return prom.then(async (result: any) => {
            const id = isUpdate ? formData.id : (result?.data?.id || result?.id);
            let config = await this.dataService.getSubdata('configs', id, '').then((svcData) => {
                return svcData.data;
            });
            return this.extService.formDataSaved(config).then((formSavedResult: any) => {
                if (!formSavedResult) {
                    return config;
                }
                const growlerData = new GrowlerModel(
                    'success',
                    'Success',
                    `Config ${isUpdate ? 'Updated' : 'Created'}`,
                    `Successfully ${isUpdate ? 'updated' : 'created'} Config: ${formData.name}`,
                );
                this.growlerService.show(growlerData);
                return config;
            }).catch((result) => {
                return false;
            });
        }).catch((resp) => {
            const errorMessage = this.dataService.getErrorMessage(resp);
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Error ${isUpdate ? 'Updating' : 'Creating'} Config`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw resp;
        })
    }

    getConfigDataModel(formData, isUpdate) {
        const saveModel = new Config();
        const modelProperties = keys(saveModel);
        modelProperties.forEach((prop) => {
            switch(prop) {
                default:
                    saveModel[prop] = formData[prop];
            }
        });
        saveModel.data = this.validationService.redefineObject(saveModel.data);
        return saveModel;
    }
}
