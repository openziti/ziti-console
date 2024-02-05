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
import {Identity} from "../../models/identity";
import {unset} from "lodash";
import {ITooltipAngularComp} from "ag-grid-angular";
import {ITooltipParams} from "ag-grid-community";
import {OSTooltipComponent} from "../../features/data-table/tooltips/os-tooltip.component";
import {SDKTooltipComponent} from "../../features/data-table/tooltips/sdk-tooltip.component";
import {GrowlerModel} from "../../features/messaging/growler.model";
import {GrowlerService} from "../../features/messaging/growler.service";
import {ResetEnrollmentComponent} from "../../features/reset-enrollment/reset-enrollment.component";
import {MatDialog} from "@angular/material/dialog";
import {SettingsServiceClass} from "../../services/settings-service.class";

const CSV_COLUMNS = [
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

@Injectable({
    providedIn: 'root'
})
export class IdentitiesPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;
    public sideModalOpen = false;
    public modalType = 'identity';

    selectedIdentity: any = new Identity();
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
        {name: 'Reissue Enrollment', action: 'reissue-enrollment'},
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
                <span class="circle ${row?.data?.hasApiSession}" title="Api Session"></span>
                <span class="circle ${row?.data?.hasEdgeRouterConnection}" title="Edge Router Connected"></span>
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
                sortDir: 'asc',
                width: 300,
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
                valueFormatter: createdAtFormatter,
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
            }
        ];
    }

    getData(filters?: FilterObj[], sort?: any, page?: any): Promise<any> {
        // we can customize filters or sorting here before moving on...
        this.paging.page = page || this.paging.page;
        return super.getTableData('identities', this.paging, filters, sort)
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
            row.actionList = ['update', 'override', 'delete'];
            if (this.hasEnrolmentToken(row)) {
                row.actionList.push('reissue-enrollment');
                if (!this.enrollmentExpired(row)) {
                    row.actionList.push('download-enrollment');
                    row.actionList.push('qr-code');
                }
            } else if (this.hasAuthenticator(row)) {
                row.actionList.push('reset-enrollment');
            }
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

    downloadAllItems() {
        const paging = cloneDeep(this.paging);
        paging.total = 2000;
        super.getTableData('identities', paging, undefined, undefined)
            .then((results: any) => {
                return this.downloadItems(results?.data);
            });
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

    downloadItems(selectedItems) {
        this.csvDownloadService.download(
            'identities',
            selectedItems,
            CSV_COLUMNS,
            false,
            false,
            undefined,
            false
        );
    }

    public openUpdate(item?: any) {
        this.modalType = 'identity';
        if (item) {
            this.selectedIdentity = item;
            this.selectedIdentity.badges = [];
            if (this.selectedIdentity.hasApiSession || this.selectedIdentity.hasEdgeRouterConnection) {
                this.selectedIdentity.badges.push({label: 'Online', class: 'online', circle: 'true'});
            } else {
                this.selectedIdentity.badges.push({label: 'Offline', class: 'offline', circle: 'false'});
            }
            if (this.selectedIdentity.enrollment?.ott) {
                this.selectedIdentity.badges.push({label: 'Unregistered', class: 'unreg'});
            }
            // TODO: implement when metrics and dialog features are available
            /*this.selectedIdentity.moreActions = [
                {name: 'open-metrics', label: 'Open Metrics'},
                {name: 'dial-logs', label: 'Dial Logs'},
                {name: 'dial-logs', label: 'View Events'},
            ];*/
            unset(this.selectedIdentity, '_links');
        } else {
            this.selectedIdentity = new Identity();
        }
        this.sideModalOpen = true;
    }

    public openOverridesModal(item) {
        this.modalType = 'overrides';
        this.selectedIdentity = item;
        this.sideModalOpen = true;
    }
}
