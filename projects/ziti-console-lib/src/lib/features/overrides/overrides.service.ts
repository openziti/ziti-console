import {Inject, Injectable} from "@angular/core";
import {GrowlerModel} from "../messaging/growler.model";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../services/ziti-data.service";
import {GrowlerService} from "../messaging/growler.service";

@Injectable({
    providedIn: 'root'
})
export class OverridesService {

    overrides: any = [];

    constructor(
        @Inject(ZITI_DATA_SERVICE) private zitiDataService: ZitiDataService,
        private growlerService: GrowlerService
    ) {}

    loadOverrides(identity): Promise<any> {
        return this.zitiDataService.get(`identities/${identity.id}/service-configs`, {}, []).then((result) => {
            this.overrides = result.data;
            return this.overrides;
        });
    }

    loadServices(): Promise<any> {
        return this.zitiDataService.get(`services`, {}, []).then((result) => {
            return result.data;
        });
    }

    loadConfigs(): Promise<any> {
        return this.zitiDataService.get(`configs`, {}, []).then((result) => {
            return result.data;
        });
    }

    addOverride(identity, selectedServiceId, selectedConfigId): Promise<any> {
        if (this.overrideExists(selectedServiceId, selectedConfigId)) {
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Already Added`,
                `Overrides has already been added to this identity`,
            );
            this.growlerService.show(growlerData);
            return Promise.resolve();
        }
        const data = [{
            serviceId: selectedServiceId,
            configId: selectedConfigId
        }];
        return this.zitiDataService.saveSubdata('identities' , identity.id, 'service-configs', data).then(() => {
            const growlerData = new GrowlerModel(
                'success',
                'Success',
                `Override Added`,
                `Successfully added override to identity`,
            );
            this.growlerService.show(growlerData);
        }).catch((error) => {
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Override Failed`,
                `Failed to add override to identity`,
            );
            this.growlerService.show(growlerData);
        });
    }

    overrideExists(selectedServiceId, selectedConfigId) {
        let exists = false;
        this.overrides.forEach((override) => {
            if (override.serviceId === selectedServiceId && override.configId === selectedConfigId) {
                exists = true;
            }
        })
        return exists;
    }

    removeOverride(identity, override): Promise<any> {
        const data = [{
            serviceId: override.service.id,
            configId: override.config.id
        }];
        return this.zitiDataService.deleteSubdata('identities' , identity.id, 'service-configs', data).then(() => {
            const growlerData = new GrowlerModel(
                'success',
                'Success',
                `Override Removed`,
                `Successfully removed override from identity`,
            );
            this.growlerService.show(growlerData);
        }).catch((error) => {
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Removal Failed`,
                `Failed to remove override from identity`,
            );
            this.growlerService.show(growlerData);
        });
    }
}