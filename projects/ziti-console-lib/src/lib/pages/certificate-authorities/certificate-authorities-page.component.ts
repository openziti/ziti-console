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
import {CertificateAuthoritiesPageService} from "./certificate-authorities-page.service";
import {TabNameService} from "../../services/tab-name.service";
import {ListPageComponent} from "../../shared/list-page-component.class";
import {ConsoleEventsService} from "../../services/console-events.service";
import {MatDialog} from "@angular/material/dialog";
import {ConfirmComponent} from "../../features/confirm/confirm.component";
import {firstValueFrom} from "rxjs";


@Component({
    selector: 'lib-auth-policies',
    templateUrl: './certificate-authorities-page.component.html',
    styleUrls: ['./certificate-authorities-page.component.scss']
})
export class CertificateAuthoritiesPageComponent extends ListPageComponent implements OnInit {
    title = 'Certificate Authorities'
    tabs: { url: string, label: string }[] ;
    isLoading: boolean;
    formDataChanged = false;

    constructor(
        override svc: CertificateAuthoritiesPageService,
        filterService: DataTableFilterService,
        private tabNames: TabNameService,
        consoleEvents: ConsoleEventsService,
        dialogForm: MatDialog
    ) {
        super(filterService, svc, consoleEvents, dialogForm);
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
                const selectedItems = this.rowData.filter((row) => {
                    return row.selected;
                });
                const label = selectedItems.length > 1 ? 'certificate authorities' : 'certificate authority';
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
                this.deleteItem(event.item);
                break;
            case 'verify':
                this.svc.verifyCert(event.item.id);
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
        this.openBulkDelete([item], 'certificate authority');
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

    override gridReady(event) {
        event.api.addEventListener('cellClicked', (event) => {
            if (event.column.getColId() === 'jwt') {
                if (event.data?.id && event.data.isVerified) {
                    this.isLoading = true
                    this.svc.getJwt(event.data?.id).finally(() => {
                        this.isLoading = false;
                    });
                }
            }
        });
        super.gridReady(event);
    }
}
