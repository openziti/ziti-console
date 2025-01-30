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
import {ConfirmComponent} from "../../features/confirm/confirm.component";
import {firstValueFrom} from "rxjs";
import {MatDialog} from "@angular/material/dialog";

@Injectable({
    providedIn: 'root'
})
export class CertificateAuthoritiesPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;

    resourceType = 'cas';
    selectedConfig: any = {};
    modalType = '';

    override menuItems = [
        {name: 'Edit', action: 'update'},
        {name: 'Verify', action: 'verify'},
        {name: 'Delete', action: 'delete'},
    ]

    constructor(
        private schemaSvc: SchemaService,
        @Inject(SETTINGS_SERVICE) settings: SettingsService,
        filterService: DataTableFilterService,
        csvDownloadService: CsvDownloadService,
        @Inject(SHAREDZ_EXTENSION) extService: ExtensionService,
        protected override router: Router,
        private dialogForm: MatDialog
    ) {
        super(settings, filterService, csvDownloadService, extService, router);
    }

    initTableColumns(): any {

        const verifiedHeaderComponentParams = {
            filterType: 'SELECT',
            enableSorting: true,
            filterOptions: [
                { label: 'All', value: '' },
                { label: 'Verified', value: true },
                { label: 'Unverified', value: false },
            ]
        };
        const enabledComponentParams = {
            filterType: 'SELECT',
            enableSorting: true,
            filterOptions: [
                { label: 'All', value: '' },
                { label: 'Enabled', value: true },
                { label: 'Disabled', value: false },
            ]
        };
        const createdAtHeaderComponentParams = {
            filterType: 'DATETIME',
        };
        const jwtColumnRenderer = (row) => {
            let cell = '';
            if (row.data?.id && row.data?.isVerified) {
                cell = `<span class="cert"></span>`;
            }
            return cell;
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
                sortColumn: this.sort.bind(this)
            },
            {
                colId: 'isVerified',
                field: 'isVerified',
                headerName: 'Verified',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: verifiedHeaderComponentParams,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
                sortColumn: this.sort.bind(this),
            },
            {
                colId: 'isAutoCaEnrollmentEnabled',
                field: 'isAutoCaEnrollmentEnabled',
                headerName: 'Auto Enrollment',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: enabledComponentParams,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
                sortColumn: this.sort.bind(this),
            },
            {
                colId: 'isOttCaEnrollmentEnabled',
                field: 'isOttCaEnrollmentEnabled',
                headerName: 'OTT Auto',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: enabledComponentParams,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
                sortColumn: this.sort.bind(this),
            },
            {
                colId: 'isAuthEnabled',
                field: 'isAuthEnabled',
                headerName: 'Auth Enabled',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: enabledComponentParams,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
                sortColumn: this.sort.bind(this),
            },
            {
                colId: 'jwt',
                field: 'jwt',
                headerName: 'JWT',
                cellRenderer: jwtColumnRenderer,
                headerComponent: TableColumnDefaultComponent,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
                sortColumn: this.sort.bind(this),
                width: this.remToPx(4.6875)
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
            }
        ];
    }

    getData(filters?: FilterObj[], sort?: any) {
        // we can customize filters or sorting here before moving on...
        return super.getTableData(this.resourceType, this.paging, filters, sort)
            .then((results: any) => {
                return this.processData(results);
            });
    }

    validate = (formData): Promise<CallbackResults> => {
        return Promise.resolve({ passed: true});
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
            row.actionList = ['update', 'verify', 'delete',];
            return row;
        });
    }

    public openUpdate(item?: any) {
        this.modalType = 'cas';
        if (item) {
            this.selectedConfig = item;
            this.selectedConfig.badges = [];
            unset(this.selectedConfig, '_links');
        } else {
            this.selectedConfig = new Service();
        }
        this.sideModalOpen = true;
    }

    public verifyCert(itemId, basePath?) {
        basePath = basePath ? basePath : this.basePath;
        this.router?.navigateByUrl(`${basePath}/${itemId}/verify`);
    }

    public getJwt(id) {
        return this.dataService.getSubdata('cas', id,'jwt', {},'application/jwt').then((result: any) => {
            const element = document.createElement('a');
            element.setAttribute('href', 'data:application/ziti-jwt;charset=utf-8,' + encodeURIComponent(result));
            element.setAttribute('download', id+".jwt");
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
        });
    }
}
