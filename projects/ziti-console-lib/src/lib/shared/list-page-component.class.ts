import {DataTableFilterService} from "../features/data-table/data-table-filter.service";
import {ListPageServiceClass} from "./list-page-service.class";
import {Injectable} from "@angular/core";
import {Subscription} from "rxjs";
import {ConsoleEventsService} from "../services/console-events.service";

@Injectable()
export abstract class ListPageComponent {
    abstract title;
    abstract tabs: { url: string, label: string }[] ;
    abstract headerActionClicked(action: string): void;
    abstract tableAction(event: {action: string, item: any}): void;
    abstract isLoading: boolean;
    abstract closeModal(event?: any): void;

    startCount = '-';
    endCount = '-';
    totalCount = '-';
    currentPage = 1;
    itemsSelected = false;
    selectedItems: any[] = [];
    columnDefs: any = [];
    rowData = [];
    filterApplied = false;

    modalOpen = false;

    subscription: Subscription = new Subscription();

    constructor(
        protected filterService: DataTableFilterService,
        public svc: ListPageServiceClass,
        protected consoleEvents: ConsoleEventsService,
    ) {}

    ngOnInit() {
        this.svc.refreshData = this.refreshData.bind(this);
        this.columnDefs = this.svc.initTableColumns();
        this.filterService.clearFilters();
        this.subscription.add(
            this.filterService.filtersChanged.subscribe(filters => {
                this.filterApplied = filters && filters.length > 0;
                this.refreshData();
            })
        );
        this.filterService.pageChanged.subscribe(page => {
            this.currentPage = page;
            this.refreshData();
        });
        this.subscription.add(
            this.consoleEvents.closeSideModal.subscribe((event: any) => {
                this.closeModal();
            })
        );
        this.subscription.add(
            this.consoleEvents.refreshData.subscribe((event: any) => {
                this.refreshData();
            })
        );
        this.consoleEvents.enableZACEvents();
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    itemToggled(item: any): void {
        this.updateSelectedItems(item);
    }

    updateSelectedItems(toggledItem?: any) {
        let itemSelected = false;
        this.selectedItems = [];
        this.rowData.forEach((item) => {
            if (toggledItem?.id && toggledItem?.id === item?.id) {
                item.selected = toggledItem.selected;
            }
            if (item.selected) {
                itemSelected = true;
                this.selectedItems.push(item);
            }
        });
        this.itemsSelected = itemSelected;
    }

    refreshData(sort?: { sortBy: string, ordering: string }): void {
        this.isLoading = true;
        this.svc.getData(this.filterService.filters, sort, this.currentPage)
            .then((data: any) => {
                this.rowData = data.data;
                this.totalCount = data.meta.pagination.totalCount;
                this.startCount = (data.meta.pagination.offset + 1);
                if (this.startCount + data.meta.pagination.limit > this.totalCount) {
                    this.endCount = this.totalCount;
                } else {
                    this.endCount = data.meta.pagination.limit;
                }
                this.updateSelectedItems();
            }).finally(() => {
                this.isLoading = false;
            });
    }
}
