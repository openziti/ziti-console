import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {debounce, isNumber} from "lodash";
import {DataTableFilterService, FilterObj} from "../data-table-filter.service";

@Component({
  selector: 'lib-table-filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss']
})
export class FilterBarComponent {

  _filters = [];

  @Input() startCount: string = '-';
  @Input() endCount: string = '-';
  @Input() totalCount: string = '-';
  @Input() currentPage: number = 1;

  filterString = '';
  inputChangedDebounced = debounce(this.inputChanged.bind(this), 400);

  constructor(public filterService: DataTableFilterService) {
    this.filterService.filtersChanged.subscribe(filters => {
      this._filters = [...filters];
      let tmp = '';
      for (let idx = 0; idx < filters.length; idx++) {
        if (filters[idx].columnId === 'name') {
          tmp = filters[idx].value;
          break;
        }
      }
      this.filterString = tmp;
    });
  }

  nextPage() {
    this.currentPage++;
    this.filterService.changePage(this.currentPage);
  }

  prevPage() {
    this.currentPage--;
    this.filterService.changePage(this.currentPage);
  }

  get nextDisabled() {
    if (!isNumber(this.totalCount) || !isNumber(this.endCount)) {
      return true;
    }
    const total: any = Number.parseInt(this.totalCount);
    const end: any = Number.parseInt(this.endCount);
    return end >= total;
  }

  get prevDisabled() {
    if (!isNumber(this.startCount) || !isNumber(this.totalCount)) {
      return true;
    }
    const start = Number.parseInt(this.startCount, 10);
    return start <= 1;
  }

  inputChanged() {
    const filterObj: FilterObj = {
      filterName: 'name',
      columnId: 'name',
      value: this.filterString,
      label: this.filterString,
    };
    this.filterService.updateFilter(filterObj)
  }


  removeFilter(filterObj: FilterObj) {
    this.filterService.removeFilter(filterObj);
  }
}
