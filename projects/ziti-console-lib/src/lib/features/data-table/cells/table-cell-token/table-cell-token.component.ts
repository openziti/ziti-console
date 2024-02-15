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

import { Component } from '@angular/core';
import {ICellRendererAngularComp} from "ag-grid-angular";
import {ICellRendererParams} from "ag-grid-community";

import {isEmpty} from 'lodash';
import {MatDialog} from "@angular/material/dialog";
import {QrCodeComponent} from "../../../qr-code/qr-code.component";

import moment from "moment";

@Component({
  selector: 'lib-table-cell-token',
  templateUrl: './table-cell-token.component.html',
  styleUrls: ['./table-cell-token.component.scss']
})
export class TableCellTokenComponent implements ICellRendererAngularComp {

  cellParams: any;
  item: any;
  dialogRef: any;

  constructor(public dialogForm: MatDialog) {
  }

  agInit(params: ICellRendererParams): void {
    this.cellParams = params;
    this.item = params.data;
  }

  get hasEnrolmentToken() {
    let token;
    let expiration;
    if (this.item?.enrollment?.ott?.jwt) {
      token = this.item?.enrollment?.ott?.jwt
      expiration = this.item?.enrollment?.ott?.expiresAt;
    } else if (this.item?.enrollment?.ottca?.jwt) {
      token = this.item?.enrollment?.ottca?.jwt;
      expiration = this.item?.enrollment?.ottca?.expiresAt;
    } else if (this.item?.enrollment?.updb?.jwt) {
      token = this.item?.enrollment?.updb?.jwt;
      expiration = this.item?.enrollment?.updb?.expiresAt;
    }
    return this.item.enrollmentToken || (token && !moment(expiration).isBefore());
  }

  getJWT(item: any) {
    if (!isEmpty(item.enrollmentJwt)) {
      return item.enrollmentJwt;
    }
    let qrCode;
    if (!isEmpty(item?.enrollment?.ott?.jwt)) {
      qrCode = item?.enrollment?.ott?.jwt;
    } else if (!isEmpty(item?.enrollment?.ottca?.jwt)) {
      qrCode = item?.enrollment?.ottca?.jwt;
    } else if(!isEmpty(item?.enrollment?.updb?.jwt)) {
      qrCode = item?.enrollment?.updb?.jwt;
    }
    return qrCode;
  }

  getEnrollmentExpiration(item: any) {
    let expiresAt;
    if (!isEmpty(item?.enrollment?.ott?.expiresAt)) {
      expiresAt = item?.enrollment?.ott?.expiresAt;
    } else if (!isEmpty(item?.enrollment?.ottca?.expiresAt)) {
      expiresAt = item?.enrollment?.ottca?.expiresAt;
    } else if(!isEmpty(item?.enrollment?.updb?.expiresAt)) {
      expiresAt = item?.enrollment?.updb?.expiresAt;
    }
    return expiresAt;
  }

  downloadCert() {
    const jwt = this.getJWT(this.item);
    const element = document.createElement('a');
    element.setAttribute('href', 'data:application/ziti-jwt;charset=utf-8,' + encodeURIComponent(jwt));
    element.setAttribute('download', this.item.name+".jwt");
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  showQRCode() {
    const data = {
      jwt: this.getJWT(this.item),
      expiration: this.getEnrollmentExpiration(this.item),
      qrCodeSize: 400,
      identity: this.item
    };
    this.dialogRef = this.dialogForm.open(QrCodeComponent, {
      data: data,
      autoFocus: false,
    });
  }

  refresh(params: ICellRendererParams<any>): boolean {
    this.cellParams = params;
    this.item = params.data;
    return true;
  }
}
