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
import {Session} from "../../models/session";
import {TableCellNameComponent} from "../../features/data-table/cells/table-cell-name/table-cell-name.component";
import {Router} from "@angular/router";
import {ListColumn} from "../../features/list-table/list-column";
import {NameCellComponent} from "../../features/list-table/name-cell/name-cell.component";
import {BooleanCellComponent} from "../../features/list-table/boolean-cell/boolean-cell.component";

@Injectable({
    providedIn: 'root'
})
export class SessionsPageService extends ListPageServiceClass {

    override DEFAULT_PAGING: any = {
        filter: "",
        noSearch: false,
        order: "asc",
        page: 1,
        searchOn: "id",
        sort: "id",
        total: 50
    }

    private paging = this.DEFAULT_PAGING;

    resourceType = 'sessions';
    selectedConfig: any = {};
    modalType = '';

    override menuItems = [
        {name: 'View', action: 'update', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M1.5 8s2.3-4.5 6.5-4.5S14.5 8 14.5 8s-2.3 4.5-6.5 4.5S1.5 8 1.5 8zM8 6.2a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6z"/></svg>'},
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
        const typeHeaderComponentParams = {
            filterType: 'SELECT',
            enableSorting: true,
            filterOptions: [
                { label: 'All', value: '', columnId: 'type' },
                { label: 'Bind', value: 'Bind', columnId: 'type' },
                { label: 'Dial', value: 'Dial', columnId: 'type' },
            ],
            getFilterOptions: () => {
                return typeHeaderComponentParams.filterOptions;
            }
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
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.openEditForm(data?.data?.id);
                },
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: false,
                sortColumn: this.sort.bind(this),
            },
            {
                colId: 'service.name',
                field: 'service.name',
                headerName: 'Service Name',
                headerComponent: TableColumnDefaultComponent,
                cellRenderer: TableCellNameComponent,
                cellRendererParams: { pathRoot: 'services/advanced', itemProp: 'service.id' },
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
                colId: 'service',
                field: 'service.id',
                headerName: 'Service ID',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                cellRenderer: TableCellNameComponent,
                cellRendererParams: { pathRoot: 'services/advanced', itemProp: 'service.id' },
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
                colId: 'edgeRouters',
                field: 'edgeRouters',
                headerName: 'Edge Routers',
                headerComponent: TableColumnDefaultComponent,
                valueFormatter: edgeRoutersFormatter,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                width: this.remToPx(10),
            },
            {
                colId: 'type',
                field: 'type',
                headerName: 'Type',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: typeHeaderComponentParams,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                width: this.remToPx(10),
            },
            {
                colId: 'isSystem',
                field: 'isSystem',
                headerName: 'Is System',
                headerComponent: TableColumnDefaultComponent,
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
            }
        ];
    }

    // Declarative ListColumn set for the new `lib-list-table` (Beta Features on).
    initListTableColumns(): ListColumn[] {
        const edgeRoutersFormatter = (row) => {
            return (row?.data?.edgeRouters || []).map((router) => router.name).join(',');
        };
        const typeFilterOptions = [
            {label: 'All', value: '', columnId: 'type'},
            {label: 'Bind', value: 'Bind', columnId: 'type'},
            {label: 'Dial', value: 'Dial', columnId: 'type'},
        ];
        const openForm = (ctx) => {
            if (this.hasSelectedText()) {
                return;
            }
            this.openEditForm(ctx.row?.id);
        };
        return [
            {
                key: 'id',
                field: 'id',
                label: 'ID',
                filterType: 'TEXTINPUT',
                cell: NameCellComponent,
                cellInputs: (ctx) => ({
                    row: ctx.row,
                    cellValue: ctx.value,
                    cellConfig: {pathRoot: this.basePath},
                }),
                onCellClick: openForm,
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                sortable: true,
                onSort: this.sort.bind(this),
            },
            {
                key: 'service.name',
                field: 'service.name',
                label: 'Service Name',
                cell: NameCellComponent,
                cellInputs: (ctx) => ({
                    row: ctx.row,
                    cellValue: ctx.value,
                    cellConfig: {pathRoot: 'services/advanced', itemProp: 'service.id'},
                }),
                onCellClick: openForm,
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                sortable: false,
            },
            {
                key: 'service',
                field: 'service.id',
                filterField: 'service',
                label: 'Service ID',
                filterType: 'TEXTINPUT',
                cell: NameCellComponent,
                cellInputs: (ctx) => ({
                    row: ctx.row,
                    cellValue: ctx.value,
                    cellConfig: {pathRoot: 'services/advanced', itemProp: 'service.id'},
                }),
                onCellClick: openForm,
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                sortable: true,
                onSort: this.sort.bind(this),
            },
            {
                key: 'edgeRouters',
                field: 'edgeRouters',
                label: 'Edge Routers',
                valueFormatter: edgeRoutersFormatter,
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                width: this.remToPx(10),
            },
            {
                key: 'type',
                field: 'type',
                label: 'Type',
                filterType: 'SELECT',
                filterPlaceholder: 'Any type',
                filterOptions: typeFilterOptions,
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                width: this.remToPx(10),
            },
            {
                key: 'isSystem',
                field: 'isSystem',
                label: 'Is System',
                cell: BooleanCellComponent,
                cellInputs: (ctx) => ({value: ctx.value, trueLabel: 'System'}),
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                width: this.remToPx(10),
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
                width: this.remToPx(10),
            },
        ];
    }

    getData(filters?: FilterObj[], sort?: any, page?: any, pageSize?: number) {
        this.paging.page = page || this.paging.page;
        if (pageSize) {
            this.paging.total = pageSize;
        }
        if (sort.sortBy === 'name') {
            sort.sortBy = 'id';
        }
        // we can customize filters or sorting here before moving on...
        return super.getTableData('sessions', this.paging, filters, sort)
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
        this.modalType = 'session';
        if (item) {
            this.selectedConfig = item;
            this.selectedConfig.badges = [];
            unset(this.selectedConfig, '_links');
        } else {
            this.selectedConfig = new Session();
        }
        this.sideModalOpen = true;
    }
}
