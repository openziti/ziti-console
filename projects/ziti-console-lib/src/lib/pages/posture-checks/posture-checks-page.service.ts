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
import {Service} from "../../models/service";
import {TableCellNameComponent} from "../../features/data-table/cells/table-cell-name/table-cell-name.component";
import {Router} from "@angular/router";

@Injectable({
    providedIn: 'root'
})
export class PostureChecksPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;

    resourceType = 'posture-checks';
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

        const osTypeFilterOptions = {
            filterType: 'SELECT',
            enableSorting: true,
            filterOptions: [
                { label: 'Domain', value: 'DOMAIN' },
                { label: 'MAC', value: 'MAC' },
                { label: 'MFA', value: 'MFA' },
                { label: 'OS', value: 'OS' },
                { label: 'Process', value: 'PROCESS' },
                { label: 'Process Multi', value: 'MULTI_PROCESS' },
            ]
        };

        const createdAtHeaderComponentParams = {
            filterType: 'DATETIME',
        };

        const detailsRenderer = (row) => {
            const data = row?.data || '';
            let details = '';
            if (data.typeId=="DOMAIN") {
                details = data.domains.join(',');
            } else if (data.typeId=="MAC") {
                for (let i=0; i < data.macAddresses.length; i++) {
                    try {
                        details += data.macAddresses[i].match( /.{1,2}/g).join(':').toUpperCase();
                    } catch(e) {
                        details = '';
                    }
                }
            } else if (data.typeId=="OS") {
                for (let i=0; i < data.operatingSystems.length; i++) {
                    const os = data.operatingSystems[i];
                    const versionData = os.versions?.length > 0 ? " ("+os.versions.join(',')+") " : ' ()';
                    details += os.type + versionData;
                }
            } else if (data.typeId=="PROCESS") {
                details = data.process.path;
            } else {
                details = "Requires MFA";
            }
            return details;
        }

        return [
            {
                colId: 'name',
                field: 'name',
                headerName: 'Name',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                cellRenderer: TableCellNameComponent,
                cellRendererParams: { pathRoot: this.basePath },
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
                sortColumn: this.sort.bind(this),
            },
            {
                colId: 'typeId',
                field: 'typeId',
                headerName: 'Type',
                headerComponent: TableColumnDefaultComponent,
                cellRendererParams: { pathRoot: this.basePath },
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.openEditForm(data?.data?.id);
                },
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: false,
                filter: false,
                width: 120,
                sortColumn: this.sort.bind(this),
            },
            {
                colId: 'details',
                field: 'details',
                headerName: 'Details',
                headerComponent: TableColumnDefaultComponent,
                cellRenderer: detailsRenderer,
                cellRendererParams: { pathRoot: this.basePath },
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.openEditForm(data?.data?.id);
                },
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: false,
                filter: false,
                sortColumn: this.sort.bind(this),
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
            },
            this.ID_COLUMN_DEF
        ];
    }

    getData(filters?: FilterObj[], sort?: any) {
        // we can customize filters or sorting here before moving on...
        return super.getTableData('posture-checks', this.paging, filters, sort)
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
        //no-opp
    }
}
