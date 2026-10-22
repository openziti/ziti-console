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
import {AuthPoliciesPageService} from "./auth-policies-page.service";
import {ExtensionService, SHAREDZ_EXTENSION} from "../../features/extendable/extensions-noop.service";

// Auth Policies page on `lib-list-table`, selected by the route when Beta Features is on.
@Component({
    selector: 'lib-auth-policies-list',
    templateUrl: './auth-policies-list-page.component.html',
    styleUrls: ['./auth-policies-page.component.scss'],
    standalone: false
})
export class AuthPoliciesListPageComponent extends ListPageComponent implements OnInit, OnDestroy {
    title = 'Auth Policies';
    tabs: { url: string; label: string }[];
    isLoading = false;
    formDataChanged = false;
    protected override readonly tableId = 'auth-policies';
    protected override readonly initialPageSize = 50;

    constructor(
        public override svc: AuthPoliciesPageService,
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
        this.tabs = this.tabNames.getTabs('authentication');
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
                let defaultCheckPromise: Promise<any> = Promise.resolve({ confirmed: true });
                const selectedItems = this.rowData.filter((row) => {
                    if (row.selected && row.id === 'default') {
                        defaultCheckPromise = this.svc.checkDefaultAuthPolicy(row);
                    }
                    return row.selected;
                });
                defaultCheckPromise.then((result) => {
                    if (!result?.confirmed) {
                        return;
                    }
                    const label = selectedItems.length > 1 ? 'auth policies' : 'auth policy';
                    this.openBulkDelete(selectedItems, label);
                });
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
                this.svc.checkDefaultAuthPolicy(event.item).then((result) => {
                    if (!result) {
                        return;
                    }
                    this.svc.openEditForm(event.item?.id);
                });
                break;
            case 'create':
                this.svc.openEditForm();
                break;
            case 'delete':
                this.svc.checkDefaultAuthPolicy(event.item).then((result) => {
                    if (!result) {
                        return;
                    }
                    this.deleteItem(event.item);
                });
                break;
            case 'download-all':
                this.downloadAllItems();
                break;
            case 'download-selected':
                this.svc.downloadItems(this.selectedItems);
                break;
            default:
                break;
        }
    }

    trackMenuAction(action: string, item: any) {
        this.extService?.consoleActionTriggered?.emit({
            action,
            page: 'auth-policy',
            item,
            type: 'menu-action'
        });
    }

    deleteItem(item: any) {
        this.openBulkDelete([item], 'auth-policy');
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
