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
import {PreviewSelectionsComponent} from "../../features/preview-selections/preview-selections.component";
import {GrowlerModel} from "../../features/messaging/growler.model";
import {GrowlerService} from "../../features/messaging/growler.service";
import {ServicePolicyFormService} from "../../features/projectable-forms/service-policy/service-policy-form.service";
import semver from 'semver';
import {SETTINGS_SERVICE, SettingsService} from "../../services/settings.service";
import {Subscription} from "rxjs";
import {isEmpty} from "lodash";

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
  title = 'Services';
  confirmData: any = {};
  version: '';

  constructor(
      public override svc: ServicesPageService,
      filterService: DataTableFilterService,
      dialogForm: MatDialog,
      private tabNames: TabNameService,
      consoleEvents: ConsoleEventsService,
      @Inject(ZAC_WRAPPER_SERVICE)private zacWrapperService: ZacWrapperServiceClass,
      private growlerService: GrowlerService,
      @Inject(SETTINGS_SERVICE) private settingsService: SettingsService,
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

  override openBulkDelete(selectedItems: any[], entityTypeLabel = 'item(s)', ) {
    const selectedIds = selectedItems.map((row) => {
      return row.id;
    });
    const selectedNames = selectedItems.map((item) => {
      return item.name;
    });
    const countLabel = selectedItems.length > 1 ? selectedItems.length : '';
    this.selectedItems = selectedItems;
    const showSecondaryConfirm = !isEmpty(this.settingsService?.zitiSemver) && semver.gte(this.settingsService?.zitiSemver, '1.1.8')
    this.confirmData = {
      appendId: 'DeleteServices',
      title: 'Delete Services',
      message: `Are you sure you would like to delete the following ${countLabel} ${entityTypeLabel}?`,
      bulletList: selectedNames,
      showSecondaryConfirm: showSecondaryConfirm,
      secondaryConfirmLabel: 'Delete all orphaned associated configs and service policies?',
      secondaryConfirmed: false,
      secondaryInfoLabel: `Choosing this option will also delete any associated configs and/or service policies that ONLY make reference to these selected services`,
      confirmLabel: 'Yes',
      cancelLabel: 'Oops, no get me out of here',
      secondaryActionLabel: 'Preview Deletions',
      confirmLabelAlt: 'Delete All',
      imageUrl: '../../assets/svgs/Confirm_Trash.svg',
      secondaryAction: this.openPreviewSelections.bind(this),
      showCancelLink: true,
    };
    this.dialogRef = this.dialogForm.open(ConfirmComponent, {
      data: this.confirmData,
      autoFocus: false,
    });
    this.dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmed) {
        if (this.confirmData.secondaryConfirmed) {
          this.svc.getAllServicesAndOrphans(this.selectedItems).then((result) => {
            this.svc.removeAllServicesAndOrphans(result.selectedItems).then(() => {
              const growlerData = new GrowlerModel(
                  'success',
                  'Success',
                  `Services Deleted`,
                  `Successfully deleted selected services and entities`,
              );
              this.growlerService.show(growlerData);
              this.refreshData(this.svc.currentSort);
            }).catch(() => {
              const growlerData = new GrowlerModel(
                  'error',
                  'Error',
                  `Failed to delete services`,
                  `An error occured when deleting the selected services, configs, and service policies`,
              );
              this.growlerService.show(growlerData);
            });
          }).catch(() => {
            const growlerData = new GrowlerModel(
                'error',
                'Error',
                `Failed to get service associations`,
                `Unable to retrieve orphaned configs and service policies`,
            );
            this.growlerService.show(growlerData);
            return {selectedItems: undefined, allItem: undefined, success: true};
          });
        } else {
          this.svc.removeItems(selectedIds).then(() => {
            this.refreshData(this.svc.currentSort);
          });
        }
      }
    });
  }

  openPreviewSelections() {
    const data = {
      selectedItems: this.selectedItems,
      itemsToDelete: this.selectedItems,
      deleteConfirmed: this.confirmData.secondaryConfirmed
    };
    const dialogRef = this.dialogForm.open(PreviewSelectionsComponent, {
      data: data,
      autoFocus: false,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result?.confirmed) {
        this.svc.removeAllServicesAndOrphans(data.itemsToDelete).then(() => {
          const growlerData = new GrowlerModel(
              'success',
              'Success',
              `Services Deleted`,
              `Successfully deleted selected services and entities`,
          );
          this.growlerService.show(growlerData);
          this.refreshData(this.svc.currentSort);
        });
        this.dialogRef.close();
      }
    });
  }
}
