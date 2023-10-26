import {Injectable} from '@angular/core';
import {GrowlerService} from '../features/messaging/growler.service';
import {GrowlerModel} from "../features/messaging/growler.model";
import {AngularCsv} from 'angular-csv-ext/dist/Angular-csv';
import {saveAs} from 'file-saver';
import {isEmpty, isBoolean, get} from 'lodash';

const defaultOptions = {
    fieldSeparator: ',',
    quoteStrings: '"',
    decimalseparator: '.',
    showLabels: true,
    showTitle: false,
    useBom: true,
};

@Injectable({
    providedIn: 'root',
})
export class CsvDownloadService {
    constructor(
        private growler: GrowlerService
    ) {
    }

    public download(
        filename: string,
        items: any[],
        columns: any[],
        translateStatus?: boolean,
        isEndpoint?: boolean,
        options?: any,
        toUpperCase = true
    ) {
        const useOptions = options != null ? options : defaultOptions;

        const data = [];

        if (items.length > 0) {
            // Construct the header rows
            const header = {};

            for (const column of columns) {
                const key = column.path ? column.path : column;
                const headerText = column.label ? column.label : (toUpperCase ? column.toUpperCase() : column);
                header[key] = headerText;
            }
            data.push(header);

            // Construct each row based on the columns defined
            for (const item of items) {
                const row = {};

                for (const column of columns) {
                    const path = column.path ? column.path : column;
                    let columnValue = get(item, path);
                    if (isBoolean(columnValue)) {
                        columnValue = '' + columnValue;
                    }
                    if (isEmpty(columnValue)) {
                        row[path] = '';
                    } else {
                        if (Array.isArray(columnValue)) {
                            row[path] = columnValue.join(',');
                        } else {
                            row[path] = columnValue;
                        }
                    }
                }
                data.push(row);
            }

            const csv = new AngularCsv(data, filename, useOptions);
        } else {
            this.growler.show(
                new GrowlerModel(
                    'warning',
                    'No Data',
                    'Dataset is Empty',
                    'The system must have data in order to generate an export file.'
                )
            );
        }
    }

    downloadAll(data, filename, useOptions?, type?) {
        let fileType = 'csv';
        switch (type) {
            case 'text/csv':
                fileType = 'csv';
                break;
            case 'application/json':
                fileType = 'json';
                break;
            case 'application/x-yaml':
                fileType = 'yml';
                break;
        }
        if (useOptions && useOptions.isEndpoint) {
            data = data.replace('hasApiSession', 'online');
        }
        const newBlob = new Blob([decodeURIComponent(encodeURI(data))], {
            type: `${type};charset=utf-8;`,
        });
        saveAs(newBlob, `${filename}.${fileType}`);
    }
}
