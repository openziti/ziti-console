import {Injectable, Inject} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {cloneDeep, defer, invert, isBoolean, isEmpty, isNil, keys} from "lodash";
import {GrowlerModel} from "../../messaging/growler.model";
import {GrowlerService} from "../../messaging/growler.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";
import {ValidationService} from "../../../services/validation.service";
import {AuthPolicy} from "../../../models/auth-policy";

@Injectable({
    providedIn: 'root'
})
export class AuthPolicyFormService {

    items: any[] = [];
    errors: any[] = [];
    saveDisabled = false;

    jwtSigners = [];
    jwtSignerNamedAttributes = [];
    jwtSignerNamedAttributesMap = {};
    jwtSignersLoading = false;

    selectedSecondaryJwtSigner;
    filteredJwtSigners;

    paging = {
        filter: "",
        noSearch: true,
        order: "asc",
        page: 1,
        searchOn: "name",
        sort: "name",
        total: 100
    }

    constructor(
        @Inject(ZITI_DATA_SERVICE) private dataService: ZitiDataService,
        @Inject(SHAREDZ_EXTENSION)private extService: ExtensionService,
        private growlerService: GrowlerService,
        private validationService: ValidationService
    ) {
    }

    public getJwtSignerNamedAttributes() {
        return this.dataService.get('external-jwt-signers', {rawFilter: true, filter: '', sort: 'name', order: 'asc', total: -1, page: 1}, []).then((result) => {
            const namedAttributes = result.data.map((identity) => {
                this.jwtSignerNamedAttributesMap[identity.name] = identity.id;
                return identity.name;
            });
            this.jwtSignerNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

    getJwtSigners(filters = [], page = 1) {
        this.jwtSignersLoading = true;
        const paging = cloneDeep(this.paging);
        if (filters.length > 0) {
            paging.noSearch = false;
        }
        return this.dataService.get('external-jwt-signers', paging, filters).then((result: any) => {
            this.jwtSigners = result.data;
        }).finally(() => {
            this.jwtSignersLoading = false;
        });
    }

    save(formData) {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getAuthPolicyDataModel(formData, isUpdate);
        let prom;
        if (isUpdate) {
            prom = this.dataService.put('auth-policies', data, formData.id, true);
        } else {
            prom = this.dataService.post('auth-policies', data, true);
        }

        return prom.then(async (result: any) => {
            const id = isUpdate ? formData.id : (result?.data?.id || result?.id);
            let config = await this.dataService.getSubdata('auth-policies', id, '').then((svcData) => {
                return svcData.data;
            });
            return this.extService.formDataSaved(config).then((formSavedResult: any) => {
                if (!formSavedResult) {
                    return config;
                }
                const growlerData = new GrowlerModel(
                    'success',
                    'Success',
                    `Auth Policy ${isUpdate ? 'Updated' : 'Created'}`,
                    `Successfully ${isUpdate ? 'updated' : 'created'} Auth Policy: ${formData.name}`,
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
                `Error ${isUpdate ? 'Updating' : 'Creating'} Auth Policy`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw resp;
        })
    }

    getAuthPolicyDataModel(formData, isUpdate) {
        const saveModel = new AuthPolicy();
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
