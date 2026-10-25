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
import {EdgeRoutersPageService} from "./edge-routers-page.service";
import {DataTableFilterService} from "../../features/data-table/data-table-filter.service";
import {ListPageComponent} from "../../shared/list-page-component.class";
import {TabNameService} from "../../services/tab-name.service";
import {ConsoleEventsService} from "../../services/console-events.service";
import {MatDialog} from "@angular/material/dialog";
import {EDGE_ROUTER_EXTENSION_SERVICE} from "../../features/projectable-forms/edge-router/edge-router-form.service";
import {ExtensionService} from "../../features/extendable/extensions-noop.service";

// Edge Routers page on `lib-list-table`, selected by the route when Beta Features is on.
@Component({
    selector: 'lib-edge-routers-list',
    templateUrl: './edge-routers-list-page.component.html',
    styleUrls: ['./edge-routers-page.component.scss'],
    standalone: false
})
export class EdgeRoutersListPageComponent extends ListPageComponent implements OnInit, OnDestroy {

    title = 'Edge Routers';
    tabs: { url: string, label: string }[];
    isLoading = false;
    formDataChanged = false;
    protected override readonly tableId = 'edge-routers';
    protected override readonly initialPageSize = 50;

    constructor(
        public override svc: EdgeRoutersPageService,
        filterService: DataTableFilterService,
        dialogForm: MatDialog,
        private tabNames: TabNameService,
        consoleEvents: ConsoleEventsService,
        @Inject(EDGE_ROUTER_EXTENSION_SERVICE) private extService: ExtensionService,
    ) {
        super(filterService, svc, consoleEvents, dialogForm, extService);
    }

    protected override loadTableColumns(): any[] {
        return this.svc.initListTableColumns();
    }

    override ngOnInit() {
        this.tabs = this.tabNames.getTabs('routers');
        this.svc.refreshData = this.refreshData;
        this.svc.getEdgeRouterRoleAttributes();
        super.ngOnInit();
    }

    override ngOnDestroy() {
        this.closeModal();
        super.ngOnDestroy();
    }

    headerActionClicked(action: string) {
        switch (action) {
            case 'add':
                this.svc.openEditForm();
                break;
            case 'edit':
                this.svc.openUpdate();
                break;
            case 'delete':
                const selectedItems = this.rowData.filter((row) => {
                    return row.selected;
                });
                const label = selectedItems.length > 1 ? 'routers' : 'router';
                this.openBulkDelete(selectedItems, label);
                break;
            default:
        }
    }

    tableAction(event: any) {
        this.trackMenuAction(event?.action, event?.item);
        if (this.extService?.listActions?.length > 0) {
            let extensionFound = false;
            this.extService?.listActions?.forEach((extAction) => {
                if (extAction?.action === event?.action) {
                    extAction.callback(event.item);
                    extensionFound = true;
                }
            });
            if (extensionFound) {
                return;
            }
        }
        switch (event?.action) {
            case 'toggleAll':
            case 'toggleItem':
                this.itemToggled(event.item);
                break;
            case 'update':
                this.svc.openEditForm(event?.item?.id);
                break;
            case 'create':
                this.svc.openEditForm();
                break;
            case 'delete':
                this.deleteItem(event.item);
                break;
            case 'download-enrollment':
                this.downloadJWT(event.item);
                break;
            case 'download-all':
                this.downloadAllItems();
                break;
            case 'download-selected':
                this.svc.downloadItems(this.selectedItems);
                break;
            case 're-enroll':
                this.svc.reenroll(event.item).then(() => {
                    this.refreshData(this.svc.currentSort);
                });
                break;
            default:
                break;
        }
    }

    trackMenuAction(action: string, item: any) {
        this.extService?.consoleActionTriggered?.emit({
            action,
            page: 'edge-router',
            item,
            type: 'menu-action'
        });
    }

    downloadJWT(item: any) {
        const jwt = this.svc.getJWT(item);
        this.svc.downloadJWT(jwt, item.name);
    }

    deleteItem(item: any) {
        this.openBulkDelete([item], 'router');
    }

    closeModal(event?) {
        this.svc.sideModalOpen = false;
        if (event?.refresh) {
            this.refreshData();
            this.svc.getEdgeRouterRoleAttributes();
        }
    }

    dataChanged(event) {
        this.formDataChanged = event;
    }

    canDeactivate() {
        if (this.formDataChanged && this.svc.sideModalOpen) {
            return confirm('You have unsaved changes. Do you want to leave this page and discard your changes or stay on this page?');
        }
        return true;
    }
}
