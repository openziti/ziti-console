import {Injectable, Inject, InjectionToken} from "@angular/core";
import {isEmpty, unset, keys, sortBy} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ExtensionService} from "../../extendable/extensions-noop.service";

import {sortedUniq} from 'lodash';

import {EdgeRouterPolicy} from "../../../models/edge-router-policy";

export const EDGE_ROUTER_POLICY_EXTENSION_SERVICE = new InjectionToken<any>('EDGE_ROUTER_POLICY_EXTENSION_SERVICE');

@Injectable({
    providedIn: 'root'
})
export class EdgeRouterPolicyFormService {

    associatedIdentities: any = [];
    associatedIdentityNames: any = [];
    associatedEdgeRouters: any = [];
    associatedEdgeRouterNames: any = [];

    edgeRouterNamedAttributesMap: any = {};
    identityNamedAttributesMap: any = {};

    identityNamedAttributes: any = [];
    edgeRouterNamedAttributes: any = [];

    edgeRouterRoleAttributes: any = [];
    identityRoleAttributes: any = [];

    constructor(
        @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        private growlerService: GrowlerService,
        @Inject(EDGE_ROUTER_POLICY_EXTENSION_SERVICE)private extService: ExtensionService
    ) {}

    save(formData): Promise<any> {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getEdgeRouterPolicyDataModel(formData, isUpdate);
        const svc = isUpdate ? this.zitiService.patch.bind(this.zitiService) : this.zitiService.post.bind(this.zitiService);
        return svc('edge-router-policies', data, formData.id).then(async (result: any) => {
            const id = result?.data?.id || formData.id;
            let router = await this.zitiService.getSubdata('edge-router-policies', id, '').then((routerData) => {
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
                    `Edge Router Policy ${isUpdate ? 'Updated' : 'Created'}`,
                    `Successfully ${isUpdate ? 'updated' : 'created'} Edge Router Policy: ${formData.name}`,
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
                `Error ${isUpdate ? 'Updating' : 'Creating'} Edge Router Policy`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw resp;
        })
    }

    getAssociatedServicesByRole(id) {
        this.zitiService.getSubdata('edge-router-policies', id, 'edge-routers').then((result: any) => {
            this.associatedEdgeRouters = result.data;
            this.associatedEdgeRouterNames = this.associatedEdgeRouters.map((svc) => {
                return svc.name;
            });
        });
    }

    getAssociatedIdentitiesById(id) {
        this.zitiService.getSubdata('edge-router-policies', id, 'identities').then((result: any) => {
            this.associatedIdentities = result.data;
            this.associatedIdentityNames = this.associatedIdentities.map((ident) => {
                return ident.name;
            });
        });
    }

    getAssociatedEdgeRoutersByAttribute(roleAttributes, namedAttributes) {
        this.associatedEdgeRouterNames = [];
        if (isEmpty(roleAttributes)) {
            this.associatedEdgeRouterNames = [...namedAttributes];
            return;
        }
        const filters = this.zitiService.getRoleFilter(roleAttributes);
        const paging = this.zitiService.DEFAULT_PAGING;
        paging.noSearch = false;
        this.zitiService.get('edge-routers', paging, filters).then((result: any) => {
            this.associatedEdgeRouters = result.data;
            this.associatedEdgeRouterNames = this.associatedEdgeRouters.map((svc) => {
                return svc.name;
            });
            this.associatedEdgeRouterNames = [...this.associatedEdgeRouterNames, ...namedAttributes];
            this.associatedEdgeRouterNames = sortBy(this.associatedEdgeRouterNames);
            this.associatedEdgeRouterNames = sortedUniq(this.associatedEdgeRouterNames);
        });
    }

    getAssociatedIdentitiesByAttribute(roleAttributes, namedAttributes) {
        this.associatedIdentityNames = [];
        if (isEmpty(roleAttributes)) {
            this.associatedIdentityNames = [...namedAttributes];
            return;
        }
        const filters = this.zitiService.getRoleFilter(roleAttributes);
        const paging = this.zitiService.DEFAULT_PAGING;
        paging.noSearch = false;
        this.zitiService.get('identities', paging, filters).then((result: any) => {
            this.associatedIdentities = result.data;
            this.associatedIdentityNames = this.associatedIdentities.map((svc) => {
                return svc.name;
            });
            this.associatedIdentityNames = [...this.associatedIdentityNames, ...namedAttributes];
            this.associatedIdentityNames = sortBy(this.associatedIdentityNames);
            this.associatedIdentityNames = sortedUniq(this.associatedIdentityNames);
        });
    }

    public getEdgeRouterRoleAttributes() {
        return this.zitiService.get('edge-router-role-attributes', {}, []).then((result) => {
            this.edgeRouterRoleAttributes = result.data;
            return result;
        });
    }

    public getIdentityNamedAttributes() {
        return this.zitiService.get('identities', {}, []).then((result) => {
            const namedAttributes = result.data.map((identity) => {
                this.identityNamedAttributesMap[identity.name] = identity.id;
                return identity.name;
            });
            this.identityNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

    public getEdgeRouterNamedAttributes() {
        return this.zitiService.get('edge-routers', {}, []).then((result) => {
            const namedAttributes = result.data.map((router) => {
                this.edgeRouterNamedAttributesMap[router.name] = router.id;
                return router.name;
            });
            this.edgeRouterNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

    public getIdentityRoleAttributes() {
        return this.zitiService.get('identity-role-attributes', {}, []).then((result) => {
            this.identityRoleAttributes = result.data;
            return result;
        });
    }

    getEdgeRouterPolicyDataModel(formData, isUpdate) {
        const saveModel = new EdgeRouterPolicy();
        const modelProperties = keys(saveModel);
        modelProperties.forEach((prop) => {
            switch(prop) {
                default:
                    saveModel[prop] = formData[prop];
            }
        });
        return saveModel;
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

    getSelectedRoles(roleAttributes, namedAttributes, namedAttributeMap) {
        const prependedRoleAttributes = roleAttributes.map((attr) => {
            return '#' + attr;
        })
        const prependedNamedAttributes = namedAttributes.map((attr) => {
            return '@' + namedAttributeMap[attr];
        })
        return [...prependedRoleAttributes, ...prependedNamedAttributes];
    }
}
