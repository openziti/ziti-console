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

import {Inject, Injectable} from '@angular/core';
import { Router } from "@angular/router";
import {LoggerService} from "../features/messaging/logger.service";
import {GrowlerService} from "../features/messaging/growler.service";
import {SETTINGS_SERVICE, SettingsService} from "./settings.service";
import {firstValueFrom, map} from "rxjs";
import {catchError} from "rxjs/operators";
import { HttpClient } from "@angular/common/http";
import {FilterObj} from "../features/data-table/data-table-filter.service";
import {isEmpty, get, isArray, isNumber, set, isBoolean} from "lodash";
import {ZitiDataService} from "./ziti-data.service";
import {Resolver} from "@stoplight/json-ref-resolver";
import moment from "moment";

@Injectable({
    providedIn: 'root'
})
export class NodeDataService extends ZitiDataService {

    override dataServiceType = ZitiDataService.NODE_DATA_SERVICE_TYPE;

    constructor(override logger: LoggerService,
                override growler: GrowlerService,
                @Inject(SETTINGS_SERVICE) override settingsService: SettingsService,
                override httpClient: HttpClient,
                override router: Router
    ) {
        super(logger, growler, settingsService, httpClient, router)
    }

    post(type, model, chained = false) {
        let clientSub;
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/dataSave';
        const body = {paging: this.DEFAULT_PAGING, type: type, save: model, chained: chained};

        return firstValueFrom(this.httpClient.post(serviceUrl,body,{}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code !== "ECONNREFUSED") throw(err);
                    throw({error: error});
                }),
                map((results: any) => {
                    if(!isEmpty(results.error)) {
                        throw({error: results.error});
                    }
                    return results;
                })
            )
        );
    }

    put(type, model, id, chained = false) {
        let clientSub;
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/dataSave';
        const body = {paging: this.DEFAULT_PAGING, type: type, save: model, id: id, chained: chained};

        return firstValueFrom(this.httpClient.post(serviceUrl,body,{}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code !== "ECONNREFUSED") throw(err);
                    throw({error: error});
                }),
                map((results: any) => {
                    if(!isEmpty(results.error)) {
                        throw({error: results.error});
                    }
                    return results;
                })
            )
        );
    }

    patch(type, model, id, chained = false) {
        let clientSub;
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/dataSave';
        const body = {paging: this.DEFAULT_PAGING, type: type, save: model, id: id, chained: chained};

        return firstValueFrom(this.httpClient.post(serviceUrl,body,{}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code !== "ECONNREFUSED") throw(err);
                    throw({error: error});
                }),
                map((results: any) => {
                    if(!isEmpty(results.error)) {
                        throw({error: results.error});
                    }
                    return results;
                })
            )
        );
    }

    get(type: string, paging: any, filters: FilterObj[] = [], url?) {
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/data';
        const urlFilter = this.getUrlFilter(paging, filters);
        paging.filter = urlFilter;
        const body = {paging: paging, type: type, url: url};

        return firstValueFrom(this.httpClient.post(serviceUrl,body,{}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    if (results.error) {
                        this.handleError(results)
                    }
                    return results;
                })
            )
        );
    }

    getSubdata(entityType: string, id: any, dataType: string) {
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/subdata';
        const body = {url:`./${entityType}/${id}/${dataType}`, name: entityType, type: dataType };
        return firstValueFrom(this.httpClient.post(serviceUrl, body, {}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    if(!isEmpty(results.error)) {
                        throw({error: results.error});
                    } else if (results.error) {
                        this.handleError(results)
                    }
                    if (results && !results?.data) {
                        results.data = {};
                    }
                    return results;
                })
            )
        );
    }

    override saveSubdata(entityType: string, id: any, dataType: string, data: any): Promise<any> {
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/subSave';
        const body = {
            type: dataType,
            parentType: entityType,
            id: id,
            doing: "POST",
            save: data
        }
        return firstValueFrom(this.httpClient.post(serviceUrl, body, {}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    if(!isEmpty(results.error)) {
                        throw({error: results.error});
                    }
                    return results;
                })
            )
        );
    }

    override resetEnrollment(id: string, date: any): Promise<any> {
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/resetEnroll';
        const dateStr = moment(date).format("M/D/YYYY hh:mm A");
        const body = {
            date: dateStr,
            id: id
        }
        return firstValueFrom(this.httpClient.post(serviceUrl, body, {}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    if(!isEmpty(results.error)) {
                        throw({error: results.error});
                    }
                    return results;
                })
            )
        );
    }

    override reissueEnrollment(id: string, date: string): Promise<any> {
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/reissueEnroll';
        const dateStr = moment(date).format("M/D/YYYY hh:mm A");
        const body = {
            date: dateStr,
            id: id
        }
        return firstValueFrom(this.httpClient.post(serviceUrl, body, {}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    if(!isEmpty(results.error)) {
                        throw({error: results.error});
                    }
                    return results;
                })
            )
        );
    }

    resetMFA(id) {
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/mfa';
        const options = {
            body: {
                id: id
            }
        };
        return firstValueFrom(this.httpClient.delete(serviceUrl, options).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    if(!isEmpty(results.error)) {
                        throw({error: results.error});
                    }
                    return results;
                })
            )
        );
    }

    resetPassword(oldPass, newPass, confirmPass) {
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/reset';
        const options = {
            body: {
                password: oldPass,
                newpassword: newPass,
                confirm: confirmPass
            }
        };
        return firstValueFrom(this.httpClient.delete(serviceUrl, options).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    if(!isEmpty(results.error)) {
                        throw({error: results.error});
                    }
                    return results;
                })
            )
        );
    }

    override deleteSubdata(entityType: string, id: any, dataType: string, data: any): Promise<any> {
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/subSave';
        const body = {
            type: dataType,
            parentType: entityType,
            id: id,
            doing: "DELETE",
            save: data
        }
        return firstValueFrom(this.httpClient.post(serviceUrl, body, {}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    if(!isEmpty(results.error)) {
                        throw({error: results.error});
                    }
                    return results;
                })
            )
        );
    }

    delete(type: string, id: string) {
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/delete';
        const body = {paging: this.DEFAULT_PAGING, type: type, ids: [id]};

        return firstValueFrom(this.httpClient.post(serviceUrl,body,{}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    if(!isEmpty(results.error)) {
                        throw({error: results.error});
                    }
                    return results;
                })
            )
        );
    }

    call(url) {
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/call';
        const body = {url: url};

        return firstValueFrom(this.httpClient.post(serviceUrl,body,{}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    if(!isEmpty(results.error)) {
                        throw({error: results.error});
                    }
                    return results;
                })
            )
        );
    }

    schema(data: any): Promise<any> {
        const resolver = new Resolver();
        return resolver.resolve(data).then((schema) => {
            return schema.result
        });
    }

    private getUrlFilter(paging, filters: any[]) {
        let urlFilter = '';
        let toSearchOn = "name";
        let noSearch = filters?.length <= 0;
        if (isEmpty(paging)) {
            paging = {};
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
                    if (filter.rawFilter) {
                        paging.rawFilter = true;
                    }
                    break;
                case 'SELECT':
                case 'COMBO':
                    const val = isNumber(filter.value) || isBoolean(filter.value) ? `${filter.value}` : `"${filter.value}"`;
                    filterVal = `${filter.columnId} = ${val}`;
                    break;
                case 'DATETIME':
                    paging.rawFilter = true;
                    filterVal = `${filter.columnId} >= datetime(${filter.value[0]}) and ${filter.columnId} <= datetime(${filter.value[1]})`;
                    break;
                case 'ATTRIBUTE':
                    paging.rawFilter = true;
                    filterVal = this.getAttributeFilter(filter.value, filter.columnId);
                    break;
                default:
                    filterVal = `${filter.columnId} contains "${filter.value}"`;
                    break;
            }
            if (index <= 0) {
                urlFilter = `${filterVal}`;
            } else {
                urlFilter += ` and ${filterVal}`
            }
        });

        return urlFilter;
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

    handleError(results) {
        this.logger.error(results?.error)
    }
}
