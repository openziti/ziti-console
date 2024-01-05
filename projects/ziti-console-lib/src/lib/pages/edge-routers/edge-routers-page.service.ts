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

const CSV_COLUMNS = [
    {label: 'Name', path: 'name'},
    {label: 'OS', path: 'versionInfo.os'},
    {label: 'Attributes', path: 'envInfo.osVersion'},
    {label: 'Verified', path: 'sdkInfo.version'},
    {label: 'Online', path: 'isOnline'},
    {label: 'Created', path: 'createdAt'},
    {label: 'Token', path: 'enrollmentToken'},
];

@Injectable({
    providedIn: 'root'
})
export class EdgeRoutersPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;
    public sideModalOpen = false;
    public modalType = 'edge-router';

    selectedEdgeRouter: any = new EdgeRouter();
    columnFilters: any = {
        name: '',
        os: '',
        createdAt: '',
    };

    override menuItems = [
        {name: 'Edit', action: 'update'},
        {name: 'Download JWT', action: 'download-enrollment'},
        {name: 'View QR', action: 'qr-code'},
        {name: 'Reset Enrollment', action: 'reset-enrollment'},
        {name: 'Override', action: 'override'},
        {name: 'Delete', action: 'delete'},
    ]

    override tableHeaderActions = [
        {name: 'Download All', action: 'download-all'},
        {name: 'Download Selected', action: 'download-selected'},
    ]

    constructor(
        @Inject(SETTINGS_SERVICE) settings: SettingsServiceClass,
        filterService: DataTableFilterService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        override csvDownloadService: CsvDownloadService,
        private growlerService: GrowlerService,
        private dialogForm: MatDialog,
    ) {
        super(settings, filterService, csvDownloadService);
    }

    validate = (formData): Promise<CallbackResults> => {
        return Promise.resolve({ passed: true});
    }

    initTableColumns(): any {
        const nameRenderer = (row) => {
            return `<div class="col cell-name-renderer" data-id="${row?.data?.id}">
                <span class="circle ${row?.data?.isVerified}" title="Verified Status"></span>
                <span class="circle ${row?.data?.isOnline}" title="Online Status"></span>
                <strong>${row?.data?.name}</strong>
              </div>`
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

        const createdAtFormatter = (row) => {
            return moment(row?.data?.createdAt).local().format('M/D/YYYY H:MM A');
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

        return [
            {
                colId: 'name',
                field: 'name',
                headerName: 'Name',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                onCellClicked: (data) => {
                    this.openUpdate(data.data);
                },
                resizable: true,
                cellRenderer: nameRenderer,
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
                colId: 'roles',
                field: 'roleAttributes',
                headerName: 'Roles',
                headerComponent: TableColumnDefaultComponent,
                onCellClicked: (data) => {
                    this.openUpdate(data.data);
                },
                resizable: true,
                cellRenderer: rolesRenderer,
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
                valueFormatter: createdAtFormatter,
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
            }
        ];
    }

    getData(filters?: FilterObj[], sort?: any): Promise<any> {
        // we can customize filters or sorting here before moving on...
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
            row.actionList = ['update', 'delete'];
            if (this.hasEnrolmentToken(row)) {
                row.actionList.push('download-enrollment');
            }
            return row;
        });
    }

    hasEnrolmentToken(item) {
        return !isEmpty(item?.enrollmentJwt);
    }

    public getEdgeRouterRoleAttributes() {
        return this.zitiService.get('edge-router-role-attributes', {}, []);
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

    downloadAllItems() {
        const paging = cloneDeep(this.paging);
        paging.total = 2000;
        super.getTableData('edge-routers', paging, undefined, undefined)
            .then((results: any) => {
                return this.downloadItems(results?.data);
            });
    }

    downloadItems(selectedItems) {
        this.csvDownloadService.download(
            'edge-routers.csv',
            selectedItems,
            CSV_COLUMNS,
            false,
            false,
            undefined,
            false
        );
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
