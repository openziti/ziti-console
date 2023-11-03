import {HttpClient} from "@angular/common/http";
import {Injectable, Inject} from "@angular/core";

import {isEmpty} from 'lodash';
import moment from 'moment';
import {SETTINGS_SERVICE, SettingsService} from "../../services/settings.service";
import {firstValueFrom} from "rxjs";
import {catchError} from "rxjs/operators";

@Injectable({
    providedIn: 'root'
})
export class IdentitiesService {

    private paging: any = {
        filter: "",
        noSearch: false,
        order: "ASC",
        page: 1,
        searchOn: "name",
        sort: "name",
        total: 100
    }

    constructor(
        private httpClient: HttpClient,
        @Inject(SETTINGS_SERVICE) private settingsService: SettingsService
    ) {
    }

    public getZitiIdentities(filter?) {
        if (filter) {
            this.paging.filter = filter.value;
            this.paging.searchOn = filter.columnId;
        }
        return this.getZitiEntities('identities', this.paging).then((results: any) => {
            if (!isEmpty(results?.data)) {
                results.data = results.data.map((row) => {
                    row.actionList = ['update', 'override', 'delete'];
                    if (row?.enrollment?.ott) {
                        if (row?.enrollment?.ott?.expiresAt) {
                            const difference = moment(row?.enrollment?.ott?.expiresAt).diff(moment(new Date()));
                            if (difference>0) {
                                row.actionList.push('download-enrollment');
                                row.actionList.push('qr-code');
                            }
                        } else {
                            row.actionList.push('download-enrollment');
                            row.actionList.push('qr-code');
                        }
                    } else if (row?.enrollment?.updb) {
                        if (row?.enrollment?.updb?.expiresAt!=null) {
                            const difference = moment(row?.enrollment?.updb?.expiresAt).diff(moment(new Date()));
                            if (difference > 0) {
                                row.actionList.push('download-enrollment');
                                row.actionList.push('qr-code');
                            }
                        } else {
                            row.actionList.push('download-enrollment');
                            row.actionList.push('qr-code');
                        }
                    }
                    return row;
                });
            }
            return results;
        });
    }

    getZitiEntities(type: string, paging: any) {
        const sessionId = this.settingsService.settings.session.id;
        const prefix = this.settingsService.apiVersions["edge-management"].v1.path;
        const url = this.settingsService.settings.selectedEdgeController;
        const urlFilter = this.getUrlFilter(paging);
        const serviceUrl = url + prefix + "/" + type + urlFilter;

        return firstValueFrom(this.httpClient.get(serviceUrl, {
                headers: {
                    "content-type": "application/json",
                    "zt-session": sessionId
                }
            })
            .pipe(
                catchError((err: any) => {
                    const error = "Server Not Accessible";
                    if (err.code != "ECONNREFUSED") throw({error: err.code});
                    throw({error: error});
                })
            )
        );
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
                if (paging.page !== -1) urlFilter = "?limit=" + paging.total + "&offset=" + ((paging.page - 1) * paging.total);
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
}
