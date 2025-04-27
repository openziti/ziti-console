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
import {DataTableFilterService, FilterObj} from "../../features/data-table/data-table-filter.service";
import _, {isEmpty, unset} from "lodash";
import moment from "moment";
import {ListPageServiceClass} from "../../shared/list-page-service.class";
import {
    TableColumnDefaultComponent
} from "../../features/data-table/column-headers/table-column-default/table-column-default.component";
import {CallbackResults} from "../../features/list-page-features/list-page-form/list-page-form.component";
import {SchemaService} from "../../services/schema.service";
import {SETTINGS_SERVICE, SettingsService} from "../../services/settings.service";
import {CsvDownloadService} from "../../services/csv-download.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../features/extendable/extensions-noop.service";
import {APISession} from "../../models/api-session";
import {TableCellNameComponent} from "../../features/data-table/cells/table-cell-name/table-cell-name.component";
import {Router} from "@angular/router";

@Injectable({
    providedIn: 'root'
})
export class ApiSessionsPageService extends ListPageServiceClass {

    override DEFAULT_PAGING: any = {
        filter: "",
        noSearch: false,
        order: "asc",
        page: 1,
        searchOn: "service",
        sort: "service",
        total: 50
    }

    private paging = this.DEFAULT_PAGING;

    resourceType = 'api-sessions';
    selectedConfig: any = {};
    modalType = '';

    override menuItems = [
        {name: 'Edit', action: 'update'},
        {name: 'Delete', action: 'delete'},
    ]

    constructor(
        private schemaSvc: SchemaService,
        @Inject(SETTINGS_SERVICE) settings: SettingsService,
        filterService: DataTableFilterService,
        csvDownloadService: CsvDownloadService,
        @Inject(SHAREDZ_EXTENSION) extService: ExtensionService,
        protected override router: Router
    ) {
        super(settings, filterService, csvDownloadService, extService, router);
    }

    initTableColumns(): any {

        const edgeRoutersFormatter = (row) => {
            let rowData = '';
            row?.data?.edgeRouters?.forEach((router, index) => {
                rowData += ((index>0) ? "," : "") + router.name;
            });
            return rowData;
        };
        const createdAtHeaderComponentParams = {
            filterType: 'DATETIME',
        };

        return [
            {
                colId: 'id',
                field: 'id',
                headerName: 'ID',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                cellRenderer: TableCellNameComponent,
                cellRendererParams: { pathRoot: this.basePath },
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                width: this.remToPx(10),
                hide: false,
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.openEditForm(data?.data?.id);
                },
            },
            {
                colId: 'identity.name',
                field: 'identity.name',
                headerName: 'Identity Name',
                headerComponent: TableColumnDefaultComponent,
                cellRenderer: TableCellNameComponent,
                cellRendererParams: { pathRoot: 'identities', itemProp: 'identity.id' },
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.openIdentityForm(data?.data?.identityId);
                },
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: false,
                filter: true,
                sortColumn: this.sort.bind(this),
            },
            {
                colId: 'identity',
                field: 'identity.id',
                headerName: 'Identity ID',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                cellRenderer: TableCellNameComponent,
                cellRendererParams: { pathRoot: 'identities', itemProp: 'identity.id' },
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.openIdentityForm(data?.data?.identityId);
                },
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
                sortColumn: this.sort.bind(this),
            },
            {
                colId: 'ipAddress',
                field: 'ipAddress',
                headerName: 'IP Address',
                headerComponentParams: this.headerComponentParams,
                headerComponent: TableColumnDefaultComponent,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                width: this.remToPx(10),
            },
            {
                colId: 'isMfaRequired',
                field: 'isMfaRequired',
                headerName: 'MFA Required',
                headerComponent: TableColumnDefaultComponent,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                width: this.remToPx(10),
                hide: true
            },
            {
                colId: 'isMfaComplete',
                field: 'isMfaComplete',
                headerName: 'MFA Complete',
                headerComponent: TableColumnDefaultComponent,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                width: this.remToPx(10),
                hide: true
            },
            {
                colId: 'lastActivity',
                field: 'lastActivity',
                headerName: 'Last Activity',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: createdAtHeaderComponentParams,
                valueFormatter: this.createdAtFormatter,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                width: this.remToPx(10),
            },
            {
                colId: 'createdAt',
                field: 'createdAt',
                headerName: 'Created At',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: createdAtHeaderComponentParams,
                valueFormatter: this.createdAtFormatter,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                width: this.remToPx(10),
                hide: true
            },
        ];
    }

    public openIdentityForm(itemId = '', basePath?) {
        if (isEmpty(itemId)) {
            itemId = 'create';
        }
        basePath = basePath ? basePath : this.basePath;
        this.router?.navigateByUrl(`identities/${itemId}`);
    }

    getData(filters?: FilterObj[], sort?: any) {
        if (sort.sortBy === 'name') {
            sort.sortBy = 'id';
        }
        // we can customize filters or sorting here before moving on...
        return super.getTableData('api-sessions', this.paging, filters, sort)
            .then((results: any) => {
                return this.processData(results);
            });
    }

    private processData(results: any) {
        if (!isEmpty(results?.data)) {
            //pre-process data before rendering
            results.data = this.addActionsPerRow(results);
        }
        return results;
    }

    private addActionsPerRow(results: any): any[] {
        return results.data.map((row) => {
            row.actionList = ['update', 'delete'];
            return row;
        });
    }

    public openUpdate(item?: any) {
        this.modalType = 'api-session';
        if (item) {
            this.selectedConfig = item;
            this.selectedConfig.badges = [];
            unset(this.selectedConfig, '_links');
        } else {
            this.selectedConfig = new APISession();
        }
        this.sideModalOpen = true;
    }
}
