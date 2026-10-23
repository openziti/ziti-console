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
export class AuthPoliciesPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;

    resourceType = 'auth-policies';
    selectedConfig: any = {};
    modalType = '';

    override menuItems = [
        {name: 'Edit', action: 'update', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M11.2 2.6 13.4 4.8 6 12.2l-2.8.6.6-2.8z"/></svg>'},
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

        const allowedHeaderComponentParams = {
            filterType: 'SELECT',
            enableSorting: true,
            filterOptions: [
                { label: 'All', value: '' },
                { label: 'Allowed', value: true },
                { label: 'Not Allowed', value: false },
            ]
        };
        const createdAtHeaderComponentParams = {
            filterType: 'DATETIME',
        };
        return [
            {
                colId: 'name',
                field: 'name',
                headerName: 'Name',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                cellRenderer: TableCellNameComponent,
                cellRendererParams: { pathRoot: this.basePath, cellNamePreCheck: (data) => {
                    this.checkDefaultAuthPolicy(data).then((result) => {
                        if (!result?.confirmed) {
                            return;
                        }
                        this.openEditForm(data?.id);
                    });
                }},
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.checkDefaultAuthPolicy(data?.data).then((result: any) => {
                        if (!result?.confirmed) {
                            return;
                        }
                        this.openEditForm(data?.data?.id);
                    });
                },
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
                sortColumn: this.sort.bind(this)
            },
            {
                colId: 'primary.cert.allowed',
                field: 'primary.cert.allowed',
                headerName: 'Cert',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: allowedHeaderComponentParams,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
                sortColumn: this.sort.bind(this),
            },
            {
                colId: 'primary.extJwt.allowed',
                field: 'primary.extJwt.allowed',
                headerName: 'External JWT',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: allowedHeaderComponentParams,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
                sortColumn: this.sort.bind(this),
            },
            {
                colId: 'primary.updb.allowed',
                field: 'primary.updb.allowed',
                headerName: 'UPDB',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: allowedHeaderComponentParams,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
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
            },
            this.ID_COLUMN_DEF
        ];
    }

    checkDefaultAuthPolicy(authPolicy): Promise<any> {
        if (authPolicy.id !== 'default') {
            return Promise.resolve({ confirmed: true });
        }
        const confirmationMessage =
            `<p>WARNING: Do not change the default policy unless you're sure you know what you are doing.</p>
             <p>Before changing the default policy, it's recommended that you make another policy and apply that to other users first. Then make sure you can still authenticate. </p>
             <p>Do you still want to continue?</p>`;
        const data = {
            appendId: 'ConfirmDefaultAuthPolicy',
            title: 'Are You Sure?',
            message: confirmationMessage,
            confirmLabel: 'Yes',
            cancelLabel: 'Oops, no get me out of here',
            showCancelLink: true,
            imageUrl: 'assets/svgs/Growl_Warning.svg'
        };
        this.dialogRef = this.dialogForm.open(ConfirmComponent, {
            data: data,
            autoFocus: false,
        });
        return firstValueFrom(this.dialogRef.afterClosed());
    }

    // Declarative ListColumn set for the new `lib-list-table` (Beta Features on).
    initListTableColumns(): ListColumn[] {
        this.initMenuActions();
        const allowedFilterOptions = [
            { label: 'All', value: '' },
            { label: 'Allowed', value: true },
            { label: 'Not Allowed', value: false },
        ];
        const allowedColumn = (key: string, label: string): ListColumn => ({
            key,
            field: key,
            label,
            filterType: 'SELECT',
            filterOptions: allowedFilterOptions,
            cell: BooleanCellComponent,
            cellInputs: (ctx) => ({value: ctx.value, trueLabel: 'Allowed'}),
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
                    cellConfig: {
                        pathRoot: this.basePath,
                        showIdentityIcons: false,
                        cellNamePreCheck: (data) => this.checkDefaultAuthPolicy(data),
                    },
                }),
                onCellClick: (ctx) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.checkDefaultAuthPolicy(ctx.row).then((result: any) => {
                        if (!result?.confirmed) {
                            return;
                        }
                        this.openEditForm(ctx.row?.id);
                    });
                },
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                sortable: true,
                onSort: this.sort.bind(this),
            },
            allowedColumn('primary.cert.allowed', 'Cert'),
            allowedColumn('primary.extJwt.allowed', 'External JWT'),
            allowedColumn('primary.updb.allowed', 'UPDB'),
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
            row.actionList = ['update', 'delete'];
            return row;
        });
    }

    public openUpdate(item?: any) {
        this.modalType = 'auth-policy';
        if (item) {
            this.selectedConfig = item;
            this.selectedConfig.badges = [];
            unset(this.selectedConfig, '_links');
        } else {
            this.selectedConfig = new Service();
        }
        this.sideModalOpen = true;
    }
}
