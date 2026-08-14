import {Injectable, Inject, InjectionToken} from "@angular/core";
import {isEmpty, unset, keys} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";
import {ExtensionService} from "../../extendable/extensions-noop.service";

import {sortBy, sortedUniq} from 'lodash';

import {ServicePolicy} from "../../../models/service-policy";

export const SERVICE_POLICY_EXTENSION_SERVICE = new InjectionToken<any>('SERVICE_POLICY_EXTENSION_SERVICE');

@Injectable({
    providedIn: 'root'
})
export class ServicePolicyFormService {

    associatedIdentities: any = [];
    associatedIdentityNames: any = [];
    associatedPostureChecks: any = [];
    associatedPostureCheckNames: any = [];
    associatedServices: any = [];
    associatedServiceNames: any = [];

    serviceNamedAttributesMap: any = {};
    identityNamedAttributesMap: any = {};
    postureNamedAttributesMap: any = {};

    identityNamedAttributes: any = [];
    serviceNamedAttributes: any = [];
    postureNamedAttributes: any = [];

    serviceRoleAttributes: any = [];
    identityRoleAttributes: any = [];
    postureRoleAttributes: any = [];

    constructor(
        @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        private growlerService: GrowlerService,
        @Inject(SERVICE_POLICY_EXTENSION_SERVICE)private extService: ExtensionService
    ) {}

    save(formData): Promise<any> {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getServicePolicyDataModel(formData, isUpdate);
        const svc = isUpdate ? this.zitiService.patch.bind(this.zitiService) : this.zitiService.post.bind(this.zitiService);
        return svc('service-policies', data, formData.id).then(async (result: any) => {
            const id = result?.data?.id || formData.id;
            let router = await this.zitiService.getSubdata('service-policies', id, '').then((routerData) => {
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
                    `Service Policy ${isUpdate ? 'Updated' : 'Created'}`,
                    `Successfully ${isUpdate ? 'updated' : 'created'} Service Policy: ${formData.name}`,
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
                `Error ${isUpdate ? 'Updating' : 'Creating'} Service Policy`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw resp;
        })
    }

    getAssociatedServicesByRole(id) {
        this.zitiService.getSubdata('service-policies', id, 'services',this.zitiService.DEFAULT_PAGING).then((result: any) => {
            this.associatedServices = result.data;
            this.associatedServiceNames = this.associatedServices.map((svc) => {
                return svc.name;
            });
        });
    }

    getAssociatedIdentitiesById(id) {
        return this.zitiService.getSubdata('service-policies', id, 'identities',this.zitiService.DEFAULT_PAGING).then((result: any) => {
            this.associatedIdentities = result.data;
            this.associatedIdentityNames = this.associatedIdentities.map((ident) => {
                return ident.name;
            });
        });
    }

    getAssociatedPostureChecksById(id) {
        this.zitiService.getSubdata('service-policies', id, 'posture-checks').then((result: any) => {
            this.associatedPostureChecks = result.data;
            this.associatedPostureCheckNames = this.associatedPostureChecks.map((postureCheck) => {
                return postureCheck.name;
            });
        });
    }

    getAssociatedServicesByAttribute(roleAttributes, namedAttributes, semantic = 'AnyOf') {
        this.associatedServiceNames = [];
        if (isEmpty(roleAttributes)) {
            this.associatedServiceNames = [...namedAttributes];
            return Promise.resolve([]);
        }
        const filters = this.zitiService.getRoleFilter(roleAttributes, semantic);
        const paging = this.zitiService.DEFAULT_PAGING;
        paging.noSearch = false;
        return this.zitiService.get('services', paging, filters).then((result: any) => {
            this.associatedServices = result.data;
            this.associatedServiceNames = this.associatedServices.map((svc) => {
                return svc.name;
            });
            this.associatedServiceNames = [...this.associatedServiceNames, ...namedAttributes];
            this.associatedServiceNames = sortBy(this.associatedServiceNames);
            this.associatedServiceNames = sortedUniq(this.associatedServiceNames);
            this.associatedServiceNames = this.associatedServiceNames.filter(item => item !== undefined);
            return this.associatedServices;
        });
    }

    getAssociatedIdentitiesByAttribute(roleAttributes, namedAttributes, semantic = 'AnyOf') {
        this.associatedIdentityNames = [];
        if (isEmpty(roleAttributes)) {
            this.associatedIdentityNames = [...namedAttributes];
            return;
        }
        const filters = this.zitiService.getRoleFilter(roleAttributes, semantic);
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
            this.associatedIdentityNames = this.associatedIdentityNames.filter(item => item !== undefined);
        });
    }

    getAssociatedPostureChecksByAttribute(roleAttributes, namedAttributes, semantic = 'AnyOf') {
        this.associatedPostureCheckNames = [];
        if (isEmpty(roleAttributes)) {
            this.associatedPostureCheckNames = [...namedAttributes];
            return;
        }
        const filters = this.zitiService.getRoleFilter(roleAttributes, semantic);
        const paging = this.zitiService.DEFAULT_PAGING;
        paging.noSearch = false;
        this.zitiService.get('posture-checks', paging, filters).then((result: any) => {
            this.associatedPostureChecks = result.data;
            this.associatedPostureCheckNames = this.associatedPostureChecks.map((postureCheck) => {
                return postureCheck.name;
            });
            this.associatedPostureCheckNames = [...this.associatedPostureCheckNames, ...namedAttributes];
            this.associatedPostureCheckNames = sortedUniq(this.associatedPostureCheckNames);
        });
    }

    getServicePolicyDataModel(formData, isUpdate) {
        const saveModel = new ServicePolicy();
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

    public getServiceRoleAttributes() {
        return this.zitiService.get('service-role-attributes', {}, []).then((result) => {
            this.serviceRoleAttributes = result.data;
            return result;
        });
    }

    private identityNamedAttributesRequestId = 0;

    public getIdentityNamedAttributes(filter?: string) {
        const requestId = ++this.identityNamedAttributesRequestId;
        const paging = {searchOn: 'name', filter: filter || '', total: 100, page: 1, sort: 'name', order: 'asc'};
        const filters = [];
        if (!isEmpty(filter)) {
            filters.push({filterName: 'name', columnId: 'name', value: filter || '%', label: '', type: 'TEXTINPUT'});
        }
        return this.zitiService.get('identities', paging, filters).then((result) => {
            if (requestId !== this.identityNamedAttributesRequestId) {
                return this.identityNamedAttributes;
            }
            const namedAttributes = result.data.map((identity) => {
                this.identityNamedAttributesMap[identity.name] = identity.id;
                return identity.name;
            });
            this.identityNamedAttributes = namedAttributes;
            return namedAttributes;
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

    public getIdentityRoleAttributes() {
        return this.zitiService.get('identity-role-attributes', {}, []).then((result) => {
            this.identityRoleAttributes = result.data;
            return result;
        });
    }

    private postureNamedAttributesRequestId = 0;

    public getPostureNamedAttributes(filter?: string) {
        const requestId = ++this.postureNamedAttributesRequestId;
        const paging = {searchOn: 'name', filter: filter || '', total: 100, page: 1, sort: 'name', order: 'asc'};
        const filters = [];
        if (!isEmpty(filter)) {
            filters.push({filterName: 'name', columnId: 'name', value: filter || '%', label: '', type: 'TEXTINPUT'});
        }
        return this.zitiService.get('posture-checks', paging, filters).then((result) => {
            if (requestId !== this.postureNamedAttributesRequestId) {
                return this.postureNamedAttributes;
            }
            const namedAttributes = result.data.map((postureCheck) => {
                this.postureNamedAttributesMap[postureCheck.name] = postureCheck.id;
                return postureCheck.name;
            });
            this.postureNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

    /**
     * The policy response includes serviceRolesDisplay/identityRolesDisplay/postureCheckRolesDisplay
     * alongside the raw #role/@id arrays, resolving every referenced name for free (no extra
     * request) even when that entity falls outside the paged named-attribute fetch above.
     */
    public mergeRolesDisplayIntoMaps(formData: any): void {
        this.mergeDisplayIntoMap(formData?.serviceRolesDisplay, this.serviceNamedAttributesMap);
        this.mergeDisplayIntoMap(formData?.identityRolesDisplay, this.identityNamedAttributesMap);
        this.mergeDisplayIntoMap(formData?.postureCheckRolesDisplay, this.postureNamedAttributesMap);
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

}
