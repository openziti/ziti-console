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

import {Component, EventEmitter, Input, Output, OnChanges, Inject, Optional} from '@angular/core';
import moment from 'moment';
import {isEmpty} from 'lodash';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {IdentitiesPageService} from "../../pages/identities/identities-page.service";
import {DialogRef} from "@angular/cdk/dialog";

@Component({
  selector: 'lib-qr-code',
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.scss']
})
export class QrCodeComponent implements OnChanges {

  @Input() jwt: any;
  @Input() token: any;
  @Input() expiration: any;
  @Input() identity: any = {};
  @Input() type: string = 'identity';
  @Input() authenticators: any;
  @Output() doRefresh: EventEmitter<boolean> = new EventEmitter<boolean>();

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
      this.token = data.token;
      this.expiration = data.expiration;
      this.qrCodeSize = data.qrCodeSize || 200;
      this.jwtExpired = this.getJwtExpired();
      this.expirationDate = this.getExpirationDate();
      this.isModal = true;
      this.identity = data.identity;
    }
  }

  get hasJWT() {
    return !isEmpty(this.jwt);
  }

  get showResetToken() {
    return this.authenticators?.cert?.id || this.authenticators?.updb?.id;
  }

  get showReissueToken() {
    return (this.identity?.enrollment?.ott?.id || this.identity?.enrollment?.updb?.id) && moment(this.expiration).isBefore();
  }

  getJwtExpired() {
    return moment(this.expiration).isBefore();
  }

  getExpirationDate() {
    return moment(this.expiration).local().format('M/D/YY h:mm a');
  }

  reissue() {
    const dialogRef: MatDialogRef<any> = this.identitiesSvc.reissueJWT(this.identity);
    dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.doRefresh.emit(true);
        }
    });
  }

  reset() {
    const dialogRef: MatDialogRef<any> = this.identitiesSvc.resetJWT(this.identity);
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.doRefresh.emit(true);
      }
    });
  }

  ngOnChanges() {
    this.jwtExpired = this.getJwtExpired();
    this.expirationDate = this.getExpirationDate();
  }
}
