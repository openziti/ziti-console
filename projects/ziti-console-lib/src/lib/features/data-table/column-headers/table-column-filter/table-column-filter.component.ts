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

import {AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import _ from 'lodash';
import {DataTableFilterService} from "../../data-table-filter.service";
import {Subscription} from "rxjs";

@Component({
    selector: 'app-table-column-filter',
    templateUrl: './table-column-filter.component.html',
    styleUrls: ['./table-column-filter.component.scss'],
})
export class TableColumnFilterComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() type = 'TEXTINPUT';
    @Input() filterString = '';
    @Input() filterName = '';
    @Input() columnDef;
    @Input() openStatusMenu;
    @Input() dateFilter: any = '24h';

    subscription = new Subscription();
    setFilterDebounced = _.debounce(this.setFilter, 500);

    @ViewChild('filterInput') filterInput: ElementRef;

    constructor(public filterService: DataTableFilterService) {
    }

    ngOnInit(): void {
        this.subscription.add(
            this.filterService.filtersChanged.subscribe((filters) => {
                let tmp = '';
                for (let idx = 0; idx < filters.length; idx++) {
                    if (filters[idx].columnId === this.columnDef?.colId) {
                        tmp = filters[idx].value;
                        break;
                    }
                }
                this.filterString = tmp;
            }));
    }

    setFilter(): void {
        const filterObj = {
            filterName: this.filterName,
            columnId: this.columnDef?.colId,
            value: this.filterString,
            label: this.filterString,
            type: this.type,
        };
        this.filterService.updateFilter(filterObj)
    }


    ngAfterViewInit() {
        this.filterInput.nativeElement.focus();
    }

    statusClicked(event) {
        if (event && this.openStatusMenu) {
            event.statusFilter = true;
            this.openStatusMenu(event);
        }
    }

    ngOnDestroy(): void {
        if(this.subscription) this.subscription.unsubscribe();
    }

    get availableRoleAttributes() {
        return this.columnDef?.headerComponentParams?.roleAttributes;
    }
}
