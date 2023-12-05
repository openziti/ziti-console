import {Injectable, Inject, InjectionToken} from "@angular/core";
import {isEmpty, unset, keys} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ExtensionService} from "../../extendable/extensions-noop.service";
import {Service} from "../../../models/service";
import moment from 'moment';

export const SERVICE_EXTENSION_SERVICE = new InjectionToken<any>('SERVICE_EXTENSION_SERVICE');

@Injectable({
    providedIn: 'root'
})
export class ServiceFormService {

    constructor(
        @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        private growlerService: GrowlerService,
        @Inject(SERVICE_EXTENSION_SERVICE)private extService: ExtensionService
    ) {}
 
    save(formData): Promise<any> {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getEdgeRouterDataModel(formData, isUpdate);
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

    getEdgeRouterDataModel(formData, isUpdate) {
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
}