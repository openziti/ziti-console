import {Injectable, Inject} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {Resolver} from "@stoplight/json-ref-resolver";
import {SchemaService} from "../../../services/schema.service";
import {defer, invert, isBoolean, isEmpty, isNil, keys} from "lodash";
import {GrowlerModel} from "../../messaging/growler.model";
import {GrowlerService} from "../../messaging/growler.service";
import {Config} from "../../../models/config";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";
import {ValidationService} from "../../../services/validation.service";
import {Terminator} from "../../../models/terminator";

@Injectable({
    providedIn: 'root'
})
export class TerminatorFormService {

    items: any[] = [];
    errors: any[] = [];
    saveDisabled = false;

    serviceNamedAttributes = [];
    identityNamedAttributes = [];
    routerNamedAttributes = [];

    selectedServiceNamedAttributes = [];
    selectedIdentityNamedAttributes = [];
    selectedRouterNamedAttributes = [];

    serviceNamedAttributesMap: any = {};
    identityNamedAttributesMap: any = {};
    routerNamedAttributesMap: any = {};

    constructor(
        @Inject(ZITI_DATA_SERVICE) private dataService: ZitiDataService,
        @Inject(SHAREDZ_EXTENSION)private extService: ExtensionService,
        private growlerService: GrowlerService,
        private validationService: ValidationService
    ) {
    }

    save(formData) {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getTerminatorDataModel(formData, isUpdate);
        let prom;
        if (isUpdate) {
            prom = this.dataService.patch('terminators', data, formData.id, true);
        } else {
            prom = this.dataService.post('terminators', data, true);
        }

        return prom.then(async (result: any) => {
            const id = isUpdate ? formData.id : (result?.data?.id || result?.id);
            let config = await this.dataService.getSubdata('terminators', id, '').then((svcData) => {
                return svcData.data;
            });
            return this.extService.formDataSaved(config).then((formSavedResult: any) => {
                if (!formSavedResult) {
                    return config;
                }
                const growlerData = new GrowlerModel(
                    'success',
                    'Success',
                    `Terminator ${isUpdate ? 'Updated' : 'Created'}`,
                    `Successfully ${isUpdate ? 'updated' : 'created'} Terminator: ${formData.name}`,
                );
                this.growlerService.show(growlerData);
                return config;
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
                `Error Creating Terminator`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw resp;
        })
    }

    getTerminatorDataModel(formData, isUpdate) {
        const saveModel = new Terminator();
        const modelProperties = keys(saveModel);
        modelProperties.forEach((prop) => {
            switch(prop) {
                default:
                    saveModel[prop] = formData[prop];
            }
        });
        return saveModel;
    }

    public getIdentityNamedAttributes() {
        return this.dataService.get('identities', {rawFilter: true, filter: '', sort: 'name', order: 'asc', total: -1, page: 1}, []).then((result) => {
            const namedAttributes = result.data.map((identity) => {
                this.identityNamedAttributesMap[identity.name] = identity.id;
                return identity.name;
            });
            this.identityNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

    public getServiceNamedAttributes() {
        return this.dataService.get('services', {rawFilter: true, filter: '', sort: 'name', order: 'asc', total: -1, page: 1}, []).then((result) => {
            const namedAttributes = result.data.map((service) => {
                this.serviceNamedAttributesMap[service.name] = service.id;
                return service.name;
            });
            this.serviceNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

    public getRouterNamedAttributes() {
        return this.dataService.get('routers', {rawFilter: true, filter: '', sort: 'name', order: 'asc', total: -1, page: 1}, []).then((result) => {
            const namedAttributes = result.data.map((service) => {
                this.routerNamedAttributesMap[service.name] = service.id;
                return service.name;
            });
            this.routerNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

}
