import {Component, Inject} from '@angular/core';
import {DialogRef} from "@angular/cdk/dialog";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";

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
    cancelLabel: '',
    bulletList: [],
    showCancel: false
  }

  constructor(private dialogRef: MatDialogRef<ConfirmComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {
    this.dataObj = data;
  }

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
