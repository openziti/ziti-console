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

import {Component, Inject, ViewChild, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {GrowlerModel} from "../messaging/growler.model";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../../services/ziti-data.service";
import {GrowlerService} from "../messaging/growler.service";
import {isEmpty} from "lodash";
import moment from "moment";

@Component({
  selector: 'lib-reset-enrollment',
  templateUrl: './reset-enrollment.component.html',
  styleUrls: ['./reset-enrollment.component.scss']
})
export class ResetEnrollmentComponent implements OnInit {

  identity: any;
  dateValue = moment().add(2, 'days').toDate();
  showIcon: boolean = true;
  @ViewChild('calendar', { static: false }) calendar: any;
  constructor(
      private dialogRef: MatDialogRef<ResetEnrollmentComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any,
      @Inject(ZITI_DATA_SERVICE) private dataService: ZitiDataService,
      private growlerService: GrowlerService
  ) {
    this.identity = data;
  }

  ngOnInit() {
    this.dialogRef.addPanelClass('reset-enroll-dialog-container');
  }

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }

  resetEnrollment() {
    let id = this.identity?.authenticators?.cert?.id || this.identity?.authenticators?.updb?.id;
    if (!id) {
      if(!isEmpty(this.identity?.enrollment?.ott)) {
        id = this.identity?.enrollment?.ott.id;
      } else if(!isEmpty(this.identity?.enrollment?.ottca)) {
        id = this.identity?.enrollment?.ottca.id;
      } else if (!isEmpty(this.identity?.enrollment?.updb)) {
        id = this.identity?.enrollment?.updb.id;
      }
    }
    const dateObj: any = moment(this.dateValue);
    return this.dataService.resetEnrollment(id, dateObj).then(() => {
      const growlerData = new GrowlerModel(
          'success',
          'Success',
          `Enrollment Reset`,
          `Successfully reissued enrollment token`,
      );
      this.growlerService.show(growlerData);
      this.confirm();
    }).catch((error) => {
      const growlerData = new GrowlerModel(
          'error',
          'Error',
          `Reset Failed`,
          `Failed to reissues enrollment token`,
      );
      this.growlerService.show(growlerData);
    });
  }
}
