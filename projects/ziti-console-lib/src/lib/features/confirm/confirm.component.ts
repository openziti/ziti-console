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

import {Component, Inject} from '@angular/core';
import {DialogRef} from "@angular/cdk/dialog";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";

import {isEmpty, isNil} from "lodash";

@Component({
  selector: 'lib-confirm',
  templateUrl: './confirm.component.html',
  styleUrls: ['./confirm.component.scss']
})
export class ConfirmComponent {

  dataObj = {
    appendId: '',
    title: '',
    subtitle: '',
    message: '',
    confirmLabel: '',
    confirmLabelAlt: undefined,
    cancelLabel: '',
    bulletList: [],
    submessage: '',
    showCancelButton: false,
    showCancelLink: false,
    showSecondaryConfirm: false,
    secondaryConfirmLabel: '',
    secondaryConfirmed: false,
    secondaryActionLabel: undefined,
    secondaryInfoLabel: undefined,
    secondaryAction: undefined,
    imageUrl: '../../assets/svgs/Confirm_Trash.svg'
  }

  constructor(private dialogRef: MatDialogRef<ConfirmComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    this.dataObj = data;
    if (isNil(this.dataObj?.cancelLabel) || isEmpty(this.dataObj?.cancelLabel)) {
      this.dataObj.cancelLabel = 'Oops, no get me out of here';
    }
  }

  confirm() {
    this.dialogRef.close({confirmed: true, secondaryConfirmed: this.dataObj.secondaryConfirmed});
  }

  secondaryAction() {
    if (!this.dataObj.secondaryAction) {
      return;
    }
    this.dataObj.secondaryAction();
  }

  cancel() {
    this.dialogRef.close({confirmed: false, secondaryConfirmed: false});
  }

  toggleSecondary(event) {
    this.dataObj.secondaryConfirmed = !this.dataObj.secondaryConfirmed;
  }
}
