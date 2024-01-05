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

import {Component, Inject, ViewChild} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {GrowlerModel} from "../features/messaging/growler.model";
import {ZITI_DATA_SERVICE, ZitiDataService} from "../services/ziti-data.service";
import {isEmpty} from "lodash";
import {GrowlerService} from "../features/messaging/growler.service";

@Component({
  selector: 'lib-reset-enrollment',
  templateUrl: './reset-enrollment.component.html',
  styleUrls: ['./reset-enrollment.component.scss']
})
export class ResetEnrollmentComponent {

  dataObj;
  dateValue = new Date();
  showIcon: boolean = true;
  @ViewChild('calendar', { static: false }) calendar: any;
  constructor(
      private dialogRef: MatDialogRef<ResetEnrollmentComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any,
      @Inject(ZITI_DATA_SERVICE) private dataService: ZitiDataService,
      private growlerService: GrowlerService
  ) {
    this.dataObj = data;
  }

  confirm() {
    this.dialogRef.close(true);
  }

  cancel() {
    this.dialogRef.close(false);
  }

  setDate(event) {
    console.log(event);
  }

  resetEnrollment(identity: any, date: any) {
    let id = identity?.authenticators?.cert?.id;
    if (!id) {
      if(!isEmpty(identity?.enrollment?.ott)) {
        id = identity?.enrollment?.ott.id;
      } else if(!isEmpty(identity?.enrollment.ottca)) {
        id = identity?.enrollment?.ottca.id;
      } else if (!isEmpty(identity?.enrollment.updb)) {
        id = identity?.enrollment?.updb.id;
      }
    }
    return this.dataService.resetEnrollment(id, date).then(() => {
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
