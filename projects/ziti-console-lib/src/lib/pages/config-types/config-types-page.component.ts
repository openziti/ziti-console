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

import {Component, OnInit} from '@angular/core';
import {DataTableFilterService} from "../../features/data-table/data-table-filter.service";
import {ConfigTypesPageService} from "./config-types-page.service";
import {TabNameService} from "../../services/tab-name.service";
import {ListPageComponent} from "../../shared/list-page-component.class";
import {ConsoleEventsService} from "../../services/console-events.service";
import {MatDialog} from "@angular/material/dialog";
import {ConfirmComponent} from "../../features/confirm/confirm.component";


@Component({
    selector: 'lib-configurations',
    templateUrl: './config-types-page.component.html',
    styleUrls: ['./config-types-page.component.scss'],
    standalone: false
})
export class ConfigTypesPageComponent extends ListPageComponent implements OnInit {
    title = 'Config Types'
    tabs: { url: string, label: string }[] ;
    isLoading: boolean;
    formDataChanged = false;
    override reservedNames = ['host.v1', 'host.v2', 'intercept.v1', 'ziti-tunneler-client.v1', 'ziti-tunneler-server.v1'];

    constructor(
        override svc: ConfigTypesPageService,
        filterService: DataTableFilterService,
        private tabNames: TabNameService,
        consoleEvents: ConsoleEventsService,
        dialogForm: MatDialog
    ) {
        super(filterService, svc, consoleEvents, dialogForm);
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
                const label = selectedItems.length > 1 ? 'config types' : 'config type';
                this.openBulkDelete(selectedItems, label);
                break;
            default:
        }
    }

    tableAction(event: any) {
        switch(event?.action) {
            case 'toggleAll':
            case 'toggleItem':
                this.itemToggled(event.item)
                break;
            case 'update':
                this.svc.openEditForm(event.item?.id);
                break;
            case 'create':
                this.svc.openEditForm();
                break;
            case 'delete':
                this.deleteItem(event.item)
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

    deleteItem(item: any) {
        this.openBulkDelete([item], 'config type');
    }

    closeModal(event: any) {
        this.svc.sideModalOpen = false;
        if(event?.refresh) {
            this.refreshData();
        }
    }

    dataChanged(event) {
        this.formDataChanged = event;
    }

    confirmAssociatedDelete(configsWithAssociations, selectedItems, label) {
        const configNames = configsWithAssociations.map((item) => {
            return item.name;
        });
        const data = {
            appendId: 'DeleteConfigTypesWithAssociations',
            title: 'Config Type In Use',
            message: `The following config types are still in use by a service:`,
            submessage: 'Deleting these config types may cause disruption to those services. Would you still like to continue?',
            bulletList: configNames,
            confirmLabel: 'Yes',
            cancelLabel: 'Oops, no get me out of here',
            imageUrl: '../../assets/svgs/Growl_Warning.svg',
            showCancelLink: true
        };
        this.dialogRef = this.dialogForm.open(ConfirmComponent, {
            data: data,
            autoFocus: false,
        });
        this.dialogRef.afterClosed().subscribe((result) => {
            if (result?.confirmed) {
                this.openBulkDelete(selectedItems, label);
            }
        });
    }
}
