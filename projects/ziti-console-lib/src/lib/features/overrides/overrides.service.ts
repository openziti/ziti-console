/*
    Copyright NetFoundry Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

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

    loadServices(filter): Promise<any> {
        const paging = {
            searchOn: 'name',
            filter: filter,
            total: 30,
            page: 1,
            sort: 'name',
            order: 'asc'
        };
        return this.zitiDataService.get(`services`, paging, []).then((result) => {
            return result;
        });
    }

    loadConfigs(filter): Promise<any> {
        const paging = {
            searchOn: 'name',
            filter: filter,
            total: 30,
            page: 1,
            sort: 'name',
            order: 'desc'
        };
        return this.zitiDataService.get(`configs`, paging, []).then((result) => {
            return result;
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
            return true;
        }).catch((error) => {
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Override Failed`,
                `Failed to add override to identity`,
            );
            this.growlerService.show(growlerData);
            return false;
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
