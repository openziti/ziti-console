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
import {EDGE_ROUTER_EXTENSION_SERVICE} from "../../features/projectable-forms/edge-router/edge-router-form.service";
import {ExtensionService} from "../../features/extendable/extensions-noop.service";
import {ConfirmComponent} from "../../features/confirm/confirm.component";
import {Router} from "@angular/router";
import {TableCellNameComponent} from "../../features/data-table/cells/table-cell-name/table-cell-name.component";
import {ListColumn} from "../../features/list-table/list-column";
import {NameCellComponent} from "../../features/list-table/name-cell/name-cell.component";
import {BooleanCellComponent} from "../../features/list-table/boolean-cell/boolean-cell.component";
import {TokenCellComponent} from "../../features/list-table/token-cell/token-cell.component";
import {AttributeCellComponent} from "../../features/list-table/attribute-cell/attribute-cell.component";
import {OsInfoTooltipComponent} from "../../features/list-table/os-info-tooltip/os-info-tooltip.component";

@Injectable({
    providedIn: 'root'
})
export class EdgeRoutersPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;
    public modalType = 'edge-router';

    override CSV_COLUMNS = [
        {label: 'Name', path: 'name'},
        {label: 'Attributes', path: 'roleAttributes'},
        {label: 'Verified', path: 'isVerified'},
        {label: 'Online', path: 'isOnline'},
        {label: 'Created', path: 'createdAt'},
        {label: 'Token', path: 'enrollmentToken'},
        {label: 'No Traversal', path: 'noTraversal'},
        {label: 'Host Name', path: 'hostname'},
        {label: 'Disabled', path: 'disabled'},
        {label: 'Tunneler Enabled', path: 'isTunnelerEnabled'},
        {label: 'OS', path: 'versionInfo.os'},
        {label: 'Architecture', path: 'versionInfo.arch'},
        {label: 'Version', path: 'versionInfo.version'},
        {label: 'Revision', path: 'versionInfo.revision'},
        {label: 'Fingerprint', path: 'fingerprint'},
        {label: 'Advertise TLS Address',path: 'supportedProtocols.tls'},
        {label: 'Advertise WSS Address',path: 'supportedProtocols.wss'},
        {label: 'ID', path: 'id'},
    ];

    selectedEdgeRouter: any = new EdgeRouter();
    columnFilters: any = {
        name: '',
        os: '',
        createdAt: '',
    };
    edgeRouterRoleAttributes: any[] = [];
    selectedEdgeRouterRoleAttributes: any[] = [];

    // `icon` (SVG markup) is rendered before the label in the new list-table's row kebab
    // (3-dot) menu. The legacy ag-grid menu ignores it.
    override menuItems = [
        {name: 'Edit', action: 'update', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M11.2 2.6 13.4 4.8 6 12.2l-2.8.6.6-2.8z"/></svg>'},
        {name: 'Download JWT', action: 'download-enrollment', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M8 2.5v7M5 6.6 8 9.6l3-3M3.2 12.6h9.6"/></svg>'},
        {name: 'Reset Enrollment', action: 'reset-enrollment', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M3.2 8a4.8 4.8 0 1 0 1.3-3.3"/><path fill="currentColor" d="M2.8 2.8l-.3 2.9 2.8-.4z"/></svg>'},
        {name: 'Re-Enroll', action: 're-enroll', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M12.8 8a4.8 4.8 0 1 1-1.3-3.3"/><path fill="currentColor" d="M13.2 2.8l.3 2.9-2.8-.4z"/></svg>'},
        {name: 'Delete', action: 'delete', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M3.4 4.6h9.2M6.4 4.6V3.2h3.2v1.4M4.6 4.6 5 13h6l.4-8.4"/></svg>'},
    ]

    override tableHeaderActions = [
        {name: 'Download All', action: 'download-all', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M8 2.5v7M5 6.6 8 9.6l3-3M3.2 12.6h9.6"/></svg>'},
    ]

    resourceType = 'edge-routers';

    constructor(
        @Inject(SETTINGS_SERVICE) settings: SettingsServiceClass,
        filterService: DataTableFilterService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        override csvDownloadService: CsvDownloadService,
        private growlerService: GrowlerService,
        private dialogForm: MatDialog,
        @Inject(EDGE_ROUTER_EXTENSION_SERVICE) private extService: ExtensionService,
        protected override router: Router
    ) {
        super(settings, filterService, csvDownloadService, extService, router);
        // drop the attribute column's selected roles when its filter is cleared, so the
        // header dropdown and the applied-filter tag stay in sync (see identities page)
        this.filterService.filtersChanged.subscribe(filters => {
            const hasRoleFilter = (filters || []).some((filter) => filter.columnId === 'roleAttributes');
            if (!hasRoleFilter) {
                this.selectedEdgeRouterRoleAttributes = [];
            }
        });
    }

    validate = (formData): Promise<CallbackResults> => {
        return Promise.resolve({ passed: true});
    }

    initTableColumns(): any {
        this.initMenuActions();

        const nameRenderer = (row) => {
            return `<div class="col cell-name-renderer" data-id="${row?.data?.id}">
                <span class="circle ${row?.data?.isVerified}" title="Verified Status"></span>
                <span class="circle ${row?.data?.isOnline}" title="Online Status"></span>
                <strong>${row?.data?.name}</strong>
              </div>`;
        }

        const rolesRenderer = (row) => {
            let roles = '';
            row?.data?.roleAttributes?.forEach((attr) => {
                roles += '<div class="hashtag">'+attr+'</div>';
            });
            return roles;
        }

        const osRenderer = (row) => {
            const osMap: any = {
                'darwin': 'apple',
                'linux': 'linux',
                'android': 'android',
                'windows': 'windows'
            }
            let os = "other";
            forEach(osMap, (value, key) => {
                if (row?.data?.versionInfo?.osVersion?.toLowerCase().indexOf(key)>=0 ||
                    row?.data?.versionInfo?.os.toLowerCase().indexOf(key)>=0) {
                    os = value;
                }
            });
            return `<div class="col desktop" data-id="${row?.data?.id}" style="overflow: unset;">
                <span class="os ${os}" data-balloon-pos="up"></span>
              </div>`
        }

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

        const osParams = {
            filterType: 'COMBO',
            filterOptions: [
                { label: 'All', value: '', icon: 'empty' },
                { label: 'Apple', value: 'darwin', icon: 'apple' },
                { label: 'Windows', value: 'mingw', icon: 'windows'  },
                { label: 'Linux', value: 'linux', icon: 'linux'  },
                { label: 'Android', value: 'android', icon: 'android'  },
                { label: 'Other (text search)', value: '', icon: 'other', useTextInput: true  },
            ],
            columnFilters,
        };

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
                colId: 'os',
                field: 'versionInfo.os',
                headerName: 'O/S',
                width: 100,
                cellRenderer: osRenderer,
                headerComponent: TableColumnDefaultComponent,
                tooltipComponent: OSTooltipComponent,
                tooltipField: 'versionInfo.os',
                tooltipComponentParams: { color: '#ececec' },
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
            },
            {
                colId: 'roleAttributes',
                field: 'roleAttributes',
                headerName: 'Roles',
                headerComponent: TableColumnDefaultComponent,
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.openEditForm(data?.data?.id);
                },
                resizable: true,
                cellRenderer: this.rolesRenderer,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: false,
                filter: false,
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
            {
                colId: 'hostname',
                field: 'hostname',
                headerName: 'Host Name',
                headerComponent: TableColumnDefaultComponent,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: false,
                filter: false,
                tooltipValueGetter: (params) => {
                    return params.value || '';
                }
            },
            {
                colId: 'version',
                field: 'versionInfo.version',
                headerName: 'Router Version',
                headerComponent: TableColumnDefaultComponent,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: false,
                filter: false,
            },
            {
                colId: 'supportedProtocols',
                headerName: 'Advertise Address',
                headerComponent: TableColumnDefaultComponent,
                resizable: true,
                sortable: false,
                filter: false,
                valueGetter: (params) => {
                  const protocols = params.data?.supportedProtocols;
                  if (!protocols) return '';
                  return Object.values(protocols).filter(Boolean).join(' | ');
                },
                tooltipValueGetter: (params) => params.value,
                tooltipShowMode: 'whenTruncated',
                cellStyle: {whiteSpace: 'nowrap',overflow: 'hidden',textOverflow: 'ellipsis'}
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
        const edgeRouterRolesHeaderComponentParams = {
            filterType: 'ATTRIBUTE',
            enableSorting: true,
            appendAttributeHash: false,
            getRoleAttributes: () => this.edgeRouterRoleAttributes,
            getNamedAttributes: () => [],
            getSelectedRoleAttributes: () => this.selectedEdgeRouterRoleAttributes,
            getSelectedNamedAttributes: () => [],
            setSelectedRoleAttributes: (attributes) => {
                this.selectedEdgeRouterRoleAttributes = attributes;
            },
            setSelectedNamedAttributes: (attributes) => {
                // no-op
            },
            getNamedAttributesMap: () => ({}),
        };

        // O/S icon drawn via CSS from the class name; detail moves to the hover popover.
        const osRenderer = (row) => {
            const os = (row?.data?.versionInfo?.os || '').toLowerCase();
            const ver = (row?.data?.versionInfo?.osVersion || '').toLowerCase();
            let cls = 'other';
            if (ver.includes('windows') || os.includes('windows') || os.includes('mingw')) cls = 'windows';
            else if (os.includes('darwin')) cls = 'apple';
            else if (os.includes('linux')) cls = 'linux';
            else if (os.includes('android')) cls = 'android';
            return `<span class="os ${cls}"></span>`;
        };

        const enrollmentTokenFormatter = (row) => {
            const token = row?.data?.enrollmentToken;
            if (!token) {
                return '';
            }
            return moment(row?.data?.enrollmentExpiresAt).isBefore() ? 'Enrollment Expired' : token;
        };

        const advertiseFormatter = (row) => {
            const protocols = row?.data?.supportedProtocols;
            if (!protocols) {
                return '';
            }
            return Object.values(protocols).filter(Boolean).join(' | ');
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
                width: 300,
            },
            {
                key: 'os',
                field: 'os',
                label: 'O/S',
                width: 100,
                cellHtml: osRenderer,
                tooltip: OsInfoTooltipComponent,
                tooltipInputs: (ctx) => ({row: ctx.row}),
                resizable: true,
                cellClass: 'nf-cell-vert-align lt-cell-center',
            },
            {
                key: 'roleAttributes',
                field: 'roleAttributes',
                label: 'Roles',
                filterType: 'ATTRIBUTE',
                headerParams: edgeRouterRolesHeaderComponentParams,
                cell: AttributeCellComponent,
                cellInputs: (ctx) => ({
                    attributes: ctx.row?.roleAttributesDisplay ?? ctx.row?.roleAttributes,
                    field: ctx.colId,
                    filterLabel: 'Roles',
                }),
                onCellClick: openForm,
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                sortable: false,
            },
            {
                key: 'verified',
                field: 'isVerified',
                label: 'Verified',
                cell: BooleanCellComponent,
                cellInputs: (ctx) => ({value: ctx.value, trueLabel: 'Verified'}),
                width: 100,
                sortable: true,
                onSort: this.sort.bind(this),
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
                hidden: true,
            },
            {
                key: 'jwt',
                field: 'enrollmentJwt',
                label: 'JWT',
                cell: TokenCellComponent,
                // Routers enroll via JWT/re-enroll, not QR codes or re-issue (those are
                // identity-only), so give the cell router-appropriate actions.
                cellInputs: (ctx) => ({
                    row: ctx.row,
                    emitAction: ctx.emitAction,
                    availableActions: [
                        {label: 'Download JWT', action: 'download-enrollment', icon: 'icon-download-jwt'},
                    ],
                    expiredActions: [
                        {label: 'Re-Enroll', action: 're-enroll', icon: 'icon-refresh'},
                    ],
                }),
                resizable: true,
                cellClass: 'nf-cell-vert-align',
            },
            {
                key: 'hostname',
                field: 'hostname',
                label: 'Host Name',
                filterType: 'TEXTINPUT',
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                hidden: true,
            },
            {
                key: 'version',
                field: 'versionInfo.version',
                label: 'Router Version',
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                hidden: true,
            },
            {
                key: 'supportedProtocols',
                field: 'supportedProtocols',
                label: 'Advertise Address',
                valueFormatter: advertiseFormatter,
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                hidden: true,
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
        return super.getTableData('edge-routers', this.paging, filters, sort)
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

    public getEdgeRouterRoleAttributes() {
        return this.zitiService.get('edge-router-role-attributes', {}, []).then((result: any) => {
            this.edgeRouterRoleAttributes = result.data;
            return result;
        });
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
                return this.zitiService.post(`edge-routers/${router.id}/re-enroll`, {}, true).then((result) => {
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

    public openUpdate(item?: any) {
        this.modalType = 'edge-router';
        if (item) {
            this.selectedEdgeRouter = item;
            this.selectedEdgeRouter.badges = [];
            if (this.selectedEdgeRouter.isOnline) {
                this.selectedEdgeRouter.badges.push({label: 'Online', class: 'online', circle: 'true'});
            } else {
                this.selectedEdgeRouter.badges.push({label: 'Offline', class: 'offline', circle: 'false'});
            }
            if (!this.selectedEdgeRouter.isVerified) {
                this.selectedEdgeRouter.badges.push({label: 'Unverified', class: 'unreg'});
            }
            // TODO: implement when metrics and dialog features are available
            /*this.selectedEdgeRouterZ.moreActions = [
                {name: 'open-metrics', label: 'Open Metrics'},
                {name: 'dial-logs', label: 'Dial Logs'},
                {name: 'dial-logs', label: 'View Events'},
            ];*/
            unset(this.selectedEdgeRouter, '_links');
        } else {
            this.selectedEdgeRouter = new EdgeRouter();
        }
        this.sideModalOpen = true;
    }
}
