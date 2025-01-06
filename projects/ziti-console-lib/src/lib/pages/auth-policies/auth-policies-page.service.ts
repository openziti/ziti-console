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
export class AuthPoliciesPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;

    resourceType = 'auth-policies';
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
                        if (!result) {
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
                        if (!result) {
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
            }
        ];
    }

    checkDefaultAuthPolicy(authPolicy): Promise<any> {
        if (authPolicy.id !== 'default') {
            return Promise.resolve(true);
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
            showCancelLink: true
        };
        this.dialogRef = this.dialogForm.open(ConfirmComponent, {
            data: data,
            autoFocus: false,
        });
        return firstValueFrom(this.dialogRef.afterClosed());
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
