import {Component, Inject, OnInit, OnDestroy} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router'
import {IdentitiesPageService} from "./identities-page.service";
import {DataTableFilterService} from "../../features/data-table/data-table-filter.service";
import {ListPageComponent} from "../../shared/list-page-component.class";
import {TabNameService} from "../../services/tab-name.service";
import {ConfirmComponent} from "../../features/confirm/confirm.component";
import {MatDialog} from "@angular/material/dialog";
import {ZacWrapperServiceClass, ZAC_WRAPPER_SERVICE} from "../../features/wrappers/zac-wrapper-service.class";
import {ConsoleEventsService} from "../../services/console-events.service";
import {QrCodeComponent} from "../../features/qr-code/qr-code.component";
import {ResetEnrollmentComponent} from "../../features/reset-enrollment/reset-enrollment.component";

@Component({
  selector: 'lib-identities',
  templateUrl: './identities-page.component.html',
  styleUrls: ['./identities-page.component.scss']
})
export class IdentitiesPageComponent extends ListPageComponent implements OnInit, OnDestroy {

  title = 'Identity Management'
  tabs: { url: string, label: string }[] ;
  dialogRef: any;
  isLoading = false;
  identityRoleAttributes: any[] = [];
  formDataChanged = false;

  constructor(
      public override svc: IdentitiesPageService,
      filterService: DataTableFilterService,
      public dialogForm: MatDialog,
      private tabNames: TabNameService,
      @Inject(ZAC_WRAPPER_SERVICE)private zacWrapperService: ZacWrapperServiceClass,
      private router: Router,
      consoleEvents: ConsoleEventsService,
  ) {
    super(filterService, svc, consoleEvents);
  }

  override ngOnInit() {
    this.tabs = this.tabNames.getTabs('identities');
    this.svc.refreshData = this.refreshData;
    this.subscription.add(
      this.zacWrapperService.zitiUpdated.subscribe(() => {
        this.refreshData();
      })
    );
    this.subscription.add(
      this.router.events.subscribe((event: any) => {
        if (event instanceof NavigationEnd) {
          this.refreshData();
        }
      })
    );
    this.zacWrapperService.resetZacEvents();
    this.getIdentityRoleAttributes();
    super.ngOnInit();
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

  closeModal(event?) {
    this.svc.sideModalOpen = false;
    if(event?.refresh) {
      this.refreshData();
      this.getIdentityRoleAttributes();
    }
  }

  dataChanged(event) {
    this.formDataChanged = event;
  }

  private openBulkDelete(selectedItems: any[]) {
      const data = {
        appendId: 'DeleteIdentities',
        title: 'Delete',
        message: 'Are you sure you would like to delete the selected Identities?',
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
          this.svc.removeItems('identities', selectedItems).then(() => {
            this.refreshData();
          });
        }
      });
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
      case 'override':
        this.svc.openOverridesModal(event.item);
        break;
      case 'delete':
        this.deleteItem(event.item)
        break;
      case 'download-enrollment':
        this.downloadJWT(event.item)
        break;
      case 'reset-enrollment':
        this.resetEnrollment(event.item);
        break;
      case 'qr-code':
        this.showQRCode(event.item)
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

  showQRCode(item: any) {
    const data = {
      jwt: this.svc.getJWT(item),
      expiration: this.svc.getEnrollmentExpiration(item),
      qrCodeSize: 300,
      identity: item
    };
    this.dialogRef = this.dialogForm.open(QrCodeComponent, {
      data: data,
      autoFocus: false,
    });
  }

  deleteItem(item: any) {
    this.openBulkDelete([item.id]);
  }

  getIdentityRoleAttributes() {
    this.svc.getIdentitiesRoleAttributes().then((result: any) => {
      this.identityRoleAttributes = result.data;
    });
  }

  resetEnrollment(identity) {
    this.dialogRef = this.dialogForm.open(ResetEnrollmentComponent, {
      data: identity,
      autoFocus: false,
    });
    this.dialogRef.afterClosed().subscribe((result) => {
      if(result) {
        this.refreshData();
      }
    })
  }

  override ngOnDestroy() {
    super.ngOnDestroy();
  }

  canDeactivate() {
    if (this.formDataChanged && this.svc.sideModalOpen) {
      return confirm('You have unsaved changes. Do you want to leave this page and discard your changes or stay on this page?');
    }
    return true;
  }
}
