import {Injectable, Inject} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {cloneDeep, defer, invert, isBoolean, isEmpty, isNil, keys} from "lodash";
import {GrowlerModel} from "../../messaging/growler.model";
import {GrowlerService} from "../../messaging/growler.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";
import {ValidationService} from "../../../services/validation.service";
import {AuthPolicy} from "../../../models/auth-policy";
import {CertificateAuthority} from "../../../models/certificate-authority";

@Injectable({
    providedIn: 'root'
})
export class CertificateAuthorityFormService {

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

    save(formData) {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getAuthPolicyDataModel(formData, isUpdate);
        let prom;
        if (isUpdate) {
            prom = this.dataService.put('cas', data, formData.id, true);
        } else {
            prom = this.dataService.post('cas', data, true);
        }

        return prom.then(async (result: any) => {
            const id = isUpdate ? formData.id : (result?.data?.id || result?.id);
            let config = await this.dataService.getSubdata('cas', id, '').then((svcData) => {
                return svcData.data;
            });
            return this.extService.formDataSaved(config).then((formSavedResult: any) => {
                if (!formSavedResult) {
                    return config;
                }
                const growlerData = new GrowlerModel(
                    'success',
                    'Success',
                    `Certificate Authority ${isUpdate ? 'Updated' : 'Created'}`,
                    `Successfully ${isUpdate ? 'updated' : 'created'} Certificate Authority: ${formData.name}`,
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
                `Error Creating Certificate Authority`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw resp;
        })
    }

    getIdentityRoleAttributes() {
        return this.dataService.get('identity-role-attributes', {}, []);
    }

    getAuthPolicyDataModel(formData, isUpdate) {
        const saveModel = new CertificateAuthority();
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
