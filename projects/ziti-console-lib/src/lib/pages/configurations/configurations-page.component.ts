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
import {ConfigurationsPageService} from "./configurations-page.service";
import {TabNameService} from "../../services/tab-name.service";
import {ListPageComponent} from "../../shared/list-page-component.class";
import {ConsoleEventsService} from "../../services/console-events.service";
import {MatDialog} from "@angular/material/dialog";


@Component({
    selector: 'lib-configurations',
    templateUrl: './configurations-page.component.html',
    styleUrls: ['./configurations-page.component.scss']
})
export class ConfigurationsPageComponent extends ListPageComponent implements OnInit {
    title = 'Configuration Management'
    tabs: { url: string, label: string }[] ;
    isLoading: boolean;
    formDataChanged = false;

    constructor(
        override svc: ConfigurationsPageService,
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
        this.svc.getConfigTypes().then((result) => {
            console.log(result);
        });
        super.ngOnInit();
    }

    headerActionClicked(action: string) {
        switch (action) {
            case 'add':
                this.svc.openUpdate();
                break;
            case 'edit':
                this.svc.openUpdate(action);
                break;
            case 'delete':
                const selectedItems = this.rowData.filter((row) => {
                    return row.selected;
                });
                const label = selectedItems.length > 1 ? 'configurations' : 'configuration';
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
                this.svc.openUpdate(event.item);
                break;
            case 'create':
                this.svc.openUpdate();
                break;
            case 'delete':
                this.deleteItem(event.item)
                break;
            default:
                break;
        }
    }

    deleteItem(item: any) {
        this.openBulkDelete([item], 'config');
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
}
