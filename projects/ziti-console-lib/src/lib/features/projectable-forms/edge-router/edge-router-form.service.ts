import {Injectable, Inject, InjectionToken} from "@angular/core";
import {isEmpty, unset, keys} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {Identity} from "../../../models/identity";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ExtensionService} from "../../extendable/extensions-noop.service";

import moment from 'moment';
import {EdgeRouter} from "../../../models/edge-router";

export const EDGE_ROUTER_EXTENSION_SERVICE = new InjectionToken<any>('EDGE_ROUTER_EXTENSION_SERVICE');

@Injectable({
    providedIn: 'root'
})
export class EdgeRouterFormService {

    constructor(
        @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        private growlerService: GrowlerService,
        @Inject(EDGE_ROUTER_EXTENSION_SERVICE)private extService: ExtensionService
    ) {}
 
    save(formData): Promise<any> {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getEdgeRouterDataModel(formData, isUpdate);
        const svc = isUpdate ? this.zitiService.patch.bind(this.zitiService) : this.zitiService.post.bind(this.zitiService);
        return svc('edge-routers', data, formData.id).then(async (result: any) => {
            let router = await this.zitiService.getSubdata('edge-routers', result?.data?.id, '').then((routerData) => {
                return routerData.data;
            });
            return this.extService.formDataSaved(result).then((formSavedResult: any) => {
                if (!formSavedResult) {
                    return router;
                }
                const growlerData = new GrowlerModel(
                    'success',
                    'Success',
                    `Edge Router ${isUpdate ? 'Updated' : 'Created'}`,
                    `Successfully ${isUpdate ? 'updated' : 'created'} Identity: ${formData.name}`,
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
                `Error Creating Edge Router`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw resp;
        })
    }

    getEdgeRouterDataModel(formData, isUpdate) {
        const saveModel = new EdgeRouter();
        const modelProperties = keys(saveModel);
        modelProperties.forEach((prop) => {
            switch(prop) {
                default:
                    saveModel[prop] = formData[prop];
            }
        });
        return saveModel;
    }
}