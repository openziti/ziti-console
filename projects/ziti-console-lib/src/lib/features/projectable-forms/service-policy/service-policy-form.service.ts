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
        this.zitiService.getSubdata('service-policies', id, 'services').then((result: any) => {
            this.associatedServices = result.data;
            this.associatedServiceNames = this.associatedServices.map((svc) => {
                return svc.name;
            });
        });
    }

    getAssociatedIdentitiesById(id) {
        this.zitiService.getSubdata('service-policies', id, 'identities').then((result: any) => {
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

    getAssociatedServicesByAttribute(roleAttributes, namedAttributes) {
        this.associatedServiceNames = [];
        if (isEmpty(roleAttributes)) {
            this.associatedServiceNames = [...namedAttributes];
            return Promise.resolve([]);
        }
        const filters = this.zitiService.getRoleFilter(roleAttributes);
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
            return this.associatedServices;
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

    getAssociatedPostureChecksByAttribute(roleAttributes, namedAttributes) {
        this.associatedPostureCheckNames = [];
        if (isEmpty(roleAttributes)) {
            this.associatedPostureCheckNames = [...namedAttributes];
            return;
        }
        const filters = this.zitiService.getRoleFilter(roleAttributes);
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

    public getIdentityNamedAttributes() {
        return this.zitiService.get('identities', {rawFilter: true, filter: '', sort: 'name', order: 'asc', total: -1, page: 1}, []).then((result) => {
            const namedAttributes = result.data.map((identity) => {
                this.identityNamedAttributesMap[identity.name] = identity.id;
                return identity.name;
            });
            this.identityNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

    public getServiceNamedAttributes() {
        return this.zitiService.get('services', {rawFilter: true, filter: '', sort: 'name', order: 'asc', total: -1, page: 1}, []).then((result) => {
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

    public getPostureNamedAttributes() {
        return this.zitiService.get('posture-checks', {}, []).then((result) => {
            const namedAttributes = result.data.map((postureCheck) => {
                this.postureNamedAttributesMap[postureCheck.name] = postureCheck.id;
                return postureCheck.name;
            });
            this.postureNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }
}
