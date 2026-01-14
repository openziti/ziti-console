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
import {Router, NavigationEnd, ActivatedRoute} from '@angular/router'
import {IdentitiesPageService} from "./identities-page.service";
import {DataTableFilterService, FilterObj} from "../../features/data-table/data-table-filter.service";
import {ListPageComponent} from "../../shared/list-page-component.class";
import {TabNameService} from "../../services/tab-name.service";
import {MatDialog} from "@angular/material/dialog";
import {ConsoleEventsService} from "../../services/console-events.service";
import {QrCodeComponent} from "../../features/qr-code/qr-code.component";
import {ResetEnrollmentComponent} from "../../features/reset-enrollment/reset-enrollment.component";
import {IDENTITY_EXTENSION_SERVICE} from "../../features/projectable-forms/identity/identity-form.service";
import {ExtensionService} from "../../features/extendable/extensions-noop.service";
import { IdentityServicePathComponent } from "../../features/visualizer/identity-service-path/identity-service-path.component";

@Component({
    selector: 'lib-identities',
    templateUrl: './identities-page.component.html',
    styleUrls: ['./identities-page.component.scss'],
    standalone: false
})
export class IdentitiesPageComponent extends ListPageComponent implements OnInit, OnDestroy {

  title = 'Identities'
  tabs: { url: string, label: string }[] ;
  isLoading = false;
  formDataChanged = false;

  constructor(
      public override svc: IdentitiesPageService,
      filterService: DataTableFilterService,
      dialogForm: MatDialog,
      private tabNames: TabNameService,
      private router: Router,
      consoleEvents: ConsoleEventsService,
      @Inject(IDENTITY_EXTENSION_SERVICE) private extService: ExtensionService,
  ) {
    super(filterService, svc, consoleEvents, dialogForm, extService);
  }

  override ngOnInit() {
    this.tabs = this.tabNames.getTabs('identities');
    this.svc.refreshData = this.refreshData;
    this.subscription.add(
      this.router.events.subscribe((event: any) => {
        if (event instanceof NavigationEnd) {
          this.refreshData();
        }
      })
    );
    this.svc.getIdentityRoleAttributes();
    super.ngOnInit();
  }

  headerActionClicked(action: string) {
    switch(action) {
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
        const label = selectedItems.length > 1 ? 'identities' : 'identity';
        this.openBulkDelete(selectedItems, label);
        break;
      default:
    }
  }

  closeModal(event?) {
    this.svc.sideModalOpen = false;
    if(event?.refresh) {
      this.refreshData();
      this.svc.getIdentityRoleAttributes();
    }
  }

  dataChanged(event) {
    this.formDataChanged = event;
  }

  tableAction(event: any) {
    const extensionActionFound = this.handleExtensionActions(event);
    if (extensionActionFound) {
      return;
    }
    switch(event?.action) {
      case 'toggleAll':
        this.itemToggled(event.item);
        this.rowData.forEach((item) => {
          if (item.typeId === 'Router') {
            item.selected = false;
          }
        });
        break;
      case 'toggleItem':
        this.itemToggled(event.item)
        break;
      case 'update':
        this.svc.openEditForm(event?.item?.id);
        break;
      case 'create':
        this.svc.openEditForm();
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
      case 'reissue-enrollment':
        this.reissueEnrollment(event.item);
        break;
      case "identity-service-path":
        this.openIdentityVisualizer(event.item);
        break;
      case "qr-code":
        this.showQRCode(event.item);
        break;
      case 'download-all':
        this.downloadAllItems();
        break;
      case 'download-selected':
        this.svc.downloadItems(this.selectedItems);
        break;
      case 'reset-mfa':
        this.isLoading = true;
        this.svc.resetMFA(event.item).finally(() => {
          this.isLoading = false;
          this.refreshData();
        });
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
      qrCodeSize: 400,
      identity: item,
    };
    this.dialogRef = this.dialogForm.open(QrCodeComponent, {
      data: data,
      autoFocus: false,
    });
  }

  deleteItem(item: any) {
    this.openBulkDelete([item], 'identity');
  }

  openIdentityVisualizer(identity) {
    this.dialogRef = this.dialogForm.open(IdentityServicePathComponent, {
      data: {
        identity: identity,
      },
      autoFocus: false,
    });
  }

  resetEnrollment(identity) {
    this.dialogRef = this.dialogForm.open(ResetEnrollmentComponent, {
      data: {
        identity: identity,
        type: 'reset',
      },
      autoFocus: false,
    });
    this.dialogRef.afterClosed().subscribe((result) => {
      if(result) {
        this.refreshData(undefined, true);
      }
    });
  }

  reissueEnrollment(identity) {
    this.dialogRef = this.dialogForm.open(ResetEnrollmentComponent, {
      data: {
        identity: identity,
        type: 'reissue',
      },
      autoFocus: false,
    });
    this.dialogRef.afterClosed().subscribe((result) => {
      if(result) {
        this.refreshData(undefined, true);
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
