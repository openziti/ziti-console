import {Injectable, Inject, InjectionToken} from "@angular/core";
import {isEmpty, unset, keys} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";

import {EdgeRouter} from "../../../models/edge-router";

@Injectable({
    providedIn: 'root'
})
export class APISessionFormService {

    associatedIdentities: any = [];
    associatedIdentityNames: any = [];
    associatedServices: any = [];
    associatedServiceNames: any = [];

    constructor(
        @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        private growlerService: GrowlerService,
        @Inject(SHAREDZ_EXTENSION)private extService: ExtensionService
    ) {}
 
    save(formData): Promise<any> {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getEdgeRouterDataModel(formData, isUpdate);
        const svc = isUpdate ? this.zitiService.patch.bind(this.zitiService) : this.zitiService.post.bind(this.zitiService);
        return svc('transit-routers', data, formData.id).then(async (result: any) => {
            const id = result?.data?.id || formData.id;
            let router = await this.zitiService.getSubdata('transit-routers', id, '').then((routerData) => {
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
                    `Transit Router ${isUpdate ? 'Updated' : 'Created'}`,
                    `Successfully ${isUpdate ? 'updated' : 'created'} Transit Router: ${formData.name}`,
                );
                this.growlerService.show(growlerData);
                return returnVal;
            }).catch((result) => {
                return false;
            });
        }).catch((resp) => {
            const errorMessage = this.zitiService.getErrorMessage(resp);
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Error ${isUpdate ? 'Updating' : 'Creating'} Transit Router`,
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
        this.zitiService.getSubdata('transit-routers', id, 'services').then((result: any) => {
            this.associatedServices = result.data;
            this.associatedServiceNames = this.associatedServices.map((svc) => {
                return svc.name;
            });
        });
    }

    getAssociatedIdentities(id) {
        this.zitiService.getSubdata('transit-routers', id, 'identities').then((result: any) => {
            this.associatedIdentities = result.data;
            this.associatedIdentityNames = this.associatedIdentities.map((policy) => {
                return policy.name;
            });
        });
    }

    refreshRouter(id) {
        const url: any = `/transit-routers/${id}`
        return this.zitiService.call(url);
    }
}
