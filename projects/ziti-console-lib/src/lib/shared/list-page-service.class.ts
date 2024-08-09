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

import {Component, Inject, inject, OnInit} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../services/ziti-data.service";
import {DataTableFilterService, FilterObj} from "../features/data-table/data-table-filter.service";
import {ValidatorCallback} from "../features/list-page-features/list-page-form/list-page-form.component";
import {DialogRef} from "@angular/cdk/dialog";
import {MatDialog} from "@angular/material/dialog";
import {ConfirmComponent} from "../features/confirm/confirm.component";
import {SETTINGS_SERVICE, SettingsService} from "../services/settings.service";

import {isEmpty} from "lodash";
import {CsvDownloadService} from "../services/csv-download.service";
import {SettingsServiceClass} from "../services/settings-service.class";
import {ExtensionService, SHAREDZ_EXTENSION} from "../features/extendable/extensions-noop.service";
import moment from "moment/moment";
import {NavigationEnd, Router} from "@angular/router";

export abstract class ListPageServiceClass {

    abstract initTableColumns(): any[];
    abstract getData(filters?: FilterObj[], sort?: any, page?: any): Promise<any[]>;
    abstract validate: ValidatorCallback;
    abstract openUpdate(entity?: any);
    abstract resourceType: string;

    basePath: string = '';

    headerComponentParams = {
        filterType: 'TEXTINPUT',
        enableSorting: true
    };

    DEFAULT_PAGING: any = {
        filter: "",
        noSearch: false,
        order: "asc",
        page: 1,
        searchOn: "name",
        sort: "name",
        total: 50
    }
    totalCount = 0;
    dataService: ZitiDataService;
    refreshData: (sort?: {sortBy: string, ordering: string}) => void | undefined;

    selectedEntityId: String;
    menuItems: any = [];
    tableHeaderActions: any = [];
    currentSettings: any = {};
    dialogRef: any;
    sideModalOpen = false;
    currentSort = {
        sortBy: 'name',
        ordering: 'asc'
    };

    nameColumnRenderer = (row) => {
        return `<div class="col cell-name-renderer" data-id="${row?.data?.id}">
                    <strong>${row?.data?.name}</strong>
                </div>`
    }

    rolesRenderer = (row) => {
        const colId = row.column.colId;
        let roles = '';
        if (row?.data?.[colId + 'Display']) {
            row?.data?.[colId + 'Display'].forEach((attr) => {
                const className = attr?.name?.indexOf('@') === 0 ? 'attag' : 'hashtag';
                roles += `<div>
                            <div class="${className}">${attr.name}</div>
                            <div class="tag-name">${attr.name}</div>
                          </div>`;
            });
        } else {
            row?.data?.[colId]?.forEach((attr) => {
                const className = attr.indexOf('@') === 0 ? 'attag' : 'hashtag';
                roles += `<div>
                            <div class="${className}">${attr}</div>
                            <div class="tag-name">${attr}</div>
                          </div>`;
            });
        }
        return roles;
    }

    createdAtFormatter = (row) => {
        return moment(row?.data?.createdAt).local().format('M/D/YYYY HH:mm A');
    }

    constructor(
        @Inject(SETTINGS_SERVICE) protected settings: SettingsServiceClass,
        protected filterService: DataTableFilterService,
        protected csvDownloadService: CsvDownloadService,
        @Inject(SHAREDZ_EXTENSION) protected extensionService: ExtensionService,
        protected router?: Router
    ) {
        this.dataService = inject(ZITI_DATA_SERVICE);
        this.settings.settingsChange.subscribe((settings) => {
            if (!isEmpty(this.settings?.settings?.session?.id)) {
                if (this.currentSettings?.session?.id !== settings?.session?.id && this.refreshData) {
                    this.refreshData();
                    this.currentSettings = settings
                }
            }
        });
        router.events.subscribe((event: any) => {
            if (event => event instanceof NavigationEnd) {
                if (!event?.snapshot?.routeConfig?.path) {
                    return;
                }
                const pathSegments = event.snapshot.routeConfig.path.split('/');
                this.basePath = pathSegments[0];
            }
        });
    }

    initMenuActions() {
        if (this.extensionService.listActions) {
            this.menuItems = this.menuItems.map((item) => {
                this.extensionService.listActions.forEach((extItem) => {
                    if (item.action === extItem.action) {
                        item = extItem;
                    }
                });
                return item;
            });
            let filteredActions = this.extensionService.listActions.filter((extItem) => {
                return !this.menuItems.some((item) => {
                    return item.action === extItem.action;
                });
            });
            this.menuItems = [...this.menuItems, ...filteredActions];
        }
    }

    addListItemExtensionActions(row) {
        if (this.extensionService.listActions) {
            const keys = this.extensionService.listActions.map((action) => {
                return action.action;
            });
            row.actionList = [...row.actionList, ...keys];
        }
    }

    getTableData(resourceType: string, paging: any, filters?: FilterObj[], sort?: any): Promise<any> {
        paging = {...this.DEFAULT_PAGING};
        if(sort) {
            paging.sort = sort.sortBy;
            paging.order = sort.ordering;
        }
        for (let idx = 0; idx < filters.length; idx++) {
            paging.noSearch = false;
            paging.searchOn = filters[idx].columnId;
            paging.filter = filters[idx].value;
            paging.rawFilter = true;
        }
        return this.dataService.get(resourceType, paging, filters);
    }

    removeItems(ids: string[]) {
        const promises = [];
        ids.forEach((id) => {
            const prom = this.dataService.delete(this.resourceType, id);
            promises.push(prom);
        });
        return Promise.all(promises);
    }

    sort(sortBy, ordering= 'asc') {
        this.currentSort = {sortBy, ordering};
        if(this.refreshData) this.refreshData({sortBy, ordering});
    }

    hasSelectedText() {
        let text = '';
        if (window.getSelection) {
            text = window.getSelection().toString();
        }
        return text?.length > 0;
    }

    public openEditForm(itemId = '', basePath?) {
        if (isEmpty(itemId)) {
            itemId = '/create';
        }
        basePath = basePath ? basePath : this.basePath;
        this.router?.navigateByUrl(`${basePath}/${itemId}`);
    }
}
