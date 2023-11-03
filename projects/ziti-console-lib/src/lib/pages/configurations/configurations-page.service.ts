import {Inject, Injectable} from '@angular/core';
import {DataTableFilterService, FilterObj} from "../../features/data-table/data-table-filter.service";
import _, {isEmpty} from "lodash";
import moment from "moment";
import {ListPageServiceClass} from "../../shared/list-page-service.class";
import {
    TableColumnDefaultComponent
} from "../../features/data-table/column-headers/table-column-default/table-column-default.component";
import {CallbackResults} from "../../features/list-page-features/list-page-form/list-page-form.component";
import {SchemaService} from "../../services/schema.service";
import {SETTINGS_SERVICE, SettingsService} from "../../services/settings.service";
import {CsvDownloadService} from "../../services/csv-download.service";

@Injectable({
    providedIn: 'root'
})
export class ConfigurationsPageService extends ListPageServiceClass {

    private paging = this.DEFAULT_PAGING;

    constructor(
        private schemaSvc: SchemaService,
        @Inject(SETTINGS_SERVICE) settings: SettingsService,
        filterService: DataTableFilterService,
        csvDownloadService: CsvDownloadService
    ) {
        super(settings, filterService, csvDownloadService);
    }

    initTableColumns(): any {
        const createdAtFormatter = (row) => {
            return moment(row?.data?.createdAt).local().format('M/D/YYYY H:MM A');
        }

        return [
            {
                colId: 'name',
                field: 'name',
                headerName: 'Name',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
                sortColumn: this.sort.bind(this)
            },
            {
                colId: 'type',
                field: 'configType.name',
                headerName: 'Type',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
                sortable: true,
                filter: true,
                sortColumn: this.sort.bind(this)
            },
            {
                colId: 'createdAt',
                field: 'createdAt',
                headerName: 'Created At',
                headerComponent: TableColumnDefaultComponent,
                headerComponentParams: this.headerComponentParams,
                valueFormatter: createdAtFormatter,
                resizable: true,
                cellClass: 'nf-cell-vert-align tCol',
            }
        ];
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

    private addActionsPerRow(results: any) {
        return results.data.map((row) => {
            row.actionList = ['update', 'override', 'delete'];
            if (row?.enrollment?.ott) {
                if (row?.enrollment?.ott?.expiresAt) {
                    const difference = moment(row?.enrollment?.ott?.expiresAt).diff(moment(new Date()));
                    if (difference > 0) {
                        row.actionList.push('download-enrollment');
                        row.actionList.push('qr-code');
                    }
                } else {
                    row.actionList.push('download-enrollment');
                    row.actionList.push('qr-code');
                }
            } else if (row?.enrollment?.updb) {
                if (row?.enrollment?.updb?.expiresAt != null) {
                    const difference = moment(row?.enrollment?.updb?.expiresAt).diff(moment(new Date()));
                    if (difference > 0) {
                        row.actionList.push('download-enrollment');
                        row.actionList.push('qr-code');
                    }
                } else {
                    row.actionList.push('download-enrollment');
                    row.actionList.push('qr-code');
                }
            }
            return row;
        });
    }
}
