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
import {BehaviorSubject} from "rxjs";
import {isEmpty} from "lodash";

export type FilterObj = {
    filterName: string;
    columnId: string;
    value: any;
    label: string;
}

@Injectable({
    providedIn: 'root'
})
export class DataTableFilterService {

    filters: FilterObj[] = [];
    currentPage = 1;
    filtersChanged
        = new BehaviorSubject<FilterObj[]>(this.filters)

    pageChanged = new BehaviorSubject<any>(this.currentPage);

    constructor() {
    }

    updateFilter(filterObj: FilterObj) {
        if(isEmpty(filterObj.value)) this.removeFilter(filterObj);
        else {
            let isFound = false;
            for (let idx = 0; idx < this.filters.length; idx++) {
                if (this.filters[idx].columnId === filterObj.columnId) {
                    this.filters[idx] = filterObj;
                    isFound = true;
                    break;
                }
            }
            if (!isFound) {
                this.filters.push(filterObj);
            }
        }
        this.filtersChanged.next(this.filters);
    }

    removeFilter(filterObj: FilterObj) {
        for (let idx = 0; idx < this.filters.length; idx++) {
            if (this.filters[idx].columnId === filterObj.columnId) {
                this.filters.splice(idx, 1);
                break;
            }
        }
        this.filtersChanged.next(this.filters);
    }

    getFilterString(key: string) {
        let value = '';
        for (let idx = 0; idx < this.filters.length; idx++) {
            if (this.filters[idx].columnId === key) {
                value = this.filters[idx].value;
                break;
            }
        }
        return value;
    }

    changePage(page: any) {
        this.pageChanged.next(page);
    }

    clearFilters() {
        this.filters = [];
        this.filtersChanged.next(this.filters);
    }
}
