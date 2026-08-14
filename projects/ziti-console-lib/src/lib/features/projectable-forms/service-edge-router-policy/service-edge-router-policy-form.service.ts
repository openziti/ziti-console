import {Injectable, Inject, InjectionToken} from "@angular/core";
import {isEmpty, unset, keys, sortBy} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ExtensionService} from "../../extendable/extensions-noop.service";

import {sortedUniq} from 'lodash';

import {ServiceEdgeRouterPolicy} from "../../../models/service-edge-router-policy";

export const SERVICE_EDGE_ROUTER_POLICY_EXTENSION_SERVICE = new InjectionToken<any>('SERVICE_EDGE_ROUTER_POLICY_EXTENSION_SERVICE');

@Injectable({
    providedIn: 'root'
})
export class ServiceEdgeRouterPolicyFormService {

    associatedServices: any = [];
    associatedServiceNames: any = [];
    associatedEdgeRouters: any = [];
    associatedEdgeRouterNames: any = [];

    edgeRouterNamedAttributesMap: any = {};
    serviceNamedAttributesMap: any = {};

    serviceNamedAttributes: any = [];
    edgeRouterNamedAttributes: any = [];

    edgeRouterRoleAttributes: any = [];
    serviceRoleAttributes: any = [];

    constructor(
        @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        private growlerService: GrowlerService,
        @Inject(SERVICE_EDGE_ROUTER_POLICY_EXTENSION_SERVICE)private extService: ExtensionService
    ) {}

    save(formData): Promise<any> {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getEdgeRouterPolicyDataModel(formData, isUpdate);
        const svc = isUpdate ? this.zitiService.patch.bind(this.zitiService) : this.zitiService.post.bind(this.zitiService);
        return svc('service-edge-router-policies', data, formData.id).then(async (result: any) => {
            const id = result?.data?.id || formData.id;
            let router = await this.zitiService.getSubdata('service-edge-router-policies', id, '').then((routerData) => {
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
                `Error ${isUpdate ? 'Updating' : 'Creating'} Service Edge Router Policy`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw resp;
        })
    }

    getAssociatedEdgeRoutersByAttribute(roleAttributes, namedAttributes, semantic = 'AnyOf') {
        this.associatedEdgeRouterNames = [];
        if (isEmpty(roleAttributes)) {
            this.associatedEdgeRouterNames = [...namedAttributes];
            return;
        }
        const filters = this.zitiService.getRoleFilter(roleAttributes, semantic);
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
            this.associatedEdgeRouterNames = this.associatedEdgeRouterNames.filter(item => item !== undefined);
        });
    }

    getAssociatedServicesByAttribute(roleAttributes, namedAttributes, semantic = 'AnyOf') {
        this.associatedServiceNames = [];
        if (isEmpty(roleAttributes)) {
            this.associatedServiceNames = [...namedAttributes];
            return;
        }
        const filters = this.zitiService.getRoleFilter(roleAttributes, semantic);
        const paging = this.zitiService.DEFAULT_PAGING;
        paging.noSearch = false;
        this.zitiService.get('services', paging, filters).then((result: any) => {
            this.associatedServices = result.data;
            this.associatedServiceNames = this.associatedServices.map((svc) => {
                return svc.name;
            });
            this.associatedServiceNames = [...this.associatedServiceNames, ...namedAttributes];
            this.associatedServiceNames = sortBy(this.associatedServiceNames);
            this.associatedServiceNames = sortedUniq(this.associatedServiceNames);
            this.associatedServiceNames = this.associatedServiceNames.filter(item => item !== undefined);
        });
    }

    public getEdgeRouterRoleAttributes() {
        return this.zitiService.get('edge-router-role-attributes', {}, []).then((result) => {
            this.edgeRouterRoleAttributes = result.data;
            return result;
        });
    }

    private serviceNamedAttributesRequestId = 0;

    public getServiceNamedAttributes(filter?: string) {
        const requestId = ++this.serviceNamedAttributesRequestId;
        const paging = {searchOn: 'name', filter: filter || '', total: 100, page: 1, sort: 'name', order: 'asc'};
        const filters = [];
        if (!isEmpty(filter)) {
            filters.push({filterName: 'name', columnId: 'name', value: filter || '%', label: '', type: 'TEXTINPUT'});
        }
        return this.zitiService.get('services', paging, filters).then((result) => {
            if (requestId !== this.serviceNamedAttributesRequestId) {
                return this.serviceNamedAttributes;
            }
            const namedAttributes = result.data.map((service) => {
                this.serviceNamedAttributesMap[service.name] = service.id;
                return service.name;
            });
            this.serviceNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

    private edgeRouterNamedAttributesRequestId = 0;

    public getEdgeRouterNamedAttributes(filter?: string) {
        const requestId = ++this.edgeRouterNamedAttributesRequestId;
        const paging = {searchOn: 'name', filter: filter || '', total: 100, page: 1, sort: 'name', order: 'asc'};
        const filters = [];
        if (!isEmpty(filter)) {
            filters.push({filterName: 'name', columnId: 'name', value: filter || '%', label: '', type: 'TEXTINPUT'});
        }
        return this.zitiService.get('edge-routers', paging, filters).then((result) => {
            if (requestId !== this.edgeRouterNamedAttributesRequestId) {
                return this.edgeRouterNamedAttributes;
            }
            const namedAttributes = result.data.map((router) => {
                this.edgeRouterNamedAttributesMap[router.name] = router.id;
                return router.name;
            });
            this.edgeRouterNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

    public getServiceRoleAttributes() {
        return this.zitiService.get('service-role-attributes', {}, []).then((result) => {
            this.serviceRoleAttributes = result.data;
            return result;
        });
    }

    /**
     * The policy response includes edgeRouterRolesDisplay/serviceRolesDisplay alongside the
     * raw #role/@id arrays, resolving every referenced name for free (no extra request) even
     * when that entity falls outside the paged named-attribute fetch above.
     */
    public mergeRolesDisplayIntoMaps(formData: any): void {
        this.mergeDisplayIntoMap(formData?.edgeRouterRolesDisplay, this.edgeRouterNamedAttributesMap);
        this.mergeDisplayIntoMap(formData?.serviceRolesDisplay, this.serviceNamedAttributesMap);
    }

    private mergeDisplayIntoMap(displays: any, namedAttributesMap: any): void {
        if (!Array.isArray(displays)) {
            return;
        }
        displays.forEach((entry: any) => {
            const role = entry?.role;
            const id = typeof role === 'string' && role.charAt(0) === '@' ? role.slice(1) : undefined;
            if (!id) {
                return;
            }
            let displayName = entry?.name;
            if (!displayName || typeof displayName !== 'string') {
                return;
            }
            if (displayName.charAt(0) === '@') {
                displayName = displayName.slice(1);
            }
            if (!namedAttributesMap[displayName]) {
                namedAttributesMap[displayName] = id;
            }
        });
    }

    getEdgeRouterPolicyDataModel(formData, isUpdate) {
        const saveModel = new ServiceEdgeRouterPolicy();
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
