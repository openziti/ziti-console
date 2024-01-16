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

  dialogRef: any;
  serviceRoleAttributes: any[] = [];
  formDataChanged = false;
  isLoading: boolean;
  tabs: { url: string; label: string }[];
  title = 'Manage Services';

  constructor(
      public override svc: ServicesPageService,
      filterService: DataTableFilterService,
      public dialogForm: MatDialog,
      private tabNames: TabNameService,
      consoleEvents: ConsoleEventsService,
      @Inject(ZAC_WRAPPER_SERVICE)private zacWrapperService: ZacWrapperServiceClass,
  ) {
    super(filterService, svc, consoleEvents);
    let userLang = navigator.language || 'en-us';
    userLang = userLang.toLowerCase();
  }

  override ngOnInit() {
    super.ngOnInit();
    this.tabs = this.tabNames.getTabs('services');
  }

  headerActionClicked(action: string) {
    switch(action) {
      case 'add':
        this.svc.openUpdate();
        break;
      case 'edit':
        this.svc.openUpdate();
        break;
      case 'delete':
        const selectedItems = this.rowData.filter((row) => {
          return row.selected;
        }).map((row) => {
          return row.id;
        });
        this.openBulkDelete(selectedItems);
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
    this.openBulkDelete([item.id]);
  }

  private openBulkDelete(selectedItems: any[]) {
    const data = {
      appendId: 'DeleteServices',
      title: 'Delete',
      message: 'Are you sure you would like to delete the selected item(s)?"',
      bulletList: [],
      confirmLabel: 'Yes',
      cancelLabel: 'Cancel'
    };
    this.dialogRef = this.dialogForm.open(ConfirmComponent, {
      data: data,
      autoFocus: false,
    });
    this.dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.svc.removeItems('services', selectedItems).then(() => {
          this.refreshData();
        });
      }
    });
  }

  getServiceRoleAttributes() {
    this.svc.getServiceRoleAttributes().then((result: any) => {
      this.serviceRoleAttributes = result.data;
    });
  }

  dataChanged(event) {
    this.formDataChanged = event;
  }

  closeModal(event?) {
    this.svc.sideModalOpen = false;
    if(event?.refresh) {
      this.refreshData();
      this.getServiceRoleAttributes();
    }
  }

}
