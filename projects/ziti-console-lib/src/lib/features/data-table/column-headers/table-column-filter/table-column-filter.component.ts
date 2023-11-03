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
    @Input() columnId;
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
                    if (filters[idx].columnId === this.columnId) {
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
            columnId: this.columnId,
            value: this.filterString,
            label: this.filterString,
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
}
