import {Component, EventEmitter, Input, OnDestroy, Output} from '@angular/core';

// One sub-section (label and paged list) of an "Associated entities" card. The parent owns paging:
// it passes the current page of names plus the total, and reacts to pageChange / searchChange.
@Component({
    selector: 'lib-form-associated-group',
    templateUrl: './form-associated-group.component.html',
    styleUrls: ['./form-associated-group.component.scss'],
    standalone: false
})
export class FormAssociatedGroupComponent implements OnDestroy {
  @Input() label = '';
  @Input() items: string[] = [];
  @Input() total = 0;
  @Input() page = 1;
  @Input() pageSize = 5;
  @Input() loading = false;
  @Input() clickable = false;
  @Input() helpText = '';
  @Input() emptyText = 'No items';
  @Output() itemSelected = new EventEmitter<any>();
  @Output() pageChange = new EventEmitter<number>();
  @Output() searchChange = new EventEmitter<string>();

  open = true;
  filterText = '';
  private searchTimer: any;

  get pages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); }
  get from(): number { return this.total ? (this.page - 1) * this.pageSize + 1 : 0; }
  get to(): number { return this.total ? this.from + this.items.length - 1 : 0; }
  get showFilter(): boolean { return this.total > 0 || !!this.filterText; }

  onFilter(value: string) {
    this.filterText = value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.searchChange.emit(value.trim()), 300);
  }

  go(delta: number) {
    const next = Math.min(Math.max(this.page + delta, 1), this.pages);
    if (next !== this.page) {
      this.pageChange.emit(next);
    }
  }

  ngOnDestroy() {
    clearTimeout(this.searchTimer);
  }
}
