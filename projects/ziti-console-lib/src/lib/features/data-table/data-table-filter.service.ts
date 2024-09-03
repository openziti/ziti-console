import {Injectable} from '@angular/core';
import {BehaviorSubject} from "rxjs";
import {forEach, isEmpty} from "lodash";
import {HttpParams} from "@angular/common/http";
import {ActivatedRoute, Router} from "@angular/router";
import {Location} from "@angular/common";

export type FilterObj = {
    filterName: string;
    columnId: string;
    value: any;
    label: string;
    type?: string;
    hidden?: boolean;
    verb?: string
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

    currentQueryParams = [];

    constructor(private location: Location, private router: Router, private activatedRoute: ActivatedRoute) {
    }

    updateFilter(filterObj: FilterObj) {
        if(isEmpty(filterObj.value) && (isNaN(filterObj.value) || filterObj.value === '')) this.removeFilter(filterObj);
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
        this.updateUrlParameters();
        this.filtersChanged.next(this.filters);
    }

    removeFilter(filterObj: FilterObj) {
        for (let idx = 0; idx < this.filters.length; idx++) {
            if (this.filters[idx].columnId === filterObj.columnId) {
                this.filters.splice(idx, 1);
                break;
            }
        }
        this.updateUrlParameters([filterObj]);
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
        this.updateUrlParameters();
        this.filtersChanged.next(this.filters);
    }

    storeFilters() {
        localStorage.setItem('search_filters', JSON.stringify(this.filters));
    }

    getStoredFilters() {
        const storageItem = localStorage.getItem('search_filters');
        const filters = storageItem ? JSON.parse(storageItem) : [];
        return filters;
    }

    updateUrlParameters(filtersToRemove: any[] = []) {
        const urlFiltersMap = this.getUrlFiltersMap();
        let params: HttpParams = new HttpParams();
        this.filters.forEach(filter => {
            urlFiltersMap[filter.columnId] = filter;
        });
        const newFilters = [];
        forEach(urlFiltersMap, (value, key) => {
            const filterRemoved = filtersToRemove.some((removed) => {
                return removed.columnId === key;
            })
            if (!filterRemoved) {
                params = params.append(key, value.value);
                newFilters.push(value);
            }
        });
        this.filters = newFilters;
        const path = this.router.url.split("?")[0];
        this.location.replaceState(path, params.toString());
        this.storeFilters();
    }

    getUrlFiltersMap(): any {
        const paramString = window.location.href.split("?")[1];
        const params: HttpParams = new HttpParams({ fromString: paramString });
        const storedFilters = this.getStoredFilters();
        const appliedFiltersMap = {};

        params.keys().forEach((key) => {
            const storedFilter = storedFilters.find((filter) => {
                return filter.columnId === key;
            });
            if (storedFilter) {
                appliedFiltersMap[key] = storedFilter;
            } else {
                appliedFiltersMap[key] = {
                    columnId: key,
                    value: params.get(key),
                    label: key
                };
            }
        });
        return appliedFiltersMap;
    }

}
