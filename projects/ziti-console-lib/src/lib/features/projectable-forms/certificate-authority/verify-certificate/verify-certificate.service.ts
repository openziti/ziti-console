import {Injectable, Inject} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../../services/ziti-data.service";
import {GrowlerModel} from "../../../messaging/growler.model";
import {GrowlerService} from "../../../messaging/growler.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../../extendable/extensions-noop.service";
import {ValidationService} from "../../../../services/validation.service";
import {CertificateAuthority} from "../../../../models/certificate-authority";

@Injectable({
    providedIn: 'root'
})
export class VerifyCertificateService {

    items: any[] = [];
    errors: any[] = [];
    saveDisabled = false;

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

    save(formData, cert) {
        return this.dataService.post(`cas/${formData.id}/verify`, cert, true, 'text/plain').then(async (result: any) => {
            const growlerData = new GrowlerModel(
                'success',
                'Success',
                `Certificate Verified`,
                `Successfully verified certificate for this certificate authority`,
            );
            this.growlerService.show(growlerData);
        }).catch((resp) => {
            const errorMessage = this.dataService.getErrorMessage(resp);
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Error Verifying Certificate`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw errorMessage;
        })
    }
}
