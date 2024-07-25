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

import {Component, Inject, OnInit, OnDestroy} from '@angular/core';
import {ServicesPageService} from "../services/services-page.service";
import {DataTableFilterService} from "../../features/data-table/data-table-filter.service";
import {TabNameService} from "../../services/tab-name.service";
import {ConsoleEventsService} from "../../services/console-events.service";
import {ZAC_WRAPPER_SERVICE, ZacWrapperServiceClass} from "../../features/wrappers/zac-wrapper-service.class";
import {ListPageComponent} from "../../shared/list-page-component.class";
import {MatDialog} from "@angular/material/dialog";
import {ConfirmComponent} from "../../features/confirm/confirm.component";

@Component({
  selector: 'lib-services',
  templateUrl: './services-page.component.html',
  styleUrls: ['./services-page.component.scss']
})
export class ServicesPageComponent extends ListPageComponent implements OnInit, OnDestroy  {

  serviceType = '';
  serviceRoleAttributes: any[] = [];
  identityRoleAttributes: any[] = [];
  formDataChanged = false;
  isLoading: boolean;
  tabs: { url: string; label: string }[];
  title = 'Manage Services';

  constructor(
      public override svc: ServicesPageService,
      filterService: DataTableFilterService,
      dialogForm: MatDialog,
      private tabNames: TabNameService,
      consoleEvents: ConsoleEventsService,
      @Inject(ZAC_WRAPPER_SERVICE)private zacWrapperService: ZacWrapperServiceClass,
  ) {
    super(filterService, svc, consoleEvents, dialogForm);
    let userLang = navigator.language || 'en-us';
    userLang = userLang.toLowerCase();
  }

  override ngOnInit() {
    super.ngOnInit();
    this.getServiceRoleAttributes();
    this.tabs = this.tabNames.getTabs('services');
  }

  headerActionClicked(action: string) {
    switch(action) {
      case 'add':
        this.svc.openSelection();
        break;
      case 'edit':
        this.svc.openAdvanced();
        break;
      case 'delete':
        const selectedItems = this.rowData.filter((row) => {
          return row.selected;
        });
        const label = selectedItems.length > 1 ? 'services' : 'service';
        this.openBulkDelete(selectedItems, label);
        break;
      default:
    }
  }

  tableAction(event: any) {
    switch(event?.action) {
      case 'toggleAll':
      case 'toggleItem':
        this.itemToggled(event.item);
        break;
      case 'update':
        this.svc.openAdvanced(event.item.id);
        break;
      case 'create':
        this.svc.openSelection();
        break;
      case 'delete':
        this.deleteItem(event.item)
        break;
      case 'download-all':
        this.svc.downloadAllItems();
        break;
      case 'download-selected':
        this.svc.downloadItems(this.selectedItems);
        break;
      default:
        break;
    }
  }

  deleteItem(item: any) {
    this.openBulkDelete([item], 'service');
  }

  getServiceRoleAttributes() {
    this.svc.getServiceRoleAttributes().then((result: any) => {
      this.serviceRoleAttributes = result.data;
    });
    this.svc.getIdentityRoleAttributes().then((result: any) => {
      this.identityRoleAttributes = result.data;
    });
  }

  dataChanged(event) {
    this.formDataChanged = event;
  }

  get showCardList() {
    return this.svc.sideModalOpen && this.svc.serviceType === '';
  }

  closeModal(event?) {
    if (event?.data === 'cards') {
      this.svc.serviceType = '';
      return;
    }
    this.svc.serviceType = '';
    this.svc.sideModalOpen = false;
    if(event?.refresh) {
      this.refreshData();
      this.getServiceRoleAttributes();
    }
  }

  serviceTypeSelected(event) {
    this.svc.serviceType = event;
  }

}
