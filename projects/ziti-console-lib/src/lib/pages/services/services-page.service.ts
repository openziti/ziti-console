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
import {Service} from "../../models/service";
import {unset} from "lodash";
import {GrowlerModel} from "../../features/messaging/growler.model";
import {GrowlerService} from "../../features/messaging/growler.service";
import {MatDialog} from "@angular/material/dialog";
import {SettingsServiceClass} from "../../services/settings-service.class";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../features/extendable/extensions-noop.service";
import {Router} from "@angular/router";
import {TableCellNameComponent} from "../../features/data-table/cells/table-cell-name/table-cell-name.component";
import {ServicePolicyFormService} from "../../features/projectable-forms/service-policy/service-policy-form.service";
import {SERVICE_EXTENSION_SERVICE} from "../../features/projectable-forms/service/service-form.service";
import {ListColumn} from "../../features/list-table/list-column";
import {NameCellComponent} from "../../features/list-table/name-cell/name-cell.component";
import {AttributeCellComponent} from "../../features/list-table/attribute-cell/attribute-cell.component";

@Injectable({
    providedIn: 'root'
})
export class ServicesPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;
    public modalType = 'service';

    override CSV_COLUMNS = [
        {label: 'Name', path: 'name'},
        {label: 'ID', path: 'id'},
        {label: 'Encryption Required', path: 'encryptionRequired'},
        {label: 'Terminator Strategy', path: 'terminatorStrategy'},
        {label: 'Created At', path: 'createdAt'},
    ]

    serviceType = '';
    selectedService: any = new Service();
    columnFilters: any = {
        name: '',
        os: '',
        createdAt: '',
    };
    roleAttributes: any[] = [];
    selectedRoleAttributes: any[] = [];
    // `icon` (SVG markup) is rendered before the label in the new list-table's row kebab
    // (3-dot) menu. The legacy ag-grid menu ignores it.
    override menuItems = [
        {name: 'Edit', action: 'update', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M11.2 2.6 13.4 4.8 6 12.2l-2.8.6.6-2.8z"/></svg>'},
        {name: 'Delete', action: 'delete', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M3.4 4.6h9.2M6.4 4.6V3.2h3.2v1.4M4.6 4.6 5 13h6l.4-8.4"/></svg>'},
    ]

    override tableHeaderActions = [
        {name: 'Download All', action: 'download-all', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M8 2.5v7M5 6.6 8 9.6l3-3M3.2 12.6h9.6"/></svg>'},
        {name: 'Download Selected', action: 'download-selected', icon: '<svg viewBox="0 0 16 16" width="15" height="15"><path fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" d="M8 2.5v7M5 6.6 8 9.6l3-3M3.2 12.6h9.6"/></svg>'},
    ]

    resourceType = 'services';
    override basePath = '/services/advanced';

    constructor(
        @Inject(SETTINGS_SERVICE) settings: SettingsServiceClass,
        filterService: DataTableFilterService,
        @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
        override csvDownloadService: CsvDownloadService,
        private growlerService: GrowlerService,
        private dialogForm: MatDialog,
        @Inject(SERVICE_EXTENSION_SERVICE) protected override extensionService: ExtensionService,
        protected override router: Router,
        private servicePolicyService: ServicePolicyFormService
    ) {
        super(settings, filterService, csvDownloadService, extensionService, router);
        // drop the attribute column's selected roles when its filter is cleared, so the
        // header dropdown and the applied-filter tag stay in sync (see identities page)
        this.filterService.filtersChanged.subscribe(filters => {
            const hasRoleFilter = (filters || []).some((filter) => filter.columnId === 'roleAttributes');
            if (!hasRoleFilter) {
                this.selectedRoleAttributes = [];
            }
        });
    }

    validate = (formData): Promise<CallbackResults> => {
        return Promise.resolve({ passed: true});
    }

    initTableColumns(): any {
        const rolesRenderer = (row) => {
            let roles = '';
            row?.data?.roleAttributes?.forEach((attr) => {
                roles += '<div class="hashtag">'+attr+'</div>';
            });
            return roles;
        }
        const self = this;
        const serviceRolesHeaderComponentParams = {
            filterType: 'ATTRIBUTE',
            enableSorting: true,
            appendAttributeHash: false,
            getRoleAttributes: () => {
                return self.roleAttributes;
            },
            getNamedAttributes: () => {
                return [];
            },
            getSelectedRoleAttributes: () => {
                return self.selectedRoleAttributes;
            },
            getSelectedNamedAttributes: () => {
                return [];
            },
            setSelectedRoleAttributes: (attributes) => {
                self.selectedRoleAttributes = attributes;
            },
            setSelectedNamedAttributes: (attributes) => {
                // no-op
            },
            getNamedAttributesMap: () => {
                return {};
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
                cellRendererParams: { pathRoot: '/services/advanced' },
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.serviceType = 'advanced';
                    this.openAdvanced(data.data.id);
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
                headerComponentParams: serviceRolesHeaderComponentParams,
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.serviceType = '';
                    this.openAdvanced(data.data.id);
                },
                resizable: true,
                cellRenderer: this.rolesRenderer,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: false,
                filter: false,
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
                onCellClicked: (data) => {
                    if (this.hasSelectedText()) {
                        return;
                    }
                    this.serviceType = '';
                    this.openAdvanced(data.data.id);
                },
            },
            this.ID_COLUMN_DEF
        ];
    }

    // Declarative ListColumn set for the new `lib-list-table` (Beta Features on).
    initListTableColumns(): ListColumn[] {
        this.initMenuActions();
        const serviceRolesHeaderComponentParams = {
            filterType: 'ATTRIBUTE',
            enableSorting: true,
            appendAttributeHash: false,
            getRoleAttributes: () => this.roleAttributes,
            getNamedAttributes: () => [],
            getSelectedRoleAttributes: () => this.selectedRoleAttributes,
            getSelectedNamedAttributes: () => [],
            setSelectedRoleAttributes: (attributes) => {
                this.selectedRoleAttributes = attributes;
            },
            setSelectedNamedAttributes: (attributes) => {
                // no-op
            },
            getNamedAttributesMap: () => ({}),
        };
        // Service edit is a full-page form (/services/advanced/:id), not a side modal.
        const openForm = (ctx) => {
            if (this.hasSelectedText()) {
                return;
            }
            this.openAdvanced(ctx.row?.id);
        };
        return [
            {
                key: 'name',
                field: 'name',
                label: 'Name',
                filterType: 'TEXTINPUT',
                cell: NameCellComponent,
                cellInputs: (ctx) => ({
                    row: ctx.row,
                    cellValue: ctx.value,
                    // Service edit lives at /services/advanced/:id, but the base class resets
                    // basePath to the route segment ('services') on nav, so hardcode the root.
                    cellConfig: {pathRoot: '/services/advanced', showIdentityIcons: false},
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
                key: 'roleAttributes',
                field: 'roleAttributes',
                label: 'Roles',
                filterType: 'ATTRIBUTE',
                headerParams: serviceRolesHeaderComponentParams,
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
                key: 'createdAt',
                field: 'createdAt',
                label: 'Created At',
                valueFormatter: this.createdAtFormatter,
                filterType: 'DATETIME',
                filterPlaceholder: 'Any time',
                onCellClick: openForm,
                resizable: true,
                sortable: true,
                onSort: this.sort.bind(this),
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
    }

    getData(filters?: FilterObj[], sort?: any, page?: any, pageSize?: number): Promise<any> {
        // we can customize filters or sorting here before moving on...
        this.paging.page = page || this.paging.page;
        if (pageSize) {
            this.paging.total = pageSize;
        }
        return super.getTableData('services', this.paging, filters, sort)
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

    public getServiceRoleAttributes() {
        return this.zitiService.get('service-role-attributes', {}, []).then((result: any) => {
            this.roleAttributes = result.data;
            return result;
        });
    }

    public getIdentityNamedAttributes() {
        return this.zitiService.get('identities', {}, []).then((result) => {
            const namedAttributes = result.data.map((identity) => {
                return identity.name;
            });
            return namedAttributes;
        });
    }

    public getIdentityRoleAttributes() {
        return this.zitiService.get('identity-role-attributes', {}, []);
    }

    public openSelection() {
        this.router.navigateByUrl('/services/select');
    }

    public openAdvanced(id = '') {
        this.router.navigateByUrl(`/services/advanced/${id}`);
    }

    public openUpdate(item?: any) {
        this.modalType = 'service';
        if (item) {
            this.selectedService = item;
            this.selectedService.badges = [];
            unset(this.selectedService, '_links');
        } else {
            this.selectedService = new Service();
        }
        this.sideModalOpen = true;
    }

    getAllServicesAndOrphans(selectedItems) {
        const promises = [];
        const selected = [];
        const allItem = {
            name: 'All',
            id: 'all',
            associatedConfigs: [],
            associatedServicePolicies: []
        };

        selectedItems.forEach((service: any) => {
            const serviceItem = {
                name: service.name,
                id: service.id,
                associatedConfigs: [],
                associatedServicePolicies: []
            }
            const svcCfgAssociationPromises = [];
            const allCfgAssociationsPromise = new Promise((resolve, reject) => {
                this.zitiService.getSubdata('services', service.id, 'configs').then((result) => {
                    const configs = result.data;
                    configs.forEach((config) => {
                        const cfgProm = this.zitiService.getSubdata('configs', config.id, 'services').then((result) => {
                            const associatedServices = result.data;
                            const isOrphan = !associatedServices.some((svc) => {
                                return svc.id !== service.id;
                            });
                            if (isOrphan) {
                                serviceItem.associatedConfigs.push(config);
                            }
                        }).catch(() => {
                            reject();
                        });
                        svcCfgAssociationPromises.push(cfgProm);
                    });
                    Promise.all(svcCfgAssociationPromises).then(() => {
                        serviceItem.associatedConfigs = serviceItem.associatedConfigs.map((config) => {
                            const cfg = {
                                name: config.name,
                                id: config.id
                            }
                            if (!this.isConfigAdded(cfg, allItem)) {
                                allItem.associatedConfigs.push(cfg);
                            }
                            return cfg;
                        });
                        resolve(serviceItem.associatedConfigs);
                    })
                }).catch(() => {
                    reject();
                });
            });
            promises.push(allCfgAssociationsPromise);
            const svcPolAssociationPromises = [];
            const allSvcAssociationsPromise = new Promise((resolve, reject) => {
                this.zitiService.getSubdata('services', service.id, 'service-policies').then((result) => {
                    const policies = result.data;
                    policies.forEach((pol) => {
                        let roleAttributes = pol.serviceRoles.filter((attr) => {
                            return attr.charAt('0') === '#';
                        });
                        roleAttributes = roleAttributes.map((attr) => {
                            return attr.substring(1);
                        });
                        const prom = this.servicePolicyService.getAssociatedServicesByAttribute(roleAttributes, []).then((result) => {
                            const isOrphan = !result.some((svc) => {
                                return svc.id !== service.id;
                            });
                            if (isOrphan) {
                                serviceItem.associatedServicePolicies.push(pol);
                            }
                        }).catch(() => {
                            reject();
                        });
                        svcPolAssociationPromises.push(prom);
                    });
                    Promise.all(svcPolAssociationPromises).then(() => {
                        serviceItem.associatedServicePolicies = serviceItem.associatedServicePolicies.map((pol) => {
                            const policy = {
                                name: pol.name,
                                id: pol.id
                            }
                            if (!this.isServicePolicyAdded(policy, allItem)) {
                                allItem.associatedServicePolicies.push(policy);
                            }
                            return policy;
                        });
                        resolve(serviceItem.associatedServicePolicies);
                    });
                }).catch(() => {
                    reject();
                });
            });
            promises.push(allSvcAssociationsPromise);
            selected.push(serviceItem);
        });
        return Promise.all(promises).then(() => {
            return {selectedItems: selected, allItem: allItem};
        });
    }

    isConfigAdded(configToAdd, allItem) {
        return allItem.associatedConfigs.some((config) => {
            return config.id === configToAdd.id;
        });
    }

    isServicePolicyAdded(policyToAdd, allItem) {
        return allItem.associatedServicePolicies.some((policy) => {
            return policy.id === policyToAdd.id;
        });
    }

    removeAllServicesAndOrphans(allItems) {
        const promises = [];
        allItems.forEach((service) => {
            const prom = this.dataService.delete('services', service.id);
            promises.push(prom);
            service.associatedConfigs.forEach((config) => {
                const cfgPromise = this.dataService.delete('configs', config.id);
                promises.push(cfgPromise);
            });
            service.associatedServicePolicies.forEach((policy) => {
                const svcPolPromise = this.dataService.delete('service-policies', policy.id);
                promises.push(svcPolPromise);
            });
        });
        return Promise.all(promises);
    }
}
