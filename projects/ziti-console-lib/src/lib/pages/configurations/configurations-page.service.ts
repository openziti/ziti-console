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

@Injectable({
    providedIn: 'root'
})
export class ConfigurationsPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;

    resourceType = 'configs';
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
        protected override router: Router
    ) {
        super(settings, filterService, csvDownloadService, extService, router);
    }

    initTableColumns(): any {

        const typeRenderer = (row) => {
            return row?.data?.configType?.name;
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
                filter: true,
                sortColumn: this.sort.bind(this)
            },
            {
                colId: 'type',
                field: 'type',
                headerName: 'Type',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.typeHeaderComponentParams,
                cellRenderer: typeRenderer,
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

    _typeHeaderComponentParams = {
        filterType: 'SELECT',
        enableSorting: true,
        filterOptions: [
            { label: 'ALL', value: '' },
        ],
        getFilterOptions: () => {
            return this.typeHeaderComponentParams.filterOptions;
        }
    };

    get typeHeaderComponentParams() {
        return this._typeHeaderComponentParams;
    }

    set typeHeaderComponentParams(params) {
        this._typeHeaderComponentParams = params;
    }

    getConfigTypes() {
        const sort = {
            ordering: 'asc',
            sortBy: 'name'
        };
        return super.getTableData('config-types', this.DEFAULT_PAGING, [], sort)
            .then((results: any) => {
                this.typeHeaderComponentParams.filterOptions = [{ label: 'ALL', value: '' }];
                results.data.forEach((configType: any) => {
                    this.typeHeaderComponentParams.filterOptions.push({
                        label: configType.name,
                        value: configType.id
                    });
                });
                return this.typeHeaderComponentParams;
            });
    }

    getData(filters?: FilterObj[], sort?: any) {
        // we can customize filters or sorting here before moving on...
        return super.getTableData('configs', this.paging, filters, sort)
            .then((results: any) => {
                return this.processData(results);
            });
    }

    validate = (formData:any, schema: any): Promise<CallbackResults> => {
        let errors = {};
        if(schema) {
            for (var key in schema.properties) {
                var property = schema.properties[key];
                errors = {...errors, ...this.validateProperty(key, property, formData, schema)};
            }
            return Promise.resolve({passed: _.isEmpty(errors), errors});
        } else {
            throw new Error('no schema definition selected');
        }
    }

    validateProperty(key, property, formData, schema, parentKey?): any {
        let errors = {}
        var type = this.schemaSvc.getType(property);
        if (type == "object") {
            for (var subKey in property.properties) {
                errors = {...errors, ...this.validateProperty(subKey, property.properties[subKey], formData, schema, key)};
            }
        } else {
            var theValue: string = _.get(formData, key)
            if (type == "integer") {
                if (schema.required && schema.required.includes(key)) {
                    var min = null;
                    var max = null;
                    if (property.minimum) min = Number(property.minimum);
                    if (property.maximum) max = Number(property.maximum);
                    if (isNaN(parseInt(theValue))) {
                         errors[key] = 'invalid number';
                    }
                    else {
                        var val = Number(theValue);
                        if (min != null && val < min) {
                            errors[key] = `minimum value ${min} expected`;
                        }
                        if (max != null && val > max) {
                            errors[key] = `maximum value ${max} expected`;
                        }
                    }
                }
            } else if (type == "array") {
                // if (schema.required && schema.required.includes(key)) {
                //     if ($("#" + ((parentKey != null) ? parentKey + '_' : '') + "schema_" + key).hasClass("checkboxList")) {
                //         var obj = $("#" + ((parentKey != null) ? parentKey + '_' : '') + "schema_" + key);
                //         var total = obj.data("total");
                //         var hasSelection = false;
                //         for (var i = 0; i < total; i++) {
                //             var item = $("#" + ((parentKey != null) ? parentKey + '_' : '') + "schema_" + key + "_" + i);
                //             if (item.hasClass("checked")) {
                //                 hasSelection = true;
                //                 break;
                //             }
                //         }
                //         if (!hasSelection) $("#" + ((parentKey != null) ? parentKey + '_' : '') + "schema_" + key).addClass("errors");
                //     } else {
                //         if ($("#" + ((parentKey != null) ? parentKey + '_' : '') + "schema_" + key + "_selected").children().length == 0) elem.addClass("errors");
                //     }
                // }
            } else {
                if (schema.required && schema.required.includes(key) && theValue.length == 0) {
                    errors[key] = `${key} required`;
                }
            }
        }
        return errors;
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
        this.modalType = 'config';
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
