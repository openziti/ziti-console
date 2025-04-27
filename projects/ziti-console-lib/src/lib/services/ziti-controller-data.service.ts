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

import { Injectable, Inject } from '@angular/core';
import { Router } from "@angular/router";
import {LoggerService} from "../features/messaging/logger.service";
import {GrowlerService} from "../features/messaging/growler.service";
import {SETTINGS_SERVICE, SettingsService} from "./settings.service";
import {firstValueFrom, map, Observable} from "rxjs";
import {catchError} from "rxjs/operators";
import {HttpClient} from "@angular/common/http";
import {FilterObj} from "../features/data-table/data-table-filter.service";
import {ZitiDataService} from "./ziti-data.service";
import {isEmpty, isArray, isNumber, isBoolean} from "lodash";
import {Resolver} from "@stoplight/json-ref-resolver";
import moment from "moment";

@Injectable({
    providedIn: 'root'
})
export class ZitiControllerDataService extends ZitiDataService {

    constructor(override logger: LoggerService,
                override growler: GrowlerService,
                @Inject(SETTINGS_SERVICE) settingsService: SettingsService,
                override httpClient: HttpClient,
                override router: Router
    ) {
        super(logger, growler, settingsService, httpClient, router);
    }

    post(type, model, chained = false, contentType?, responseType?: string): Promise<any> {
        const apiVersions = this.settingsService.apiVersions || {};
        const prefix = apiVersions["edge-management"]?.v1?.path;
        const url = this.settingsService.settings.selectedEdgeController;
        const serviceUrl = url + prefix + "/" + type;
        let options = {};
        if (contentType) {
            const headers = {
                'Content-Type': contentType
            }
            options = { headers };
        }
        if (responseType) {
            options = {
                ...options,
                responseType,
            };
        }
        return firstValueFrom(this.httpClient.post(serviceUrl, model, options).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code !== "ECONNREFUSED") throw(err);
                    throw({error: error});
                }),
                map((result: any) => {
                    return result;
                })
            )
        );
    }

    put(type, model, id, chained = false): Promise<any> {
        const apiVersions = this.settingsService.apiVersions || {};
        const prefix = apiVersions["edge-management"]?.v1?.path || '/edge/management/v1';
        const url = this.settingsService.settings.selectedEdgeController;
        const serviceUrl = url + prefix + "/" + type + '/' + id;
        this.httpClient.patch(serviceUrl, model, {});

        return firstValueFrom(this.httpClient.put(serviceUrl, model, {}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code !== "ECONNREFUSED") throw(err);
                    throw({error: error});
                }),
                map((result: any) => {
                    return result;
                })
            )
        );
    }

    patch(type, model, id, chained = false): Promise<any> {
        const apiVersions = this.settingsService.apiVersions || {};
        const prefix = apiVersions["edge-management"]?.v1?.path || '/edge/management/v1';
        const url = this.settingsService.settings.selectedEdgeController;
        const serviceUrl = url + prefix + "/" + type + '/' + id;
        this.httpClient.patch(serviceUrl, model, {});

        return firstValueFrom(this.httpClient.patch(serviceUrl, model, {}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code !== "ECONNREFUSED") throw(err);
                    throw({error: error});
                }),
                map((result: any) => {
                    return result;
                })
            )
        );
    }

    get(type: string, paging: any, filters: FilterObj[] = [], url?, useClient?): Promise<any> {
        const apiVersions = this.settingsService.apiVersions || {};
        const managementUrl = apiVersions["edge-management"]?.v1?.path || '/edge/management/v1';
        const clientUrl = '/edge/client/v1';
        const prefix = useClient ? clientUrl : managementUrl;
        url = this.settingsService.settings.selectedEdgeController;
        const urlFilter = this.getUrlFilter(paging, filters);
        const serviceUrl = url + prefix + "/" + type + urlFilter;

        return firstValueFrom(this.httpClient.get(serviceUrl,{}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    return results;
                })
            )
        );
    }

    getSubdata(entityType: string, id: any, dataType: string, paging?: any, contentType?: any): Promise<any> {
        const apiVersions = this.settingsService.apiVersions || {};
        const prefix = apiVersions["edge-management"]?.v1?.path || '/edge/management/v1';

        let urlFilter = '';
        if (!isEmpty(paging)) {
            urlFilter = this.getUrlFilter(paging, []);
        }
        const url = this.settingsService.settings.selectedEdgeController + `${prefix}/${entityType}/${id}/${dataType}/${urlFilter}`;

        let options: any = {};
        if (contentType) {
            const headers = {
                'Accept': contentType,
                'Content-Type': contentType
            }
            options = { headers };
            if (contentType.indexOf('application/jwt') >= 0) {
                options.responseType = 'text';
            }
        }

        return firstValueFrom(this.httpClient.get(url, options).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                })
            )
        );
    }

    saveSubdata(entityType: string, id: any, dataType: string, params: any): Promise<any> {
        const apiVersions = this.settingsService.apiVersions || {};
        const prefix = apiVersions["edge-management"]?.v1?.path || '/edge/management/v1';
        const url = this.settingsService.settings.selectedEdgeController + `${prefix}/${entityType}/${id}/${dataType}`;

        return firstValueFrom(this.httpClient.post(url, params, {}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                })
            )
        );
    }

    deleteSubdata(entityType: string, id: any, dataType: string, params: any): Promise<any> {
        const apiVersions = this.settingsService.apiVersions || {};
        const prefix = apiVersions["edge-management"]?.v1?.path || '/edge/management/v1';
        const url = this.settingsService.settings.selectedEdgeController + `${prefix}/${entityType}/${id}/${dataType}`;

        return firstValueFrom(this.httpClient.delete(url, {body: params}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                })
            )
        );
    }

    override resetEnrollment(id: string, date: any): Promise<any> {
        const apiVersions = this.settingsService.apiVersions || {};
        const prefix = apiVersions["edge-management"]?.v1?.path || '/edge/management/v1';
        const url = this.settingsService.settings.selectedEdgeController + `${prefix}/authenticators/${id.trim()}/re-enroll`;
        const expiresAt = moment(date).utc().toISOString();
        const body = { expiresAt: expiresAt };
        return firstValueFrom(this.httpClient.post(url, body).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                })
            )
        );
    }

    override reissueEnrollment(id: string, date): Promise<any> {
        const apiVersions = this.settingsService.apiVersions || {};
        const prefix = apiVersions["edge-management"]?.v1?.path || '/edge/management/v1';
        const url = this.settingsService.settings.selectedEdgeController + `${prefix}/enrollments/${id}/refresh`;
        const expiresAt = moment(date).utc().toISOString();
        const body = { expiresAt: expiresAt };
        return firstValueFrom(this.httpClient.post(url, body).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                })
            )
        );
    }

    resetMFA(id) {
        const apiVersions = this.settingsService.apiVersions || {};
        const prefix = apiVersions["edge-management"]?.v1?.path || '/edge/management/v1';
        const url = this.settingsService.settings.selectedEdgeController + `${prefix}/identities/${id}/mfa`;
        return firstValueFrom(this.httpClient.delete(url).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                })
            )
        );
    }

    delete(type: string, id: string): Promise<any> {
        const apiVersions = this.settingsService.apiVersions || {};
        const prefix = apiVersions["edge-management"]?.v1?.path;
        const url = this.settingsService.settings.selectedEdgeController;
        const serviceUrl = url + prefix + "/" + type + '/' + id;

        return firstValueFrom(this.httpClient.delete(serviceUrl, {}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    return results;
                })
            )
        );
    }

    call(callUrl) {
        const apiVersions = this.settingsService.apiVersions || {};
        const prefix = apiVersions["edge-management"]?.v1?.path;
        const url = this.settingsService.settings.selectedEdgeController;
        const serviceUrl = url + prefix + "/" + callUrl;

        return firstValueFrom(this.httpClient.get(serviceUrl, {}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    return results;
                })
            )
        );
    }

    private getUrlFilter(paging, filters: any[]) {
        let urlFilter = '';
        let toSearchOn = "name";
        let noSearch = filters?.length <= 0;
        if (isEmpty(paging)) {
            paging = this.DEFAULT_PAGING;
        }
        if (paging && paging.sort != null) {
            if (paging.searchOn) toSearchOn = paging.searchOn;
            if (paging.noSearch) noSearch = true;
            if (!paging.filter) paging.filter = "";
            if (!isArray(paging.filter) && isNaN(paging.filter)) {
                paging.filter = paging.filter.split('#').join('');
            }
        }
        filters.forEach((filter, index) => {
            let filterVal = '';
            switch (filter.type) {
                case 'TEXTINPUT':
                    const verb = filter.verb ? filter.verb : 'contains';
                    filterVal = `${filter.columnId} ${verb} "${filter.value}"`;
                    break;
                case 'SELECT':
                case 'COMBO':
                    const val = (isNumber(filter.value) || isBoolean(filter.value)) ? `${filter.value}` : `"${filter.value}"`;
                    filterVal = `${filter.columnId} = ${val}`;
                    break;
                case 'DATETIME':
                    filterVal = `${filter.columnId} >= datetime(${filter.value[0]}) and ${filter.columnId} <= datetime(${filter.value[1]})`;
                    break;
                case 'ATTRIBUTE':
                    filterVal = this.getAttributeFilter(filter.value, filter.columnId);
                    break;
                case 'BOOLEAN':
                    filterVal = `${filter.columnId}=${filter.value}`;
                    break;
                default:
                    filterVal = `${filter.columnId} contains "${filter.value}"`;
                    break;
            }
            if (index <= 0) {
                urlFilter = `?filter= ${filterVal}`;
            } else {
                urlFilter += ` and ${filterVal}`
            }
        });
        if (noSearch) {
            if (paging.page !== -1) urlFilter = "?limit=" + paging.total + "&offset=" + ((paging.page - 1) * paging.total)  + "&sort=" + paging.sort + " " + paging.order;
        } else {
            urlFilter += `&limit=${paging.total}&offset=${((paging.page - 1) * paging.total)}&sort=${paging.sort}  ${paging.order}`
        }
        return urlFilter;
    }

    override schema(data): Promise<any> {
        return Promise.resolve(this.dereferenceJSONSchema(data));
    }

    async dereferenceJSONSchema(data: any) {
        const resolver = new Resolver();
        const schema = await resolver.resolve(data);
        return schema.result;
    }

    getAttributeFilter(val, columnId) {
        let filter = '';
        if (isArray(val)) {
            val.forEach((attr, index) => {
                if (index > 0) {
                    filter += ' or ';
                }
                filter += `anyOf(${columnId}) = "${attr}"`;
            });
        } else {
            filter = `anyOf(${columnId}) = "${val}"`;
        }
        return filter;
    }
}
