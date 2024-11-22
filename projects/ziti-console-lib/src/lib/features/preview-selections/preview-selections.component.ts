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

import {Component, Inject, OnInit} from '@angular/core';
import {DialogRef} from "@angular/cdk/dialog";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";

import {isEmpty, isNil} from "lodash";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../services/ziti-data.service";
import {SERVICE_EXTENSION_SERVICE} from "../projectable-forms/service/service-form.service";
import {ServicesPageService} from "../../pages/services/services-page.service";
import {GrowlerModel} from "../messaging/growler.model";
import {GrowlerService} from "../messaging/growler.service";

@Component({
  selector: 'preview-selections',
  templateUrl: './preview-selections.component.html',
  styleUrls: ['./preview-selections.component.scss']
})
export class PreviewSelectionsComponent implements OnInit {

  allItem = {
    name: 'All',
    id: 'all',
    associatedConfigs: [],
    associatedServicePolicies: []
  };
  dataObj: any = {
    appendId: '',
    title: '',
    subtitle: '',
    selectedItems: [],
    deleteConfirmed: false
  }

  allConfigs = [];
  allServicePolicies = [];

  allConfigsCount = 0;
  allServicePoliciesCount = 0;

  selectedItem: any = {
    associatedConfigs: [],
    associatedServicePolicies: []
  };
  infoMessage = undefined;
  state = '';
  isLoading = true;

  selectedItems = [];
  constructor(
      private dialogRef: MatDialogRef<PreviewSelectionsComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any,
      @Inject(ZITI_DATA_SERVICE) private zitiService: ZitiDataService,
      private servicePageService: ServicesPageService,
      private growlerService: GrowlerService,
  ) {
    this.dataObj = data;
  }

  ngOnInit() {
    this.initSelectedServicesTemp();
  }

  initSelectedServicesTemp() {
    this.isLoading = true;
    this.servicePageService.getAllServicesAndOrphans(this.dataObj.selectedItems).then((result) => {
      const {selectedItems, allItem} = result;
      this.selectedItems = selectedItems;
      this.allItem = allItem;
      this.previewItem(this.allItem);
      this.isLoading = false;
      this.data.itemsToDelete = selectedItems;
      this.allConfigsCount = allItem.associatedConfigs.length;
      this.allServicePoliciesCount = allItem.associatedServicePolicies.length;
    }).catch(() => {
      const growlerData = new GrowlerModel(
          'error',
          'Error',
          `Failed to get service associations`,
          `Unable to retrieve orphaned configs and service policies`,
      );
      this.growlerService.show(growlerData);
      this.isLoading = false;
      this.infoMessage = 'Unable to retrieve orphaned configs and service policies';
      this.state = 'ERROR';
    });
  }

  previewItem(item: any) {
    this.selectedItems.forEach((selectedItem: any) => {
      selectedItem.selected = item.name === selectedItem.name;
    });
    this.selectedItem = item;
  }

  confirm() {
    this.dialogRef.close({confirmed: true});
  }

  return() {
    this.dialogRef.close({confirmed: false});
  }

  cancel() {
    this.dialogRef.close({confirmed: false});
  }
}
