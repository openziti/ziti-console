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
import {ServicePoliciesPageService} from "./service-policies-page.service";
import {ExtensionService} from "../../features/extendable/extensions-noop.service";
import {SERVICE_POLICY_EXTENSION_SERVICE} from "../../features/projectable-forms/service-policy/service-policy-form.service";

// Service Policies page on `lib-list-table`, selected by the route when Beta Features is on.
@Component({
    selector: 'lib-service-policies-list',
    templateUrl: './service-policies-list-page.component.html',
    styleUrls: ['./service-policies-page.component.scss'],
    standalone: false
})
export class ServicePoliciesListPageComponent extends ListPageComponent implements OnInit, OnDestroy {

  title = 'Service Policies';
  tabs: { url: string; label: string }[];
  isLoading = false;
  formDataChanged = false;
  protected override readonly tableId = 'service-policies';
  protected override readonly initialPageSize = 50;

  constructor(
      public override svc: ServicePoliciesPageService,
      filterService: DataTableFilterService,
      dialogForm: MatDialog,
      private tabNames: TabNameService,
      consoleEvents: ConsoleEventsService,
      @Inject(SERVICE_POLICY_EXTENSION_SERVICE) private extService: ExtensionService,
  ) {
    super(filterService, svc, consoleEvents, dialogForm, extService);
  }

  protected override loadTableColumns(): any[] {
    return this.svc.initListTableColumns();
  }

  override ngOnInit() {
    this.tabs = this.tabNames.getTabs('policies');
    this.svc.refreshData = this.refreshData;
    this.getRoleAttributes();
    super.ngOnInit();
  }

  headerActionClicked(action: string) {
    switch(action) {
      case 'add':
        this.svc.serviceType = '';
        this.svc.openEditForm();
        break;
      case 'edit':
        this.svc.openEditForm();
        break;
      case 'delete':
        const selectedItems = this.rowData.filter((row) => {
          return row.selected;
        });
        const label = selectedItems.length > 1 ? 'service policies' : 'service policy';
        this.openBulkDelete(selectedItems, label);
        break;
      default:
    }
  }

  tableAction(event: any) {
    const extensionActionFound = this.handleExtensionActions(event);
    this.trackMenuAction(event?.action, event?.item);
    if (extensionActionFound) {
      return;
    }
    switch(event?.action) {
      case 'toggleAll':
      case 'toggleItem':
        this.itemToggled(event.item);
        break;
      case 'update':
        this.svc.serviceType = 'advanced';
        this.svc.openEditForm(event.item.id);
        break;
      case 'create':
        this.svc.openEditForm();
        break;
      case 'delete':
        this.deleteItem(event.item);
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
      page: 'service-policy',
      item,
      type: 'menu-action'
    });
  }

  getRoleAttributes() {
    this.svc.getServiceRoleAttributes();
    this.svc.getIdentityRoleAttributes();
    this.svc.getServiceNamedAttributes();
    this.svc.getIdentityNamedAttributes();
    this.svc.getPostureNamedAttributes();
  }

  deleteItem(item: any) {
    this.openBulkDelete([item], 'service-policies');
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
