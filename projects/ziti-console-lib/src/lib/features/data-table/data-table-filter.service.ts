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
    filtersChanged
        = new BehaviorSubject<FilterObj[]>(this.filters)

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

    clearFilters() {
        this.filters = [];
        this.filtersChanged.next(this.filters);
    }
}
