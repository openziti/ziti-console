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
import {EdgeRouterPolicy} from "../../models/edge-router-policy";
import {unset} from "lodash";
import {GrowlerModel} from "../../features/messaging/growler.model";
import {GrowlerService} from "../../features/messaging/growler.service";
import {MatDialog} from "@angular/material/dialog";
import {SettingsServiceClass} from "../../services/settings-service.class";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../features/extendable/extensions-noop.service";
import {ActivatedRoute, Router} from "@angular/router";
import {TableCellNameComponent} from "../../features/data-table/cells/table-cell-name/table-cell-name.component";

const CSV_COLUMNS = [
    {label: 'Name', path: 'name'},
    {label: 'Created At', path: 'createdAt'}
];

@Injectable({
    providedIn: 'root'
})
export class EdgeRouterPoliciesPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;
    public modalType = 'edge-router-policy';

    serviceType = '';
    selectedEdgeRouterPolicy: any = new EdgeRouterPolicy();

    routerRoleAttributes = [];
    routerNamedAttributes = [];
    routerNamedAttributesMap = {};
    selectedRouterRoleAttributes = [];
    selectedRouterNamedAttributes = [];

    identityRoleAttributes = [];
    identityNamedAttributes = [];
    identityNamedAttributesMap = {};
    selectedIdentityRoleAttributes = [];
    selectedIdentityNamedAttributes = [];

    postureRoleAttributes = [];
    postureNamedAttributes = [];
    postureNamedAttributesMap = {};
    selectedPostureRoleAttributes = [];
    selectedPostureNamedAttributes = [];

    columnFilters: any = {
        name: '',
        os: '',
        createdAt: '',
    };

    override menuItems = [
        {name: 'Edit', action: 'update'},
        {name: 'Delete', action: 'delete'},
    ]

    override tableHeaderActions = [
        {name: 'Download All', action: 'download-all'},
        {name: 'Download Selected', action: 'download-selected'},
    ]

    resourceType = 'edge-router-policies';
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
        this.filterService.filtersChanged.subscribe(filters => {
            let routerFilter, identityFilter, postureFilter;
            filters.forEach((filter) => {
                switch (filter.columnId) {
                    case 'edgeRouterRoles':
                        routerFilter = true;
                        break;
                    case 'identityRoles':
                        identityFilter = true;
                        break;
                    case 'postureRoles':
                        postureFilter = true;
                        break;
                }
            });
            if (!routerFilter) {
                this.selectedRouterRoleAttributes = [];
                this.selectedRouterNamedAttributes = [];
            }
            if (!identityFilter) {
                this.selectedIdentityRoleAttributes = [];
                this.selectedIdentityNamedAttributes = [];
            }
        });
    }

    validate = (formData): Promise<CallbackResults> => {
        return Promise.resolve({ passed: true});
    }

    initTableColumns(): any {
        const createdAtHeaderComponentParams = {
            filterType: 'DATETIME',
        };
        const self = this;
        const routerRolesHeaderComponentParams = {
            filterType: 'ATTRIBUTE',
            enableSorting: true,
            getRoleAttributes: () => {
                return self.routerRoleAttributes;
            },
            getNamedAttributes: () => {
                return self.routerNamedAttributes;
            },
            getSelectedRoleAttributes: () => {
                return self.selectedRouterRoleAttributes;
            },
            getSelectedNamedAttributes: () => {
                return self.selectedRouterNamedAttributes;
            },
            setSelectedRoleAttributes: (attributes) => {
                self.selectedRouterRoleAttributes = attributes;
            },
            setSelectedNamedAttributes: (attributes) => {
                self.selectedRouterNamedAttributes = attributes;
            },
            getNamedAttributesMap: () => {
                return self.routerNamedAttributesMap;
            }
        };
        const identityRolesHeaderComponentParams = {
            filterType: 'ATTRIBUTE',
            enableSorting: true,
            getRoleAttributes: () => {
                return self.identityRoleAttributes;
            },
            getNamedAttributes: () => {
                return self.identityNamedAttributes;
            },
            getSelectedRoleAttributes: () => {
                return self.selectedIdentityRoleAttributes;
            },
            getSelectedNamedAttributes: () => {
                return self.selectedIdentityNamedAttributes;
            },
            setSelectedRoleAttributes: (attributes) => {
                self.selectedIdentityRoleAttributes = attributes;
            },
            setSelectedNamedAttributes: (attributes) => {
                self.selectedIdentityNamedAttributes = attributes;
            },
            getNamedAttributesMap: () => {
                return self.identityNamedAttributesMap;
            }
        };

        const postureRolesHeaderComponentParams = {
            filterType: 'ATTRIBUTE',
            enableSorting: true,
            getRoleAttributes: () => {
                return self.postureRoleAttributes;
            },
            getNamedAttributes: () => {
                return self.postureNamedAttributes;
            },
            getSelectedRoleAttributes: () => {
                return self.selectedPostureRoleAttributes;
            },
            getSelectedNamedAttributes: () => {
                return self.selectedPostureNamedAttributes;
            },
            setSelectedRoleAttributes: (attributes) => {
                self.selectedPostureRoleAttributes = attributes;
            },
            setSelectedNamedAttributes: (attributes) => {
                self.selectedPostureNamedAttributes = attributes;
            },
            getNamedAttributesMap: () => {
                return self.postureNamedAttributesMap;
            }
        };

        const semanticHeaderComponentParams = {
            filterType: 'SELECT',
            enableSorting: true,
            filterOptions: [
                { label: 'Any Of', value: 'AnyOf', columnId: 'semantic'},
                { label: 'All Of', value: 'AllOf', columnId: 'semantic' },
            ],
            getFilterOptions: () => {
                return semanticHeaderComponentParams.filterOptions;
            }
        };

        const typeHeaderComponentParams = {
            filterType: 'SELECT',
            enableSorting: true,
            filterOptions: [
                { label: 'Dial', value: 'Dial', columnId: 'type' },
                { label: 'Bind', value: 'Bind', columnId: 'type' },
            ],
            getFilterOptions: () => {
                return typeHeaderComponentParams.filterOptions;
            }
        };

        return [
            {
                colId: 'name',
                field: 'name',
                headerName: 'Name',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                cellRenderer: TableCellNameComponent,
                cellRendererParams: { pathRoot: 'router-policies/' },
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.serviceType = 'advanced';
                    this.openEditForm(data.data.id);
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
                colId: 'edgeRouterRoles',
                field: 'edgeRouterRoles',
                headerName: 'Router Attributes',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: routerRolesHeaderComponentParams,
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.serviceType = '';
                    this.openEditForm(data.data.id);
                },
                resizable: true,
                cellRenderer: this.rolesRenderer,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: false,
                filter: false,
            },
            {
                colId: 'identityRoles',
                field: 'identityRoles',
                headerName: 'Identity Attributes',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: identityRolesHeaderComponentParams,
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.serviceType = '';
                    this.openEditForm(data.data.id);
                },
                resizable: true,
                cellRenderer: this.rolesRenderer,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: false,
                filter: false,
            },
            {
                colId: 'semantic',
                field: 'semantic',
                headerName: 'Semantic',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: semanticHeaderComponentParams,
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.serviceType = '';
                    this.openEditForm(data.data.id);
                },
                resizable: true,
                cellRenderer: (row) => {
                    return row.data?.semantic === 'AnyOf' ? 'Any Of' : 'All Of';
                },
                cellClass: 'nf-cell-vert-align tCol',
                width: 100,
            },
            {
                colId: 'createdAt',
                field: 'createdAt',
                headerName: 'Created At',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: createdAtHeaderComponentParams,
                valueFormatter: this.createdAtFormatter,
                resizable: true,
                sortable: true,
                sortColumn: this.sort.bind(this),
                cellClass: 'nf-cell-vert-align tCol',
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.serviceType = '';
                    this.openEditForm(data.data.id);
                },
                hide: true
            }
        ];
    }

    getData(filters?: FilterObj[], sort?: any, page?: any): Promise<any> {
        // we can customize filters or sorting here before moving on...
        this.paging.page = page || this.paging.page;
        return super.getTableData('edge-router-policies', this.paging, filters, sort)
            .then((results: any) => {
                return this.processData(results);
            });
    }

    private processData(results: any) {
        if (!isEmpty(results?.data)) {
            //pre-process data before rendering
            results.data = this.addActionsPerRow(results);
        }
        if (!isEmpty(results?.meta?.pagination)) {
            this.totalCount = results.meta?.pagination.totalCount;
        }
        return results;
    }

    private addActionsPerRow(results: any): any[] {
        return results.data.map((row) => {
            row.actionList = ['update', 'delete'];
            return row;
        });
    }

    public getEdgeRouterRoleAttributes() {
        return this.zitiService.get('edge-router-role-attributes', {}, []).then((result) => {
            this.routerRoleAttributes = result.data;
            return result;
        });
    }

    public getIdentityNamedAttributes() {
        return this.zitiService.get('identities', {}, []).then((result) => {
            const namedAttributes = result.data.map((identity) => {
                this.identityNamedAttributesMap[identity.name] = identity.id;
                return identity.name;
            });
            this.identityNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

    public getServiceNamedAttributes() {
        return this.zitiService.get('edge-routers', {}, []).then((result) => {
            const namedAttributes = result.data.map((router) => {
                this.routerNamedAttributesMap[router.name] = router.id;
                return router.name;
            });
            this.routerNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

    public getIdentityRoleAttributes() {
        return this.zitiService.get('identity-role-attributes', {}, []).then((result) => {
            this.identityRoleAttributes = result.data;
            return result;
        });
    }

    public getPostureNamedAttributes() {
        return this.zitiService.get('posture-checks', {}, []).then((result) => {
            const namedAttributes = result.data.map((postureCheck) => {
                this.postureNamedAttributesMap[postureCheck.name] = postureCheck.id;
                return postureCheck.name;
            });
            this.postureNamedAttributes = namedAttributes;
            return namedAttributes;
        });
    }

    downloadAllItems() {
        const paging = cloneDeep(this.paging);
        paging.total = this.totalCount;
        super.getTableData('edge-router-policies', paging, undefined, undefined)
            .then((results: any) => {
                return this.downloadItems(results?.data);
            });
    }

    downloadItems(selectedItems) {
        this.csvDownloadService.download(
            'edge-router-policies',
            selectedItems,
            CSV_COLUMNS,
            false,
            false,
            undefined,
            false
        );
    }

    public openUpdate(item?: any) {
        this.modalType = 'edge-router-policies';
        if (item) {
            this.selectedEdgeRouterPolicy = item;
            this.selectedEdgeRouterPolicy.badges = [];
            unset(this.selectedEdgeRouterPolicy, '_links');
        } else {
            this.selectedEdgeRouterPolicy = new EdgeRouterPolicy();
        }
        this.sideModalOpen = true;
    }
}
