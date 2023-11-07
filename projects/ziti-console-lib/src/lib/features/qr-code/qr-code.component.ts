import {Component, EventEmitter, Input, Output, OnChanges, Inject, Optional} from '@angular/core';
import moment from 'moment';
import {isEmpty} from 'lodash';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {IdentitiesPageService} from "../../pages/identities/identities-page.service";

@Component({
  selector: 'lib-qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss']
})
export class QrCodeComponent implements OnChanges {

  @Input() jwt: any;
  @Input() expiration: any;
  @Input() identity: any = {};

  jwtExpired;
  expirationDate;
  qrCodeSize = 200;
  isModal = false;


  constructor(
      @Optional() private dialogRef: MatDialogRef<QrCodeComponent>,
      @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
      public identitiesSvc: IdentitiesPageService
  )
  {
    if (!isEmpty(data)) {
      this.jwt = data.jwt;
      this.expiration = data.expiration;
      this.qrCodeSize = data.qrCodeSize || 200;
      this.jwtExpired = this.getJwtExpired();
      this.expirationDate = this.getExpirationDate();
      this.isModal = true;
      this.identity = data.identity;
    }
  }

  getJwtExpired() {
    return moment(this.expiration).isBefore();
  }

  getExpirationDate() {
    return moment(this.expiration).local().format('M/D/YY h:mm a');
  }

  ngOnChanges() {
    this.jwtExpired = this.getJwtExpired();
    this.expirationDate = this.getExpirationDate();
  }
}
