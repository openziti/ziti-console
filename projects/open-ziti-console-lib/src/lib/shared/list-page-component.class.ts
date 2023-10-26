import {DataTableFilterService} from "../features/data-table/data-table-filter.service";
import {ListPageServiceClass} from "./list-page-service.class";
import {Injectable} from "@angular/core";

@Injectable()
export abstract class ListPageComponent {
    abstract title;
    abstract tabs: { url: string, label: string }[] ;
    abstract headerActionClicked(action: string): void;
    abstract tableAction(event: {action: string, item: any}): void;
    abstract isLoading: boolean;

    startCount = '-';
    endCount = '-';
    totalCount = '-';
    itemsSelected = false;
    selectedItems: any[] = [];
    columnDefs: any = [];
    rowData = [];
    filterApplied = false;

    modalOpen = false;

    constructor(
        protected filterService: DataTableFilterService,
        public svc: ListPageServiceClass
    ) {}

    ngOnInit() {
        this.svc.refreshData = this.refreshData.bind(this);
        this.columnDefs = this.svc.initTableColumns();
        this.filterService.clearFilters();
        this.filterService.filtersChanged.subscribe(filters => {
            this.filterApplied = filters && filters.length > 0;
            this.refreshData();
        });
    }

    itemToggled(item: any): void {
        this.updateSelectedItems();
    }

    updateSelectedItems() {
        let itemSelected = false;
        this.selectedItems = [];
        this.rowData.forEach((item) => {
            if (item.selected) {
                itemSelected = true;
                this.selectedItems.push(item);
            }
        });
        this.itemsSelected = itemSelected;
    }

    refreshData(sort?: { sortBy: string, ordering: string }): void {
        this.isLoading = true;
        this.svc.getData(this.filterService.filters, sort)
            .then((data: any) => {
                this.rowData = data.data
                this.startCount = 1 + '';
                this.endCount = data.meta.pagination.totalCount;
                this.totalCount = data.meta.pagination.totalCount;
                this.updateSelectedItems();
            }).finally(() => {
                this.isLoading = false;
            });
    }
}
