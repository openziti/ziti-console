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

import {DataTableFilterService} from "../features/data-table/data-table-filter.service";
import {ListPageServiceClass} from "./list-page-service.class";
import {Injectable} from "@angular/core";
import {Subscription} from "rxjs";
import {ConsoleEventsService} from "../services/console-events.service";
import {ConfirmComponent} from "../features/confirm/confirm.component";
import {MatDialog} from "@angular/material/dialog";

import {defer, isEmpty} from "lodash";
import {ActivatedRoute} from "@angular/router";
import {ExtensionService} from "../features/extendable/extensions-noop.service";

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
    itemsSelected = false;
    selectedItems: any[] = [];
    columnDefs: any = [];
    rowData = [];
    filterApplied = false;
    dialogRef: any;
    modalOpen = false;
    gridObj: any = {};

    subscription: Subscription = new Subscription();

    constructor(
        protected filterService: DataTableFilterService,
        public svc: ListPageServiceClass,
        protected consoleEvents: ConsoleEventsService,
        protected dialogForm: MatDialog,
        protected extensionService?: ExtensionService
    ) {}

    ngOnInit() {
        this.filterService.currentPage = 1;
        this.svc.sideModalOpen = false;
        this.svc.refreshData = this.refreshData.bind(this);
        this.columnDefs = this.svc.initTableColumns();
        this.filterService.clearFilters();
        this.extensionService?.extendOnInit();
        this.subscription.add(
            this.filterService.filtersChanged.subscribe(filters => {
                this.filterApplied = filters && filters.length > 0;
                this.refreshData();
            })
        );
        this.filterService.pageChanged.subscribe(page => {
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

    refreshData(sort?: { sortBy: string, ordering: string }, hardRefresh = false): void {
        this.isLoading = true;
        sort = sort ? sort : this.svc.currentSort;
        this.svc.getData(this.filterService.filters, sort, this.filterService.currentPage)
            .then((data: any) => {
                this.rowData = [];
                if (hardRefresh) {
                    defer(() => {
                        this.rowData = data.data;
                    });
                } else {
                    this.rowData = data.data;
                }

                this.totalCount = data.meta.pagination.totalCount;
                this.startCount = (data.meta.pagination.offset + 1);
                if (this.startCount + data.meta.pagination.limit > this.totalCount) {
                    this.endCount = this.totalCount;
                } else {
                    this.endCount = data.meta.pagination.offset + data.meta.pagination.limit;
                }
                this.updateSelectedItems();
                this.refreshCells();
            }).finally(() => {
                this.isLoading = false;
            });
    }

    protected openBulkDelete(selectedItems: any[], entityTypeLabel = 'item(s)', ) {
        const selectedIds = selectedItems.map((row) => {
            return row.id;
        });
        const selectedNames = selectedItems.map((item) => {
            return item.name;
        });
        const countLabel = selectedItems.length > 1 ? selectedItems.length : '';
        const data = {
            appendId: 'DeleteServices',
            title: 'Delete',
            message: `Are you sure you would like to delete the following ${countLabel} ${entityTypeLabel}?`,
            bulletList: selectedNames,
            confirmLabel: 'Yes',
            cancelLabel: 'Oops, no get me out of here',
            imageUrl: '../../assets/svgs/Confirm_Trash.svg',
            showCancelLink: true
        };
        this.dialogRef = this.dialogForm.open(ConfirmComponent, {
            data: data,
            autoFocus: false,
        });
        this.dialogRef.afterClosed().subscribe((result) => {
            if (result?.confirmed) {
                this.svc.removeItems(selectedIds).then(() => {
                    this.refreshData(this.svc.currentSort);
                });
            }
        });
    }

    gridReady(event) {
        this.gridObj = event;
    }

    refreshCells() {
        defer(() => {
            var params = {
                force: true,
            };
            this.gridObj?.api?.refreshCells(params);
        });
    }
}
