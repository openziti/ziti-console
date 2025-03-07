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

import {Injectable, Inject, InjectionToken} from "@angular/core";
import moment from 'moment';

import {isEmpty, unset, keys} from 'lodash';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../../services/ziti-data.service";
import {GrowlerService} from "../../messaging/growler.service";
import {GrowlerModel} from "../../messaging/growler.model";
import {Identity} from "../../../models/identity";
import {SETTINGS_SERVICE, SettingsService} from "../../../services/settings.service";


export const IDENTITY_EXTENSION_SERVICE = new InjectionToken<any>('IDENTITY_EXTENSION_SERVICE');


@Injectable({
    providedIn: 'root'
})
export class IdentityFormService {

    constructor(
        @Inject(SETTINGS_SERVICE) public settingsService: SettingsService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        private growlerService: GrowlerService
    ) {}
 
    save(formData) {
        const isUpdate = !isEmpty(formData.id);
        const data: any = this.getIdentityDataModel(formData, isUpdate);
        const svc = isUpdate ? this.zitiService.patch.bind(this.zitiService) : this.zitiService.post.bind(this.zitiService);
        return svc('identities', data, formData.id).then((result) => {
            const growlerData = new GrowlerModel(
                'success',
                'Success',
                `Identity ${isUpdate ? 'Updated' : 'Created'}`,
                `Successfully ${isUpdate ? 'updated' : 'created'} Identity: ${formData.name}`,
            );
            this.growlerService.show(growlerData);
        }).catch((resp) => {
            const errorMessage = this.zitiService.getErrorMessage(resp);
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Error ${isUpdate ? 'Updating' : 'Creating'} Identity`,
                errorMessage,
            );
            this.growlerService.show(growlerData);
            throw resp;
        })
    }

    getIdentityDataModel(formData, isUpdate) {
        const saveModel = new Identity();
        const modelProperties = keys(saveModel);
        modelProperties.forEach((prop) => {
            switch(prop) {
                case 'type':
                    if(isUpdate) {
                        saveModel[prop] = formData[prop].id;
                    } else {
                        saveModel[prop] = formData[prop];
                    }
                    break;
                case 'enrollment':
                    if(isUpdate) {
                        unset(saveModel, 'enrollment');
                    } else {
                        saveModel[prop] = formData[prop];
                    }
                    break;
                default:
                    saveModel[prop] = formData[prop];
            }
        });
        return saveModel;
    }

    testService(identityId, serviceId) {
        const url = `/identities/${identityId}/policy-advice/${serviceId}`;
        return this.zitiService.call(url).then((result) => {
            var errors = [];
            var info = result.data;
            if (!info?.isDialAllowed&&!info?.isBindAllowed) errors.push("No access to service. Adjust service policies.");
            if (info?.identityRouterCount<1) errors.push("Identity has no edge routers assigned. Adjust edge router policies.");
            if (info?.serviceRouterCount<1) errors.push("Service has no edge routers assigned. Adjust edge router policies.");
            if (info?.identityRouterCount>0&&info?.serviceRouterCount>0) {
                if (info?.commonCount<1) errors.push("Identity and services have no edge routers in common. Adjust edge router policies and/or service edge router policies.");
                else if (info?.onlineCount<1) errors.push("Common edge routers are all off-line. Bring routers back on-line or adjust edge router policies and/or service edge router policies.");
            }
            var status = "";
            if (info?.isDialAllowed) {
                if (info?.isBindAllowed) status = "(Dial,Bind)";
                else status = "(Dial)";
            } else {
                if (info?.isBindAllowed) status = "(Bind)";
            }
            if (errors.length>0) {
                for (var i=0; i<errors.length; i++) {
                    status += "<br/>"+errors[i];
                }
            } else status += "<br/>Everything is configured properly";
            return status;
        });
    }

    refreshIdentity(id) {
        const url: any = `/identities/${id}`
        return this.zitiService.call(url);
    }
}
