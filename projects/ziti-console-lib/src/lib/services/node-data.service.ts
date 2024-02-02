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
import {HttpClient} from "@angular/common/http";
import {FilterObj} from "../features/data-table/data-table-filter.service";
import {isEmpty, get} from "lodash";
import {ZitiDataService} from "./ziti-data.service";
import {Resolver} from "@stoplight/json-ref-resolver";
import moment from "moment";

@Injectable({
    providedIn: 'root'
})
export class NodeDataService extends ZitiDataService {

    DEFAULT_PAGING: any = {
        filter: "",
        noSearch: true,
        order: "asc",
        page: 1,
        searchOn: "name",
        sort: "name",
        total: 100
    }

    constructor(override logger: LoggerService,
                override growler: GrowlerService,
                @Inject(SETTINGS_SERVICE) override settingsService: SettingsService,
                override httpClient: HttpClient,
                override router: Router
    ) {
        super(logger, growler, settingsService, httpClient, router)
    }

    post(type, model) {
        let clientSub;
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/dataSave';
        const body = {paging: this.DEFAULT_PAGING, type: type, save: model};

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

    patch(type, model, id) {
        let clientSub;
        const nodeServerURL = window.location.origin;
        const serviceUrl = nodeServerURL + '/api/dataSave';
        const body = {paging: this.DEFAULT_PAGING, type: type, save: model, id: id};

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
        const body = {paging: paging, type: type, url: url};

        return firstValueFrom(this.httpClient.post(serviceUrl,body,{}).pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                }),
                map((results: any) => {
                    if(filters.length > 0) {
                        filters.forEach((filter:FilterObj) => {
                            let newData: any[] = [];
                            if(filter.columnId !== 'name' && !isEmpty(filter.value )) {
                                results.data.forEach(row => {
                                    if(get(row, filter.columnId)?.indexOf(filter.value) >= 0)
                                        newData.push(row);
                                })
                                results.data = newData;
                            }
                        });
                    } else if (results.error) {
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

    private getUrlFilter(paging: any) {
        let urlFilter = '';
        let toSearchOn = "name";
        let noSearch = false;
        if (paging && paging.sort != null) {
            if (paging.searchOn) toSearchOn = paging.searchOn;
            if (paging.noSearch) noSearch = true;
            if (!paging.filter) paging.filter = "";
            paging.filter = paging.filter.split('#').join('');
            if (noSearch) {
                if (paging.page !== -1) urlFilter = "?limit=" + paging.total + "&offset=" + ((paging.page - 1) * paging.total)  + "&sort=" + paging.sort + " " + paging.order;
            } else {
                if (paging.page !== -1) urlFilter = "?filter=(" + toSearchOn + " contains \"" + paging.filter + "\")&limit=" + paging.total + "&offset=" + ((paging.page - 1) * paging.total) + "&sort=" + paging.sort + " " + paging.order;
                if (paging.params) {
                    for (const key in paging.params) {
                        urlFilter += ((urlFilter.length === 0) ? "?" : "&") + key + "=" + paging.params[key];
                    }
                }
            }
        }
        return urlFilter;
    }

    handleError(results) {
        if (results?.errorObj?.code === 'UNAUTHORIZED') {
            localStorage.removeItem('ziti.settings');
            window.location.href = '/login';
        } else {
            this.logger.error(results?.error)
        }
    }
}
