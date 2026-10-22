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
import {ListColumn} from "../../features/list-table/list-column";
import {NameCellComponent} from "../../features/list-table/name-cell/name-cell.component";
import {BooleanCellComponent} from "../../features/list-table/boolean-cell/boolean-cell.component";

@Injectable({
    providedIn: 'root'
})
export class CertificateAuthoritiesPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;

    resourceType = 'cas';
    selectedConfig: any = {};
    modalType = '';

    override menuItems = [
        {name: 'Edit', action: 'update', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M11.2 2.6 13.4 4.8 6 12.2l-2.8.6.6-2.8z"/></svg>'},
        {name: 'Verify', action: 'verify', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M8 2.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM5.6 8.2 7.3 9.9l3.2-3.4"/></svg>'},
        {name: 'Delete', action: 'delete', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M3.4 4.6h9.2M6.4 4.6V3.2h3.2v1.4M4.6 4.6 5 13h6l.4-8.4"/></svg>'},
    ]

    override tableHeaderActions = [
        {name: 'Download All', action: 'download-all', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M8 2.5v7M5 6.6 8 9.6l3-3M3.2 12.6h9.6"/></svg>'},
        {name: 'Download Selected', action: 'download-selected', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M8 2.5v7M5 6.6 8 9.6l3-3M3.2 12.6h9.6"/></svg>'},
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
            },
            this.ID_COLUMN_DEF
        ];
    }

    // Declarative ListColumn set for the new `lib-list-table` (Beta Features on).
    initListTableColumns(): ListColumn[] {
        this.initMenuActions();
        const verifiedFilterOptions = [
            { label: 'All', value: '' },
            { label: 'Verified', value: true },
            { label: 'Unverified', value: false },
        ];
        const enabledFilterOptions = [
            { label: 'All', value: '' },
            { label: 'Enabled', value: true },
            { label: 'Disabled', value: false },
        ];
        const jwtColumnRenderer = (row) => {
            let cell = '';
            if (row.data?.id && row.data?.isVerified) {
                cell = `<span class="cert"></span>`;
            }
            return cell;
        };
        const booleanColumn = (key: string, label: string, options: any[], trueLabel: string): ListColumn => ({
            key,
            field: key,
            label,
            filterType: 'SELECT',
            filterOptions: options,
            cell: BooleanCellComponent,
            cellInputs: (ctx) => ({value: ctx.value, trueLabel}),
            resizable: true,
            sortable: true,
            onSort: this.sort.bind(this),
            cellClass: 'nf-cell-vert-align',
        });
        const tableColumns: ListColumn[] = [
            {
                key: 'name',
                field: 'name',
                label: 'Name',
                filterType: 'TEXTINPUT',
                cell: NameCellComponent,
                cellInputs: (ctx) => ({
                    row: ctx.row,
                    cellValue: ctx.value,
                    cellConfig: {pathRoot: this.basePath, showIdentityIcons: false},
                }),
                onCellClick: (ctx) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.openEditForm(ctx.row?.id);
                },
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                sortable: true,
                onSort: this.sort.bind(this),
            },
            booleanColumn('isVerified', 'Verified', verifiedFilterOptions, 'Verified'),
            booleanColumn('isAutoCaEnrollmentEnabled', 'Auto Enrollment', enabledFilterOptions, 'Enabled'),
            booleanColumn('isOttCaEnrollmentEnabled', 'OTT Auto', enabledFilterOptions, 'Enabled'),
            booleanColumn('isAuthEnabled', 'Auth Enabled', enabledFilterOptions, 'Enabled'),
            {
                key: 'jwt',
                field: 'jwt',
                label: 'JWT',
                filterType: 'TEXTINPUT',
                cellHtml: jwtColumnRenderer,
                onCellClick: (ctx) => {
                    if (ctx.row?.id && ctx.row.isVerified) {
                        ctx.emitAction('download-jwt', ctx.row);
                    }
                },
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                sortable: true,
                onSort: this.sort.bind(this),
                width: this.remToPx(4.6875),
            },
            {
                key: 'createdAt',
                field: 'createdAt',
                label: 'Created At',
                valueFormatter: this.createdAtFormatter,
                filterType: 'DATETIME',
                filterPlaceholder: 'Any time',
                resizable: true,
                cellClass: 'nf-cell-vert-align',
            },
            {
                key: 'id',
                field: 'id',
                label: 'ID',
                filterType: 'TEXTINPUT',
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                hidden: true,
            },
        ];
        return tableColumns;
    }

    getData(filters?: FilterObj[], sort?: any, page?: any, pageSize?: number) {
        // we can customize filters or sorting here before moving on...
        this.paging.page = page || this.paging.page;
        if (pageSize) {
            this.paging.total = pageSize;
        }
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
            let actionList = ['update', 'delete'];
            if (!row.isVerified) {
                actionList = ['update', 'verify', 'delete'];
            }
            row.actionList = actionList;
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
