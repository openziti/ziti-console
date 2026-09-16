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
import {Identity} from "../../models/identity";
import {unset} from "lodash";
import {OSTooltipComponent} from "../../features/data-table/tooltips/os-tooltip.component";
import {SDKTooltipComponent} from "../../features/data-table/tooltips/sdk-tooltip.component";
import {GrowlerModel} from "../../features/messaging/growler.model";
import {GrowlerService} from "../../features/messaging/growler.service";
import {ResetEnrollmentComponent} from "../../features/reset-enrollment/reset-enrollment.component";
import {MatDialog} from "@angular/material/dialog";
import {SettingsServiceClass} from "../../services/settings-service.class";
import {ExtensionService} from "../../features/extendable/extensions-noop.service";
import {IDENTITY_EXTENSION_SERVICE} from "../../features/projectable-forms/identity/identity-form.service";
import {Router} from "@angular/router";
import {TableCellNameComponent} from "../../features/data-table/cells/table-cell-name/table-cell-name.component";
import {ConfirmComponent} from "../../features/confirm/confirm.component";
import {ListColumn} from "../../features/list-table/list-column";
import {NameCellComponent} from "../../features/list-table/name-cell/name-cell.component";
import {OsInfoTooltipComponent} from "../../features/list-table/os-info-tooltip/os-info-tooltip.component";
import {SdkInfoTooltipComponent} from "../../features/list-table/sdk-info-tooltip/sdk-info-tooltip.component";
import {BooleanCellComponent} from "../../features/list-table/boolean-cell/boolean-cell.component";
import {TokenCellComponent} from "../../features/list-table/token-cell/token-cell.component";

@Injectable({
    providedIn: 'root'
})
export class IdentitiesPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;
    public modalType = 'identities';

    override CSV_COLUMNS = [
        {label: 'Name', path: 'name'},
        {label: 'Roles', path: 'roleAttributes'},
        {label: 'Online', path: 'hasApiSession'},
        {label: 'Edge Router Connected', path: 'hasEdgeRouterConnection'},
        {label: 'OS', path: 'envInfo.os'},
        {label: 'OS Version', path: 'envInfo.osVersion'},
        {label: 'SDK', path: 'sdkInfo.version'},
        {label: 'App Version', path: 'sdkInfo.appVersion'},
        {label: 'Type', path: 'typeId'},
        {label: 'Is Admin', path: 'isAdmin'},
        {label: 'Auth Policy', path: 'authPolicy.name'},
        {label: 'Auth Policy ID', path: 'authPolicy.id'},
        {label: 'MFA Enabled', path: 'isMfaEnabled'},
        {label: 'Created At', path: 'createdAt'},
        {label: 'ID', path: 'id'},
    ];

    identityRoleAttributes: any[] = [];
    selectedIdentityRoleAttributes: any[] = [];
    selectedIdentity: any = new Identity();
    columnFilters: any = {
        name: '',
        os: '',
        createdAt: '',
    };

    // `icon` (SVG markup) makes the new list-table render the action as an inline icon;
    // items without one fall into its kebab overflow. The legacy ag-grid menu ignores it.
    override menuItems = [
        {name: 'Edit', action: 'update', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M11.2 2.6 13.4 4.8 6 12.2l-2.8.6.6-2.8z"/></svg>'},
        {name: 'Download JWT', action: 'download-enrollment', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M8 2.5v7M5 6.6 8 9.6l3-3M3.2 12.6h9.6"/></svg>'},
        {name: 'View QR', action: 'qr-code', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><g fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2.5" y="2.5" width="4" height="4" rx="0.5"/><rect x="9.5" y="2.5" width="4" height="4" rx="0.5"/><rect x="2.5" y="9.5" width="4" height="4" rx="0.5"/></g><rect x="10" y="10" width="3.5" height="3.5" fill="currentColor"/></svg>'},
        {name: 'Visualizer', action: 'identity-service-path', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" d="M5.4 7.3 10.6 4.6M5.4 8.7l5.2 2.7"/><circle cx="4" cy="8" r="1.8" fill="currentColor"/><circle cx="12" cy="4" r="1.8" fill="currentColor"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/></svg>'},
        {name: 'Reset Enrollment', action: 'reset-enrollment', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M3.2 8a4.8 4.8 0 1 0 1.3-3.3"/><path fill="currentColor" d="M2.8 2.8l-.3 2.9 2.8-.4z"/></svg>'},
        {name: 'Reissue Enrollment', action: 'reissue-enrollment', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M12.8 8a4.8 4.8 0 1 1-1.3-3.3"/><path fill="currentColor" d="M13.2 2.8l.3 2.9-2.8-.4z"/></svg>'},
        {name: 'Reset MFA', action: 'reset-mfa', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" d="M8 2.3 12.8 4v3.8c0 3-2.1 4.9-4.8 5.9-2.7-1-4.8-2.9-4.8-5.9V4z"/></svg>'},
        {name: 'Override', action: 'override', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" d="M2.8 5h10.4M2.8 11h10.4"/><circle cx="6" cy="5" r="1.7" fill="currentColor"/><circle cx="10" cy="11" r="1.7" fill="currentColor"/></svg>'},
        {name: 'Delete', action: 'delete', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M3.4 4.6h9.2M6.4 4.6V3.2h3.2v1.4M4.6 4.6 5 13h6l.4-8.4"/></svg>'},
    ];

    override tableHeaderActions = [
        {name: 'Download All', action: 'download-all'},
    ]

    resourceType = 'identities';
    constructor(
        @Inject(SETTINGS_SERVICE) settings: SettingsServiceClass,
        filterService: DataTableFilterService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        override csvDownloadService: CsvDownloadService,
        private growlerService: GrowlerService,
        private dialogForm: MatDialog,
        @Inject(IDENTITY_EXTENSION_SERVICE) private extService: ExtensionService,
        protected override router: Router
    ) {
        super(settings, filterService, csvDownloadService, extService, router);
        this.filterService.filtersChanged.subscribe(filters => {
            let identityFilter;
            filters.forEach((filter) => {
                switch (filter.columnId) {
                    case 'identityRoles':
                        identityFilter = true;
                        break;
                }
            });
            if (!identityFilter) {
                this.selectedIdentityRoleAttributes = [];
            }
        });
    }

    validate = (formData): Promise<CallbackResults> => {
        return Promise.resolve({ passed: true});
    }

    initTableColumns(): any {
        this.initMenuActions();
        const self = this;
        const identityRolesHeaderComponentParams = {
            filterType: 'ATTRIBUTE',
            enableSorting: true,
            appendAttributeHash: false,
            getRoleAttributes: () => {
                return self.identityRoleAttributes;
            },
            getNamedAttributes: () => {
                return [];
            },
            getSelectedRoleAttributes: () => {
                return self.selectedIdentityRoleAttributes;
            },
            getSelectedNamedAttributes: () => {
                return [];
            },
            setSelectedRoleAttributes: (attributes) => {
                self.selectedIdentityRoleAttributes = attributes;
            },
            setSelectedNamedAttributes: (attributes) => {
                // no-op
            },
            getNamedAttributesMap: () => {
                return {};
            }
        };
        const nameRenderer = (row) => {
            return `<a href="./identities/${row?.data?.id}">
                        <div class="col cell-name-renderer" data-id="${row?.data?.id}">
                            <span class="circle ${row?.data?.hasApiSession}" title="Api Session"></span>
                            <span class="circle ${row?.data?.hasEdgeRouterConnection}" title="Edge Router Connected"></span>
                            <strong>${row?.data?.name}</strong>
                        </div>
                    </a>`;
        }

        const osRenderer = (row) => {
            let os = "other";
            let osDetails = "";
            if (row?.data?.envInfo) {
                if (row?.data?.envInfo?.osVersion&&row?.data?.envInfo?.osVersion.toLowerCase().indexOf("windows")>=0) os = "windows";
                else {
                    if (row?.data?.envInfo?.os&&row?.data?.envInfo?.os.toLowerCase().indexOf("darwin")>=0) os = "apple";
                    else if (row?.data?.envInfo?.os&&row?.data?.envInfo?.os.toLowerCase().indexOf("linux")>=0) os = "linux";
                    else if (row?.data?.envInfo?.os&&row?.data?.envInfo?.os.toLowerCase().indexOf("android")>=0) os = "android";
                    else if (row?.data?.envInfo?.os&&row?.data?.envInfo?.os.toLowerCase().indexOf("windows")>=0) os = "windows";
                }
                if (row?.data?.envInfo?.os) osDetails += "OS: "+row?.data?.envInfo?.os;
                if (row?.data?.envInfo?.arch) osDetails += "&#10;Arch: "+row?.data?.envInfo?.arch;
                if (row?.data?.envInfo?.osRelease) osDetails += "&#10;Release: "+row?.data?.envInfo?.osRelease;
                if (row?.data?.envInfo?.osVersion) osDetails += "&#10;Version: "+row?.data?.envInfo?.osVersion;
            }
            return `<div class="col desktop" style="overflow: unset;">
                <span class="os ${os}"></span>
              </div>`
        }

        const sdkRenderer = (row) => {
            let sdk = "";
            let version = "-";
            const sdkInfo = row?.data?.sdkInfo;
            if (sdkInfo) {
                version = "";
                if (sdkInfo?.version) version += sdkInfo?.version;
                if (sdkInfo?.appId) sdk += sdkInfo?.appId;
                if (sdkInfo?.appVersion) sdk += sdkInfo?.appVersion;
                if (sdkInfo?.type) sdk += sdkInfo?.type;
                if (sdkInfo?.type) sdk += "&#10;"+sdkInfo?.branch;
                if (sdkInfo?.revision) sdk += " - "+sdkInfo?.revision;
            }
            return`<div class="col desktop" data-id="${row?.data?.id}" style="overflow: unset;" data-balloon-pos="up" aria-label="${sdk}">
                <span class="oneline">${version}</span>
             </div>`;
        }

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

        const isAdminHeaderComponentParams = {
            filterType: 'SELECT',
            enableSorting: true,
            filterOptions: [
                { label: 'All', value: '' },
                { label: 'Admins', value: true },
                { label: 'Non-Admins', value: false },
            ]
        };

        let tableColumns = [
            {
                colId: 'name',
                field: 'name',
                headerName: 'Name',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                cellRenderer: TableCellNameComponent,
                cellRendererParams: { pathRoot: this.basePath, showIdentityIcons: true },
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
                sortDir: 'asc',
                width: 300,
            },
            {
                colId: 'roleAttributes',
                field: 'roleAttributes',
                headerName: 'Roles',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: identityRolesHeaderComponentParams,
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
                colId: 'os',
                field: 'os',
                headerName: 'O/S',
                width: 100,
                cellRenderer: osRenderer,
                headerComponent: TableColumnDefaultComponent,
                tooltipComponent: OSTooltipComponent,
                tooltipField: 'envInfo',
                tooltipComponentParams: { color: '#ececec' },
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
            },
            {
                colId: 'sdk',
                field: 'sdk',
                headerName: 'SDK',
                tooltipField: 'sdkInfo',
                cellRenderer: sdkRenderer,
                headerComponent: TableColumnDefaultComponent,
                tooltipComponent: SDKTooltipComponent,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                width: 125,
            },
            {
                colId: 'type',
                field: 'type.name',
                headerName: 'Type',
                headerComponent: TableColumnDefaultComponent,
                resizable: true,
                sortable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortColumn: this.sort.bind(this),
            },
            {
                colId: 'isAdmin',
                field: 'isAdmin',
                headerName: 'Is Admin',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: isAdminHeaderComponentParams,
                resizable: true,
                sortable: true,
                sortColumn: this.sort.bind(this),
                cellClass: 'nf-cell-vert-align tCol',
                width: 100,
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
                colId: 'token',
                field: 'token',
                headerName: 'Token',
                headerComponent: TableColumnDefaultComponent,
                cellRenderer: 'cellTokenComponent',
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
            },
            {
                colId: 'isMfaEnabled',
                field: 'isMfaEnabled',
                headerName: 'MFA',
                headerComponent: TableColumnDefaultComponent,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                width: 100,
            },
            this.ID_COLUMN_DEF
        ];
        if (this.extService.processTableColumns) {
            tableColumns = this.extService.processTableColumns(tableColumns);
        }
        return tableColumns;
    }

    /**
     * Column set for the new `lib-list-table` (the "beta" Identities page). Mirrors
     * {@link initTableColumns} but emits the declarative `ListColumn` shape instead of
     * ag-grid `ColDef`s: component cells via `cell`/`cellInputs`, legacy string
     * renderers via `cellHtml`, and header filters declared with `filterType`.
     * Loaded by {@link IdentitiesPageComponent} when the Beta Features toggle is on;
     * the legacy {@link initTableColumns} above is left untouched for the ag-grid table.
     */
    initListTableColumns(): ListColumn[] {
        this.initMenuActions();
        const identityRolesHeaderComponentParams = {
            filterType: 'ATTRIBUTE',
            enableSorting: true,
            appendAttributeHash: false,
            getRoleAttributes: () => this.identityRoleAttributes,
            getNamedAttributes: () => [],
            getSelectedRoleAttributes: () => this.selectedIdentityRoleAttributes,
            getSelectedNamedAttributes: () => [],
            setSelectedRoleAttributes: (attributes) => {
                this.selectedIdentityRoleAttributes = attributes;
            },
            setSelectedNamedAttributes: (attributes) => {
                // no-op
            },
            getNamedAttributesMap: () => ({}),
        };

        const osRenderer = (row) => {
            const os = (row?.data?.envInfo?.os || '').toLowerCase();
            const ver = (row?.data?.envInfo?.osVersion || '').toLowerCase();
            let cls = 'other';
            if (ver.includes('windows') || os.includes('windows') || os.includes('mingw')) cls = 'windows';
            else if (os.includes('darwin')) cls = 'apple';
            else if (os.includes('linux')) cls = 'linux';
            else if (os.includes('android')) cls = 'android';
            return `<span class="os ${cls}"></span>`;
        };

        const sdkRenderer = (row) => {
            // detail moves to the hover popover (SdkInfoTooltipComponent); the cell
            // just shows the version, so drop the legacy balloon attributes
            const version = row?.data?.sdkInfo?.version || '-';
            return `<span class="oneline">${version}</span>`;
        };

        const isAdminHeaderComponentParams = {
            filterType: 'SELECT',
            enableSorting: true,
            filterOptions: [
                { label: 'All', value: '' },
                { label: 'Admins', value: true },
                { label: 'Non-Admins', value: false },
            ]
        };

        // Online when any of the connection signals is live (the status icon is drawn
        // via CSS ::before, since [innerHTML] strips inline <svg>).
        const isOnline = (v: any) => v === true || /online|connected|true/i.test(String(v ?? ''));
        const statusRenderer = (row) => {
            const d = row?.data || {};
            const online = isOnline(d.edgeRouterConnectionStatus) || isOnline(d.hasEdgeRouterConnection) || isOnline(d.hasApiSession);
            return `<span class="lt-status lt-status-${online ? 'online' : 'offline'}">${online ? 'Online' : 'Offline'}</span>`;
        };

        // Color-coded Type pill with an icon: Default = blue, Router = green. Icon drawn
        // via CSS (::before) since [innerHTML] strips inline <svg>.
        const typeBadgeRenderer = (row) => {
            const t = row?.data?.type?.name || row?.data?.type || '';
            const key = String(t).toLowerCase();
            const cls = key === 'router' ? 'lt-type-router'
                : key === 'default' ? 'lt-type-default'
                : 'lt-type-other';
            return `<span class="lt-type-badge ${cls}">${t}</span>`;
        };

        // Light skinned role chips (the legacy rolesRenderer paints
        // heavy dark overlap chips; this stays scoped to the beta page).
        const rolesChipRenderer = (row) => {
            const colId = row?.column?.colId;
            const attrs = row?.data?.[colId + 'Display'] || row?.data?.[colId] || [];
            if (!attrs?.length) {
                return '';
            }
            return attrs.map((attr) => {
                const raw = String(attr?.name ?? attr ?? '').trim();
                if (!raw) {
                    return '';
                }
                // named attributes (@) use the secondary color; role attributes (#)
                // the primary color, matching the tag selector's distinction
                const isNamed = raw.charAt(0) === '@';
                const label = isNamed ? raw : (raw.charAt(0) === '#' ? raw : '#' + raw);
                const cls = isNamed ? 'lt-chip lt-chip-at' : 'lt-chip';
                return `<span class="${cls}">${label}</span>`;
            }).join('');
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
                    // status now lives in its own Status column (skinned), so the
                    // name cell no longer carries the connection dots
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
                sortDir: 'asc',
                width: 300,
            },
            {
                key: 'status',
                field: 'hasEdgeRouterConnection',
                label: 'Status',
                cellHtml: statusRenderer,
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                width: 120,
            },
            {
                key: 'roleAttributes',
                field: 'roleAttributes',
                label: 'Roles',
                filterType: 'ATTRIBUTE',
                headerParams: identityRolesHeaderComponentParams,
                cellHtml: rolesChipRenderer,
                onCellClick: (ctx) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.openEditForm(ctx.row?.id);
                },
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                sortable: false,
            },
            {
                key: 'os',
                field: 'os',
                label: 'O/S',
                width: 100,
                cellHtml: osRenderer,
                tooltip: OsInfoTooltipComponent,
                tooltipInputs: (ctx) => ({row: ctx.row}),
                // envInfo.os is a JSON blob field the controller cannot filter on
                // ("unknown symbol") - no O/S filter control.
                resizable: true,
                cellClass: 'nf-cell-vert-align lt-cell-center',
            },
            {
                key: 'sdk',
                field: 'sdk',
                label: 'SDK',
                cellHtml: sdkRenderer,
                tooltip: SdkInfoTooltipComponent,
                tooltipInputs: (ctx) => ({row: ctx.row}),
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                width: 125,
            },
            {
                key: 'type',
                field: 'type.name',
                label: 'Type',
                filterType: 'SELECT',
                filterField: 'type',
                filterPlaceholder: 'Any type',
                // Only Default + Router exist as identity types in Ziti 2.x (confirmed
                // via /edge/management/v1/identity-types); Service/Device/User are legacy
                // and always return 0.
                filterOptions: [
                    {label: 'Show All', value: ''},
                    {label: 'Default', value: 'Default', chipClass: 'lt-type-badge lt-type-default'},
                    {label: 'Router', value: 'Router', chipClass: 'lt-type-badge lt-type-router'},
                ],
                cellHtml: typeBadgeRenderer,
                resizable: true,
                sortable: true,
                cellClass: 'nf-cell-vert-align',
                onSort: this.sort.bind(this),
            },
            {
                key: 'isAdmin',
                field: 'isAdmin',
                label: 'Is Admin',
                filterType: 'SELECT',
                filterOptions: isAdminHeaderComponentParams.filterOptions,
                cell: BooleanCellComponent,
                cellInputs: (ctx) => ({value: ctx.value, trueLabel: 'Admin'}),
                resizable: true,
                sortable: true,
                onSort: this.sort.bind(this),
                cellClass: 'nf-cell-vert-align',
                width: 100,
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
                key: 'token',
                field: 'token',
                label: 'Token',
                cell: TokenCellComponent,
                cellInputs: (ctx) => ({row: ctx.row, emitAction: ctx.emitAction}),
                resizable: true,
                cellClass: 'nf-cell-vert-align',
            },
            {
                key: 'isMfaEnabled',
                field: 'isMfaEnabled',
                label: 'MFA',
                // isMfaEnabled is a computed field the controller cannot filter on
                // ("unknown symbol") - no MFA filter control.
                cell: BooleanCellComponent,
                cellInputs: (ctx) => ({value: ctx.value, trueLabel: 'Enabled'}),
                resizable: true,
                cellClass: 'nf-cell-vert-align',
                width: 100,
            },
            {
                key: 'id',
                field: 'id',
                label: 'ID',
                filterType: 'TEXTINPUT',
                cellClass: 'nf-cell-vert-align',
                resizable: true,
                sortable: true,
                onSort: this.sort.bind(this),
                onCellClick: (ctx) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.openEditForm(ctx.row?.id);
                },
                hidden: true,
            },
        ];
        if (this.extService.processTableColumns) {
            tableColumns = this.extService.processTableColumns(tableColumns);
        }
        return tableColumns;
    }

    public getIdentityRoleAttributes() {
        return this.zitiService.get('identity-role-attributes', {}, []).then((result) => {
            this.identityRoleAttributes = result.data;
            return result;
        });
    }

    getData(filters?: FilterObj[], sort?: any, page?: any, pageSize?: number): Promise<any> {
        // we can customize filters or sorting here before moving on...
        this.paging.page = page || this.paging.page;
        if (pageSize) {
            this.paging.total = pageSize;
        }
        return super.getTableData('identities', this.paging, filters, sort)
            .then((results: any) => {
                return this.processData(results);
            });
    }

    private async processData(results: any) {
        if (!isEmpty(results?.data)) {
            //pre-process data before rendering
            results.data = this.addActionsPerRow(results);
        }
        if (this.extService?.emitEvent) {
            try {
                const transformed = await this.extService.emitEvent({
                    type: 'tableDataUpdated',
                    data: { resourceType: this.resourceType, results },
                });
                if (transformed !== undefined) {
                    results = transformed;
                }
            } catch (_e) {
                // keep original results on extension failure
            }
        }
        return results;
    }

    private addActionsPerRow(results: any): any[] {
        return results.data.map((row) => {
            row.actionList = ['update', 'override', 'delete', 'identity-service-path'];

            if (this.hasEnrolmentToken(row)) {
                row.actionList.push('reissue-enrollment');
                if (!this.enrollmentExpired(row)) {
                    row.actionList.push('download-enrollment');
                    row.actionList.push('qr-code');
                }
            } else if (this.hasAuthenticator(row)) {
                row.actionList.push('reset-enrollment');
            }
            if (row.isMfaEnabled) {
                row.actionList.push('reset-mfa');
            }
            this.addListItemExtensionActions(row);
            return row;
        });
    }

    hasAuthenticator(item) {
        return item?.authenticators?.cert?.id || item.authenticators?.updb?.id;
    }

    hasEnrolmentToken(item) {
        let token;
        if (item?.enrollment?.ott?.jwt) {
            token = item?.enrollment?.ott?.jwt;
        } else if (item?.enrollment?.ottca?.jwt) {
            token = item?.enrollment?.ottca?.jwt;
        } else if (item?.enrollment?.updb?.jwt) {
            token = item?.enrollment?.updb?.jwt;
        }
        return token;
    }

    enrollmentExpired(item) {
        let expiration;
        if (item?.enrollment?.ott?.jwt) {
            expiration = item?.enrollment?.ott?.expiresAt;
        } else if (item?.enrollment?.ottca?.jwt) {
            expiration = item?.enrollment?.ottca?.expiresAt;
        } else if (item?.enrollment?.updb?.jwt) {
            expiration = item?.enrollment?.updb?.expiresAt;
        }
        return moment(expiration).isBefore();
    }

    public getIdentitiesRoleAttributes() {
        return this.zitiService.get('identity-role-attributes', {}, []);
    }

    public resetMFA(identity) {
        return this.zitiService.resetMFA(identity.id).then(() => {
            const growlerData = new GrowlerModel(
                'success',
                'Success',
                `MFA Reset`,
                `MFA was successfully reset for identity: ${identity.name}`,
            );
            this.growlerService.show(growlerData);
        }).catch((error) => {
            const message = this.zitiService.getErrorMessage(error);
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Failed to Reset MFA`,
                `Attempt to reset MFA failed: ${message}`,
            );
            this.growlerService.show(growlerData);
        });
    }

    getJWT(identity: any) {
        let qrCode;
        if (!isEmpty(identity?.enrollment?.ott?.jwt)) {
            qrCode = identity?.enrollment?.ott?.jwt;
        } else if (!isEmpty(identity?.enrollment?.ottca?.jwt)) {
            qrCode = identity?.enrollment?.ottca?.jwt;
        } else if(!isEmpty(identity?.enrollment?.updb?.jwt)) {
            qrCode = identity?.enrollment?.updb?.jwt;
        }
        return qrCode;
    }

    getToken(identity: any) {
        let qrCode;
        if (!isEmpty(identity?.enrollment?.ott?.token)) {
            qrCode = identity?.enrollment?.ott?.token;
        } else if (!isEmpty(identity?.enrollment?.ottca?.token)) {
            qrCode = identity?.enrollment?.ottca?.token;
        } else if(!isEmpty(identity?.enrollment?.updb?.token)) {
            qrCode = identity?.enrollment?.updb?.token;
        }
        return qrCode;
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

    copyToken(token) {
        navigator.clipboard.writeText(token);
        const growlerData = new GrowlerModel(
            'success',
            'Success',
            `Text Copied`,
            `Registration token copied to clipboard`,
        );
        this.growlerService.show(growlerData);
    }

    resetJWT(identity) {
        this.dialogRef = this.dialogForm.open(ResetEnrollmentComponent, {
            data: {
                identity: identity,
                type: 'reset'
            },
            autoFocus: false,
        });
        return this.dialogRef;
    }

    reissueJWT(identity) {
        this.dialogRef = this.dialogForm.open(ResetEnrollmentComponent, {
            data: {
                identity: identity,
                type: 'reissue'
            },
            autoFocus: false,
        });
        return this.dialogRef;
    }

    getEnrollmentExpiration(identity: any) {
        let expiresAt;
        if (!isEmpty(identity?.enrollment?.ott?.expiresAt)) {
            expiresAt = identity?.enrollment?.ott?.expiresAt;
        } else if (!isEmpty(identity?.enrollment?.ottca?.expiresAt)) {
            expiresAt = identity?.enrollment?.ottca?.expiresAt;
        } else if(!isEmpty(identity?.enrollment?.updb?.expiresAt)) {
            expiresAt = identity?.enrollment?.updb?.expiresAt;
        }
        return expiresAt;
    }

    resetEnrollment(identity: any, date: any) {
        let id = identity?.authenticators?.cert?.id;
        if (!id) {
            if(!isEmpty(identity?.enrollment?.ott)) {
                id = identity?.enrollment?.ott.id;
            } else if(!isEmpty(identity?.enrollment.ottca)) {
                id = identity?.enrollment?.ottca.id;
            } else if (!isEmpty(identity?.enrollment.updb)) {
                id = identity?.enrollment?.updb.id;
            }
        }
        return this.dataService.resetEnrollment(id, date).then(() => {
            const growlerData = new GrowlerModel(
                'success',
                'Success',
                `Enrollment Reset`,
                `Successfully reissued enrollment token`,
            );
            this.growlerService.show(growlerData);
        }).catch((error) => {
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Reset Failed`,
                `Failed to reissues enrollment token`,
            );
            this.growlerService.show(growlerData);
        });
    }

    public openUpdate(itemId?: any) {
        this.modalType = 'identity';
        this.sideModalOpen = true;
    }

    public openOverridesModal(item) {
        this.modalType = 'overrides';
        this.selectedIdentity = item;
        this.sideModalOpen = true;
    }

    public deleteEnrollment(identity) {
      return new Promise((resolve, reject) => {
        const confirmData = {
          appendId: 'DeleteEnrollment',
          title: 'Delete Enrollment',
          message: `Are you sure you would like to delete the enrollment for this Identity?`,
          confirmLabel: 'Yes',
          cancelLabel: 'Oops, no get me out of here',
          showCancelLink: true,
          imageUrl: 'assets/svgs/Growl_Warning.svg',
        };
        this.dialogRef = this.dialogForm.open(ConfirmComponent, {
          data: confirmData,
          autoFocus: false,
        });
        this.dialogRef.afterClosed().subscribe({
          next: (result) => {
            if (!result?.confirmed) {
              resolve(false);
            }
            let enrollmentId;
            if(!isEmpty(identity?.enrollment?.ott)) {
              enrollmentId = identity?.enrollment?.ott.id;
            } else if(!isEmpty(identity?.enrollment.ottca)) {
              enrollmentId = identity?.enrollment?.ottca.id;
            } else if (!isEmpty(identity?.enrollment.updb)) {
              enrollmentId = identity?.enrollment?.updb.id;
            }
            if (result?.confirmed) {
                this.dataService.deleteEnrollment(enrollmentId).then(() => {
                const growlerData = new GrowlerModel(
                    'success',
                    'Success',
                    `Enrollment Deleted`,
                    `Successfully deleted Identity enrollment `,
                );
                this.growlerService.show(growlerData);
                resolve(true);
                }).catch((error) => {
                const growlerData = new GrowlerModel(
                    'error',
                    'Error',
                    `Delete Failed`,
                    `Failed to delete Identity enrollment token`,
                );
                this.growlerService.show(growlerData);
                    reject(error);
                });
            }
          }
        });
      })
    }
}
