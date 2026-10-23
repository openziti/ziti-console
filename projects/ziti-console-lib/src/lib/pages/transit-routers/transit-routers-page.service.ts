import {Injectable, Inject, Component} from "@angular/core";
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
import {EdgeRouter} from "../../models/edge-router";
import {unset, forEach} from "lodash";
import {ITooltipAngularComp} from "ag-grid-angular";
import {ITooltipParams} from "ag-grid-community";
import {OSTooltipComponent} from "../../features/data-table/tooltips/os-tooltip.component";
import {GrowlerModel} from "../../features/messaging/growler.model";
import {GrowlerService} from "../../features/messaging/growler.service";
import {MatDialog} from "@angular/material/dialog";
import {SettingsServiceClass} from "../../services/settings-service.class";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../features/extendable/extensions-noop.service";
import {ConfirmComponent} from "../../features/confirm/confirm.component";
import {Router} from "@angular/router";
import {ListColumn} from "../../features/list-table/list-column";
import {NameCellComponent} from "../../features/list-table/name-cell/name-cell.component";
import {BooleanCellComponent} from "../../features/list-table/boolean-cell/boolean-cell.component";
import {TokenCellComponent} from "../../features/list-table/token-cell/token-cell.component";
import {TableCellNameComponent} from "../../features/data-table/cells/table-cell-name/table-cell-name.component";

@Injectable({
    providedIn: 'root'
})
export class TransitRoutersPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;
    public modalType = 'edge-router';

    override CSV_COLUMNS = [
        {label: 'Name', path: 'name'},
        {label: 'Verified', path: 'isVerified'},
        {label: 'Online', path: 'isOnline'},
        {label: 'Created', path: 'createdAt'},
        {label: 'Token', path: 'enrollmentToken'},
        {label: 'No Traversal', path: 'noTraversal'},
        {label: 'Fingerprint', path: 'fingerprint'},
        {label: 'Disabled', path: 'disabled'},
        {label: 'Tunneler Enabled', path: 'isTunnelerEnabled'},
        {label: 'Unverified CertPem', path: 'unverifiedCertPem'},
        {label: 'Unverified Fingerprint', path: 'unverifiedFingerprint'},
        {label: 'ID', path: 'id'},
    ];

    selectedEdgeRouter: any = new EdgeRouter();
    columnFilters: any = {
        name: '',
        os: '',
        createdAt: '',
    };

    override menuItems = [
        {name: 'Edit', action: 'update', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M11.2 2.6 13.4 4.8 6 12.2l-2.8.6.6-2.8z"/></svg>'},
        {name: 'Download JWT', action: 'download-enrollment', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M8 2.5v7M5 6.6 8 9.6l3-3M3.2 12.6h9.6"/></svg>'},
        {name: 'Reset Enrollment', action: 'reset-enrollment', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M13 8a5 5 0 1 1-1.5-3.6M13 2.6v2.8h-2.8"/></svg>'},
        {name: 'Re-Enroll', action: 're-enroll', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M13 8a5 5 0 1 1-1.5-3.6M13 2.6v2.8h-2.8"/></svg>'},
        {name: 'Delete', action: 'delete', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M3.4 4.6h9.2M6.4 4.6V3.2h3.2v1.4M4.6 4.6 5 13h6l.4-8.4"/></svg>'},
    ]

    override tableHeaderActions = [
        {name: 'Download All', action: 'download-all', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M8 2.5v7M5 6.6 8 9.6l3-3M3.2 12.6h9.6"/></svg>'},
        {name: 'Download Selected', action: 'download-selected', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M8 2.5v7M5 6.6 8 9.6l3-3M3.2 12.6h9.6"/></svg>'},
    ]

    resourceType = 'transit-routers';

    constructor(
        @Inject(SETTINGS_SERVICE) settings: SettingsServiceClass,
        filterService: DataTableFilterService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        override csvDownloadService: CsvDownloadService,
        private growlerService: GrowlerService,
        private dialogForm: MatDialog,
        @Inject(SHAREDZ_EXTENSION) private extService: ExtensionService,
        protected override router: Router
    ) {
        super(settings, filterService, csvDownloadService, extService, router);
    }

    validate = (formData): Promise<CallbackResults> => {
        return Promise.resolve({ passed: true});
    }

    initTableColumns(): any {
        this.initMenuActions();

        const enrollmentTokenFormatter = (row) => {
            const token = row?.data?.enrollmentToken;
            if (token) {
                if (moment(row?.data?.enrollmentExpiresAt).isBefore()) {
                    return 'Enrollment Expired';
                } else {
                    return token;
                }
            } else {
                return '';
            }
        };

        const columnFilters = this.columnFilters;


        let tableColumns = [
            {
                colId: 'name',
                field: 'name',
                headerName: 'Name',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                cellRenderer: TableCellNameComponent,
                cellRendererParams: { pathRoot: this.basePath, showRouterIcons: true },
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
                sortDir: 'asc'
            },
            {
                colId: 'verified',
                field: 'isVerified',
                headerName: 'Verified',
                width: 100,
                sortable: true,
                headerComponent: TableColumnDefaultComponent,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
            },
            {
                colId: 'online',
                field: 'isOnline',
                headerName: 'Online',
                width: 100,
                headerComponent: TableColumnDefaultComponent,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
            },
            {
                colId: 'createdAt',
                field: 'createdAt',
                headerName: 'Created At',
                headerComponent: TableColumnDefaultComponent,
                valueFormatter: this.createdAtFormatter,
                resizable: true,
                sortable: true,
                sortColumn: this.sort.bind(this),
                cellClass: 'nf-cell-vert-align tCol',
            },
            {
                colId: 'enrollmentToken',
                field: 'enrollmentToken',
                headerName: 'Token',
                headerComponent: TableColumnDefaultComponent,
                valueFormatter: enrollmentTokenFormatter,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
            },
            {
                colId: 'jwt',
                field: 'enrollmentJwt',
                headerName: 'JWT',
                headerComponent: TableColumnDefaultComponent,
                cellRenderer: 'cellTokenComponent',
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
            },
            this.ID_COLUMN_DEF
        ];

        if (this.extService.processTableColumns) {
            tableColumns = this.extService.processTableColumns(tableColumns);
        }

        return tableColumns;
    }

    // Declarative ListColumn set for the new `lib-list-table` (Beta Features on).
    initListTableColumns(): ListColumn[] {
        this.initMenuActions();
        const enrollmentTokenFormatter = (row) => {
            const token = row?.data?.enrollmentToken;
            if (!token) {
                return '';
            }
            return moment(row?.data?.enrollmentExpiresAt).isBefore() ? 'Enrollment Expired' : token;
        };
        const openForm = (ctx) => {
            if (this.hasSelectedText()) {
                return;
            }
            this.openEditForm(ctx.row?.id);
        };
        let tableColumns: ListColumn[] = [
            {
                key: 'name',
                field: 'name',
                label: 'Name',
                filterType: 'TEXTINPUT',
                cell: NameCellComponent,
                cellInputs: (ctx) => ({
                    row: ctx.row,
                    cellValue: ctx.value,
                    cellConfig: {pathRoot: this.basePath, showRouterIcons: true},
                }),
                onCellClick: openForm,
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                sortable: true,
                onSort: this.sort.bind(this),
                sortDir: 'asc',
            },
            {
                key: 'verified',
                field: 'isVerified',
                label: 'Verified',
                cell: BooleanCellComponent,
                cellInputs: (ctx) => ({value: ctx.value, trueLabel: 'Verified'}),
                width: 100,
                sortable: true,
                resizable: true,
                cellClass: 'nf-cell-vert-align',
            },
            {
                key: 'online',
                field: 'isOnline',
                label: 'Online',
                cell: BooleanCellComponent,
                cellInputs: (ctx) => ({value: ctx.value, trueLabel: 'Online'}),
                width: 100,
                resizable: true,
                cellClass: 'nf-cell-vert-align',
            },
            {
                key: 'createdAt',
                field: 'createdAt',
                label: 'Created At',
                valueFormatter: this.createdAtFormatter,
                filterType: 'DATETIME',
                filterPlaceholder: 'Any time',
                resizable: true,
                sortable: true,
                onSort: this.sort.bind(this),
                cellClass: 'nf-cell-vert-align',
            },
            {
                key: 'enrollmentToken',
                field: 'enrollmentToken',
                label: 'Token',
                valueFormatter: enrollmentTokenFormatter,
                resizable: true,
                cellClass: 'nf-cell-vert-align',
            },
            {
                key: 'jwt',
                field: 'enrollmentJwt',
                label: 'JWT',
                cell: TokenCellComponent,
                cellInputs: (ctx) => ({row: ctx.row, emitAction: ctx.emitAction}),
                resizable: true,
                cellClass: 'nf-cell-vert-align',
            },
            {
                key: 'id',
                field: 'id',
                label: 'ID',
                filterType: 'TEXTINPUT',
                onCellClick: openForm,
                resizable: true,
                sortable: true,
                onSort: this.sort.bind(this),
                cellClass: 'nf-cell-vert-align',
                hidden: true,
            },
        ];
        if (this.extService?.processListTableColumns) {
            tableColumns = this.extService.processListTableColumns(tableColumns);
        }
        return tableColumns;
    }

    getData(filters?: FilterObj[], sort?: any, page?: any, pageSize?: number): Promise<any> {
        // we can customize filters or sorting here before moving on...
        this.paging.page = page || this.paging.page;
        if (pageSize) {
            this.paging.total = pageSize;
        }
        return super.getTableData('transit-routers', this.paging, filters, sort)
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
            row.actionList = ['update', 're-enroll', 'delete'];
            if (this.hasEnrolmentToken(row)) {
                row.actionList.push('download-enrollment');
            }
            this.addListItemExtensionActions(row);
            return row;
        });
    }

    hasEnrolmentToken(item) {
        return !isEmpty(item?.enrollmentJwt);
    }


    getJWT(identity: any) {
        return identity.enrollmentJwt;
    }

    downloadJWT(jwt, name) {
        const element = document.createElement('a');
        element.setAttribute('href', 'data:application/ziti-jwt;charset=utf-8,' + encodeURIComponent(jwt));
        element.setAttribute('download', name+".jwt");
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }

    reenroll(router: any) {
        const data = {
            appendId: 'ReenrollRouter',
            title: 'Re-Enroll Router',
            message: `<p>If the router is currently connected, it will be disconnected until the enrollment process is completed with the newly generated JWT. <p> Are you sure you want to re-enroll the selected router?`,
            confirmLabel: 'Yes',
            cancelLabel: 'Oops, no get me out of here',
            showCancelLink: true
        };
        this.dialogRef = this.dialogForm.open(ConfirmComponent, {
            data: data,
            autoFocus: false,
        });
        return this.dialogRef.afterClosed().toPromise().then((result) => {
            if (result?.confirmed) {
                return this.zitiService.post(`transit-routers/${router.id}/re-enroll`, {}, true).then((result) => {
                    const growlerData = new GrowlerModel(
                        'success',
                        'Success',
                        `Re-enroll Confirmed`,
                        `Router re-enroll was sent. A new enrollment token is now available`,
                    );
                    this.growlerService.show(growlerData);
                });
            } else {
                return Promise.resolve();
            }
        });
    }

    openUpdate(entity?: any) {
        //Deprecated: No-Op
    }
}
