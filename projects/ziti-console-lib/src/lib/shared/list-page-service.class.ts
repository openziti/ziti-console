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

import {isEmpty, cloneDeep} from "lodash";
import {CsvDownloadService} from "../services/csv-download.service";
import {SettingsServiceClass} from "../services/settings-service.class";
import {ExtensionService, SHAREDZ_EXTENSION} from "../features/extendable/extensions-noop.service";
import moment from "moment/moment";
import {NavigationEnd, Router} from "@angular/router";
import {
    TableColumnDefaultComponent
} from "../features/data-table/column-headers/table-column-default/table-column-default.component";

export abstract class ListPageServiceClass {

    abstract initTableColumns(): any[];
    abstract getData(filters?: FilterObj[], sort?: any, page?: any): Promise<any[]>;
    abstract openUpdate(entity?: any);
    abstract resourceType: string;

    CSV_COLUMNS = [
        {label: 'Name', path: 'name'},
        {label: 'ID', path: 'id'},
        {label: 'Created At', path: 'createdAt'}
    ];

    basePath: string = '';

    headerComponentParams = {
        filterType: 'TEXTINPUT',
        enableSorting: true
    };

    ID_COLUMN_DEF = {
        colId: 'id',
        field: 'id',
        headerName: 'ID',
        headerComponent: TableColumnDefaultComponent,
        headerComponentParams: this.headerComponentParams,
        cellRendererParams: { pathRoot: this.basePath, showIdentityIcons: true },
        onCellClicked: (data) => {
            if (this.hasSelectedText()) {
                return;
            }
            this.openEditForm(data?.data?.id);
        },
        resizable: true,
        cellClass: 'nf-cell-vert-align tCol',
        sortable: true,
        filter: true,
        hide: true,
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
            if (!isEmpty(this.settings?.settings?.session?.id) || this.dataService.dataServiceType === ZitiDataService.NODE_DATA_SERVICE_TYPE) {
                if ((this.currentSettings?.session?.id !== settings?.session?.id || this.dataService.dataServiceType === ZitiDataService.NODE_DATA_SERVICE_TYPE) && this.refreshData) {
                    this.refreshData();
                }
            }
            this.currentSettings = settings;
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

    downloadItems(selectedItems) {
        this.csvDownloadService.download(
            this.resourceType,
            selectedItems,
            this.CSV_COLUMNS,
            false,
            false,
            undefined,
            false
        );
    }

    downloadAllItems(): Promise<any> {
        const paging = cloneDeep(this.DEFAULT_PAGING);
        paging.total = -1;
        return this.getTableData(this.resourceType, paging, undefined, undefined)
            .then((results: any) => {
                return this.downloadItems(results?.data);
            });
    }

    getTableData(resourceType: string, paging: any, filters?: FilterObj[], sort?: any): Promise<any> {
        if (!paging) {
            paging = {...this.DEFAULT_PAGING};
        }
        if(sort) {
            paging.sort = sort.sortBy;
            paging.order = sort.ordering;
        }
        for (let idx = 0; idx < filters?.length; idx++) {
            paging.noSearch = false;
            paging.searchOn = filters[idx].columnId;
            paging.filter = filters[idx].value;
            paging.rawFilter = true;
        }
        this.filterService.filtering.next(true);
        return this.dataService.get(resourceType, paging, filters).finally(() => {
            this.filterService.filtering.next(false);
        });
    }

    checkForAssociatedEntities(items, type, associatedType) {
        const itemsWithAssociations = [];
        const promises = [];
        items.forEach((config) => {
            const prom = this.dataService.getSubdata(type, config.id, associatedType).then((result: any) => {
                const services = result.data || [];
                if (services.length > 0) {
                    itemsWithAssociations.push(config);
                }
            });
            promises.push(prom);
        });
        return Promise.all(promises).then(() => {
            return itemsWithAssociations;
        });
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

    getNetworkJwt() {
        return this.dataService.get('network-jwts', {}, []);
    }

    public openEditForm(itemId = '', basePath?) {
        if (isEmpty(itemId)) {
            itemId = 'create';
        }
        basePath = basePath ? basePath : this.basePath;
        this.router?.navigateByUrl(`${basePath}/${itemId}`);
    }

    remToPx(remValue) {
        const rootFontSize: any = parseFloat(window.getComputedStyle(document.documentElement).fontSize);
        return remValue * rootFontSize;
    };
}
