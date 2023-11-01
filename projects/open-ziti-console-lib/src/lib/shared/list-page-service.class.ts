import {Inject, inject} from '@angular/core';
import {ZITI_DATA_SERVICE, ZitiDataService} from "../services/ziti-data.service";
import {DataTableFilterService, FilterObj} from "../features/data-table/data-table-filter.service";
import {ValidatorCallback} from "../features/list-page-features/list-page-form/list-page-form.component";
import {DialogRef} from "@angular/cdk/dialog";
import {MatDialog} from "@angular/material/dialog";
import {ConfirmComponent} from "../features/confirm/confirm.component";
import {SETTINGS_SERVICE, SettingsService} from "../services/settings.service";

import {isEmpty} from "lodash";
import {CsvDownloadService} from "../services/csv-download.service";

export abstract class ListPageServiceClass {

    abstract initTableColumns(): any[];
    abstract getData(filters?: FilterObj[], sort?: any): Promise<any[]>
    abstract validate: ValidatorCallback;

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
    dataService: ZitiDataService;
    refreshData: (sort?: {sortBy: string, ordering: string}) => void | undefined;

    menuItems: any = [];
    tableHeaderActions: any = [];
    currentSettings: any = {};
    dialogRef: any;

    constructor(
        @Inject(SETTINGS_SERVICE) protected settings: SettingsService,
        protected filterService: DataTableFilterService,
        protected csvDownloadService: CsvDownloadService,
    ) {
        this.dataService = inject(ZITI_DATA_SERVICE);
        this.settings.settingsChange.subscribe((settings) => {
            if (!isEmpty(this.settings?.settings?.session?.id)) {
                if (this.currentSettings?.session?.id !== settings?.session?.id) {
                    this.refreshData();
                    this.currentSettings = settings
                }
            }
        });
    }

    getTableData(resourceType: string, paging: any, filters?: FilterObj[], sort?: any): Promise<any> {
        paging = {...this.DEFAULT_PAGING};
        if(sort) {
            paging.sort = sort.sortBy;
            paging.order = sort.ordering;
        }
        let nonNameFilters: FilterObj[] = [];
        if(filters) {
            for (let idx = 0; idx < filters.length; idx++) {
                if (filters[idx].columnId === 'name' && filters[idx].value) {
                    paging.noSearch = false;
                    paging.searchOn = 'name'
                    paging.filter = filters[idx].value;
                } else nonNameFilters.push(filters[idx]);
            }
        }
        return this.dataService.get(resourceType, paging, nonNameFilters);
    }

    removeItems(resourceType: string, ids: string[]) {
        const promises = [];
        ids.forEach((id) => {
            const prom = this.dataService.delete(resourceType, id);
            promises.push(prom);
        });
        return Promise.all(promises);
    }

    sort(sortBy, ordering= 'desc') {
        if(this.refreshData) this.refreshData({sortBy, ordering});
    }
}
