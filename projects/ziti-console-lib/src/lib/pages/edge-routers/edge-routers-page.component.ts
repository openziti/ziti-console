import {Component, Inject, OnInit, OnDestroy} from '@angular/core';

import {EdgeRoutersPageService} from "./edge-routers-page.service";
import {DataTableFilterService} from "../../features/data-table/data-table-filter.service";
import {ListPageComponent} from "../../shared/list-page-component.class";
import {TabNameService} from "../../services/tab-name.service";

import {invoke, isEmpty, defer, unset, cloneDeep} from 'lodash';
import moment from 'moment';
import $ from 'jquery';
import {ConfirmComponent} from "../../features/confirm/confirm.component";
import {MatDialog} from "@angular/material/dialog";
import {ZacWrapperServiceClass, ZAC_WRAPPER_SERVICE} from "../../features/wrappers/zac-wrapper-service.class";
import {SettingsService} from "../../services/settings.service";
import {ConsoleEventsService} from "../../services/console-events.service";
import {EdgeRouter} from "../../models/edge-router";

@Component({
  selector: 'lib-edge-routers',
  templateUrl: './edge-routers-page.component.html',
  styleUrls: ['./edge-routers-page.component.scss']
})
export class EdgeRoutersPageComponent extends ListPageComponent implements OnInit, OnDestroy {

  title = 'Edge Router Management'
  tabs: { url: string, label: string }[] ;
  isLoading = false;
  edgeRouterRoleAttributes: any[] = [];
  formDataChanged = false;

  constructor(
      public override svc: EdgeRoutersPageService,
      filterService: DataTableFilterService,
      dialogForm: MatDialog,
      private tabNames: TabNameService,
      consoleEvents: ConsoleEventsService,
      @Inject(ZAC_WRAPPER_SERVICE)private zacWrapperService: ZacWrapperServiceClass
  ) {
    super(filterService, svc, consoleEvents, dialogForm);
  }

  override ngOnInit() {
    this.tabs = this.tabNames.getTabs('routers');
    this.svc.refreshData = this.refreshData;
    this.zacWrapperService.zitiUpdated.subscribe(() => {
      this.refreshData();
    });
    this.zacWrapperService.resetZacEvents();
    this.getEdgeRouterRoleAttributes();
    super.ngOnInit();
  }

  override ngOnDestroy() {
    this.closeModal();
    super.ngOnDestroy();
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
        });
        const label = selectedItems.length > 1 ? 'routers' : 'router';
        this.openBulkDelete(selectedItems, label);
        break;
      default:
    }
  }

  closeModal(event?) {
    this.svc.sideModalOpen = false;
    if(event?.refresh) {
      this.refreshData();
      this.getEdgeRouterRoleAttributes();
    }
  }

  dataChanged(event) {
    this.formDataChanged = event;
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
      case 'download-enrollment':
        this.downloadJWT(event.item)
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

  downloadJWT(item: any) {
    const jwt = this.svc.getJWT(item);
    this.svc.downloadJWT(jwt, item.name);
  }

  deleteItem(item: any) {
    this.openBulkDelete([item.id], 'router');
  }

  getEdgeRouterRoleAttributes() {
    this.svc.getEdgeRouterRoleAttributes().then((result: any) => {
      this.edgeRouterRoleAttributes = result.data;
    });
  }

  canDeactivate() {
    if (this.formDataChanged && this.svc.sideModalOpen) {
      return confirm('You have unsaved changes. Do you want to leave this page and discard your changes or stay on this page?');
    }
    return true;
  }
}
