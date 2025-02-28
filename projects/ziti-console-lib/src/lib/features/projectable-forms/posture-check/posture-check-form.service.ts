import {Injectable, Inject} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {Resolver} from "@stoplight/json-ref-resolver";
import {SchemaService} from "../../../services/schema.service";
import {defer, isBoolean, isEmpty, isNil, keys} from "lodash";
import {GrowlerModel} from "../../messaging/growler.model";
import {GrowlerService} from "../../messaging/growler.service";
import {ConfigType} from "../../../models/config-type";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../extendable/extensions-noop.service";
import {ValidationService} from "../../../services/validation.service";
import {PostureCheck} from "../../../models/posture-check";

@Injectable({
    providedIn: 'root'
})
export class PostureCheckFormService {

    items: any[] = [];
    errors: any[] = [];
    saveDisabled = false;

    constructor(
        @Inject(ZITI_DATA_SERVICE) private dataService: ZitiDataService,
        @Inject(SHAREDZ_EXTENSION)private extService: ExtensionService,
        private schemaSvc: SchemaService,
        private growlerService: GrowlerService,
        private validationService: ValidationService
    ) {
    }

    save(formData) {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getConfigTypeDataModel(formData, isUpdate);
        let prom;
        if (isUpdate) {
            prom = this.dataService.patch('posture-checks', data, formData.id, true);
        } else {
            prom = this.dataService.post('posture-checks', data, true);
        }

        return prom.then(async (result: any) => {
            const id = isUpdate ? formData.id : (result?.data?.id || result?.id);
            let config = await this.dataService.getSubdata('posture-checks', id, '').then((svcData) => {
                return svcData.data;
            });
            return this.extService.formDataSaved(config).then((formSavedResult: any) => {
                if (!formSavedResult) {
                    return config;
                }
                const growlerData = new GrowlerModel(
                    'success',
                    'Success',
                    `Posture Check ${isUpdate ? 'Updated' : 'Created'}`,
                    `Successfully ${isUpdate ? 'updated' : 'created'} Posture Check: ${formData.name}`,
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
                `Error ${isUpdate ? 'Updating' : 'Creating'} Posture Check`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw resp;
        })
    }

    getConfigTypeDataModel(formData, isUpdate) {
        const saveModel = new PostureCheck();
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
