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
