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

import {Injectable, Inject} from "@angular/core";
import {cloneDeep, isEmpty} from 'lodash';
import moment from 'moment';
import {DataTableFilterService, FilterObj} from "../../features/data-table/data-table-filter.service";
import {ListPageServiceClass} from "../../shared/list-page-service.class";
import {
    TableColumnDefaultComponent
} from "../../features/data-table/column-headers/table-column-default/table-column-default.component";
import {CallbackResults} from "../../features/list-page-features/list-page-form/list-page-form.component";
import {SETTINGS_SERVICE, SettingsService} from "../../services/settings.service";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../services/ziti-data.service";
import {CsvDownloadService} from "../../services/csv-download.service";
import {Service} from "../../models/service";
import {unset} from "lodash";
import {GrowlerModel} from "../../features/messaging/growler.model";
import {GrowlerService} from "../../features/messaging/growler.service";
import {MatDialog} from "@angular/material/dialog";
import {SettingsServiceClass} from "../../services/settings-service.class";

const CSV_COLUMNS = [
    {label: 'Name', path: 'name'},
    {label: 'Created At', path: 'createdAt'}
];

@Injectable({
    providedIn: 'root'
})
export class ServicesPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;
    public modalType = 'service';

    selectedService: any = new Service();
    columnFilters: any = {
        name: '',
        os: '',
        createdAt: '',
    };

    override menuItems = [
        {name: 'Edit', action: 'update'},
        {name: 'Delete', action: 'delete'},
    ]

    override tableHeaderActions = [
        {name: 'Download All', action: 'download-all'},
        {name: 'Download Selected', action: 'download-selected'},
    ]

    resourceType = 'services';
    constructor(
        @Inject(SETTINGS_SERVICE) settings: SettingsServiceClass,
        filterService: DataTableFilterService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        override csvDownloadService: CsvDownloadService,
        private growlerService: GrowlerService,
        private dialogForm: MatDialog,
    ) {
        super(settings, filterService, csvDownloadService);
    }

    validate = (formData): Promise<CallbackResults> => {
        return Promise.resolve({ passed: true});
    }

    initTableColumns(): any {
        const nameRenderer = (row) => {
            return `<div class="col cell-name-renderer" data-id="${row?.data?.id}">
                <strong>${row?.data?.name}</strong>
              </div>`
        }

        const rolesRenderer = (row) => {
            let roles = '';
            row?.data?.roleAttributes?.forEach((attr) => {
                roles += '<div class="hashtag">'+attr+'</div>';
            });
            return roles;
        }

        const createdAtFormatter = (row) => {
            return moment(row?.data?.createdAt).local().format('M/D/YYYY H:MM A');
        }

        return [
            {
                colId: 'name',
                field: 'name',
                headerName: 'Name',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                onCellClicked: (data) => {
                    this.openUpdate(data.data);
                },
                resizable: true,
                cellRenderer: nameRenderer,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
                sortColumn: this.sort.bind(this),
                sortDir: 'asc',
                width: 300,
            },
            {
                colId: 'roles',
                field: 'roleAttributes',
                headerName: 'Roles',
                headerComponent: TableColumnDefaultComponent,
                onCellClicked: (data) => {
                    this.openUpdate(data.data);
                },
                resizable: true,
                cellRenderer: rolesRenderer,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: false,
                filter: false,
            },
            {
                colId: 'createdAt',
                field: 'createdAt',
                headerName: 'Created At',
                headerComponent: TableColumnDefaultComponent,
                valueFormatter: createdAtFormatter,
                resizable: true,
                sortable: true,
                sortColumn: this.sort.bind(this),
                cellClass: 'nf-cell-vert-align tCol',
            }
        ];
    }

    getData(filters?: FilterObj[], sort?: any, page?: any): Promise<any> {
        // we can customize filters or sorting here before moving on...
        this.paging.page = page || this.paging.page;
        return super.getTableData('services', this.paging, filters, sort)
            .then((results: any) => {
                return this.processData(results);
            });
    }

    private processData(results: any) {
        if (!isEmpty(results?.data)) {
            //pre-process data before rendering
            results.data = this.addActionsPerRow(results);
        }
        if (!isEmpty(results?.meta?.pagination)) {
            this.totalCount = results.meta?.pagination.totalCount;
        }
        return results;
    }

    private addActionsPerRow(results: any): any[] {
        return results.data.map((row) => {
            row.actionList = ['update', 'delete'];
            return row;
        });
    }

    public getServiceRoleAttributes() {
        return this.zitiService.get('service-role-attributes', {}, []);
    }

    downloadAllItems() {
        const paging = cloneDeep(this.paging);
        paging.total = this.totalCount;
        super.getTableData('services', paging, undefined, undefined)
            .then((results: any) => {
                return this.downloadItems(results?.data);
            });
    }

    downloadItems(selectedItems) {
        this.csvDownloadService.download(
            'services',
            selectedItems,
            CSV_COLUMNS,
            false,
            false,
            undefined,
            false
        );
    }

    public openUpdate(item?: any) {
        this.modalType = 'service';
        if (item) {
            this.selectedService = item;
            this.selectedService.badges = [];
            // TODO: implement when metrics and dialog features are available
            /*this.selectedService.moreActions = [
                {name: 'open-metrics', label: 'Open Metrics'},
                {name: 'dial-logs', label: 'Dial Logs'},
                {name: 'dial-logs', label: 'View Events'},
            ];*/
            unset(this.selectedService, '_links');
        } else {
            this.selectedService = new Service();
        }
        this.sideModalOpen = true;
    }
}
