import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {isEmpty, isNil} from "lodash";
import {ConfirmComponent} from "../confirm/confirm.component";
import {GrowlerModel} from "../messaging/growler.model";
import {GrowlerService} from "../messaging/growler.service";

@Component({
  selector: 'lib-creation-summary-dialog',
  templateUrl: './creation-summary-dialog.component.html',
  styleUrls: ['./creation-summary-dialog.component.scss']
})
export class CreationSummaryDialogComponent {

  selectedApiData = '';
  selectedApiUrl = '';
  selectedCliCommand = '';
  selectedEntityType = 'service';
  selectedEntityName = '';

  summaryData: any = [];
  showAPI = false;
  hasError = false;
  hideSummaryNextTime = false;

  constructor(private dialogRef: MatDialogRef<ConfirmComponent>, @Inject(MAT_DIALOG_DATA) public data: any, private growlerService: GrowlerService) {
    this.summaryData = data.summaryData;
  }

  get hasCreationError() {
    let hasError = false;
    this.summaryData.forEach((group) => {
      group.entities.forEach((entity) => {
        if (entity.status === 'error') {
          hasError = true;
        }
      });
    });
    return hasError;
  }

  selectZitiEntity(entity, type) {
    this.selectedEntityName = entity.name;
    this.selectedCliCommand = entity.cliCommand;
    this.selectedApiUrl = entity.apiUrl;
    this.selectedApiData = entity.apiData;
    this.selectedEntityType = type;
  }

  toggleAPIView() {
    this.showAPI = !this.showAPI;
  }

  copyCliCommands() {
    let clipboardContent = '';
    this.summaryData.forEach((group) => {
      group.entities.forEach((entity) => {
        clipboardContent += (entity.cliCommand + '\r\n');
      });
    });
    navigator.clipboard.writeText(clipboardContent);
    const growlerData = new GrowlerModel(
        'success',
        'Success',
        `Text Copied`,
        `CLI commands copied to clipboard`,
    );
    this.growlerService.show(growlerData);
  }

  copyAPIRequests() {
    let clipboardContent = '';
    this.summaryData.forEach((group) => {
      group.entities.forEach((entity) => {
        clipboardContent += (entity.apiRequest + '\r\n');
      });
    });
    navigator.clipboard.writeText(clipboardContent);
    const growlerData = new GrowlerModel(
        'success',
        'Success',
        `Text Copied`,
        `API requests copied to clipboard`,
    );
    this.growlerService.show(growlerData);
  }

  doRetry(entityData) {
    entityData.loading = 'loading';
    entityData.retry(this.summaryData);
  }

  close() {
    this.dialogRef.close('cancel');
  }

  done() {
    this.dialogRef.close('done');
  }

  confirm() {
    this.dialogRef.close('new');
  }
}
