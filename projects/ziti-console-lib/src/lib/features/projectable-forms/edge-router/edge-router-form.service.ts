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

    associatedIdentities: any = [];
    associatedIdentityNames: any = [];
    associatedServices: any = [];
    associatedServiceNames: any = [];

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
            const id = result?.data?.id || formData.id;
            let router = await this.zitiService.getSubdata('edge-routers', id, '').then((routerData) => {
                return routerData.data;
            });
            return this.extService.formDataSaved(router).then((formSavedResult: any) => {
                const returnVal = {
                    data: router,
                    close: this.extService.closeAfterSave
                };
                const growlerData = new GrowlerModel(
                    'success',
                    'Success',
                    `Edge Router ${isUpdate ? 'Updated' : 'Created'}`,
                    `Successfully ${isUpdate ? 'updated' : 'created'} Edge Router: ${formData.name}`,
                );
                this.growlerService.show(growlerData);
                return returnVal;
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

    getAuthPolicies() {
        const paging = {
            filter: "",
            noSearch: true,
            order: "asc",
            page: 1,
            searchOn: "name",
            sort: "name",
            total: 100
        }
        return this.zitiService.get('auth-policies', paging, []).then((result: any) => {
            return [{id: 'default', name: 'Default'}, ...result.data];
        });
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

    getAssociatedServices(id) {
        this.zitiService.getSubdata('edge-routers', id, 'services').then((result: any) => {
            this.associatedServices = result.data;
            this.associatedServiceNames = this.associatedServices.map((svc) => {
                return svc.name;
            });
        });
    }

    getAssociatedIdentities(id) {
        this.zitiService.getSubdata('edge-routers', id, 'identities').then((result: any) => {
            this.associatedIdentities = result.data;
            this.associatedIdentityNames = this.associatedIdentities.map((policy) => {
                return policy.name;
            });
        });
    }

    refreshRouter(id) {
        const url: any = `/edge-routers/${id}`
        return this.zitiService.call(url);
    }
}