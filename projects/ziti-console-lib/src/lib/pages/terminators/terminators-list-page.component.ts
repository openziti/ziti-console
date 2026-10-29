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

import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {ListPageComponent} from "../../shared/list-page-component.class";
import {DataTableFilterService} from "../../features/data-table/data-table-filter.service";
import {MatDialog} from "@angular/material/dialog";
import {TabNameService} from "../../services/tab-name.service";
import {ConsoleEventsService} from "../../services/console-events.service";
import {TerminatorsPageService} from "./terminators-page.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../features/extendable/extensions-noop.service";

// Terminators page on `lib-list-table`, selected by the route when Beta Features is on.
@Component({
    selector: 'lib-terminators-list',
    templateUrl: './terminators-list-page.component.html',
    styleUrls: ['./terminators-page.component.scss'],
    standalone: false
})
export class TerminatorsListPageComponent extends ListPageComponent implements OnInit, OnDestroy {
    title = 'Terminators';
    tabs: { url: string; label: string }[];
    isLoading = false;
    formDataChanged = false;
    protected override readonly tableId = 'terminators';
    protected override readonly initialPageSize = 50;

    constructor(
        public override svc: TerminatorsPageService,
        filterService: DataTableFilterService,
        private tabNames: TabNameService,
        consoleEvents: ConsoleEventsService,
        dialogForm: MatDialog,
        @Inject(SHAREDZ_EXTENSION) private extService: ExtensionService,
    ) {
        super(filterService, svc, consoleEvents, dialogForm, extService);
    }

    protected override loadTableColumns(): any[] {
        return this.svc.initListTableColumns();
    }

    override ngOnInit() {
        this.tabs = this.tabNames.getTabs('services');
        this.svc.refreshData = this.refreshData;
        super.ngOnInit();
    }

    headerActionClicked(action: string) {
        switch (action) {
            case 'add':
                this.svc.openEditForm();
                break;
            case 'edit':
                this.svc.openEditForm();
                break;
            case 'delete':
                const selectedItems = this.rowData.filter((row) => {
                    return row.selected;
                });
                const label = selectedItems.length > 1 ? 'terminators' : 'terminator';
                this.openBulkDelete(selectedItems, label);
                break;
            default:
        }
    }

    tableAction(event: any) {
        this.trackMenuAction(event?.action, event?.item);
        switch (event?.action) {
            case 'toggleAll':
            case 'toggleItem':
                this.itemToggled(event.item);
                break;
            case 'update':
                this.svc.openEditForm(event.item?.id);
                break;
            case 'create':
                this.svc.openEditForm();
                break;
            case 'delete':
                this.deleteItem(event.item);
                break;
            default:
                break;
        }
    }

    trackMenuAction(action: string, item: any) {
        this.extService?.consoleActionTriggered?.emit({
            action,
            page: 'terminator',
            item,
            type: 'menu-action'
        });
    }

    deleteItem(item: any) {
        this.openBulkDelete([item], 'terminator');
    }

    closeModal(event?: any) {
        this.svc.sideModalOpen = false;
        if (event?.refresh) {
            this.refreshData();
        }
    }

    dataChanged(event) {
        this.formDataChanged = event;
    }

    override ngOnDestroy() {
        super.ngOnDestroy();
    }
}
