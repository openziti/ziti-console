import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {debounce} from "lodash";
import {DataTableFilterService, FilterObj} from "../data-table-filter.service";

@Component({
  selector: 'lib-table-filter-bar',
  templateUrl: './filter-bar.component.html',
  styleUrls: ['./filter-bar.component.scss']
})
export class FilterBarComponent {

  _filters = [];

  @Input() startCount: any = '-';
  @Input() endCount: any = '-';
  @Input() totalCount: any = '-';

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
