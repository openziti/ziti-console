import {Component, EventEmitter, Inject, Input, Output, ViewChild} from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import {delay, defer, isEmpty} from "lodash";
import {
  TableColumnDefaultComponent
} from '../data-table/column-headers/table-column-default/table-column-default.component';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {DataTableComponent} from '../data-table/data-table.component';
import {map} from 'rxjs';
import {FirewallConfigComponent} from '../firewall-config/firewall-config.component';
import {cloneDeep} from 'lodash-es';
import {FirewallFormService} from '../../forms/firewall/firewall-form.service';

export class ProgressWizardStep {
  index = 0;
  label: '';
};

export class ProgressMeterStep {
  index = 0;
  label: '';
  state: 'TO_DO' | 'IN_PROGRESS' | 'COMPLETE' | 'FAILED'
};

@Component({
  selector: 'lib-progress-wizard',
  templateUrl: './progress-wizard.component.html',
  styleUrls: ['./progress-wizard.component.scss']
})
export class ProgressWizardComponent {

  errors: any = {};

  @Input() title = '';
  @Input() steps: ProgressWizardStep[] = [];
  @Input() currentStepIndex = 0;
  @Output() currentStepChange = new EventEmitter<any>;

  @Output() close = new EventEmitter<any>;

  constructor() {}

  cancel() {
    this.close.emit();
  }

  confirm() {
    this.close.emit();
  }

  nextStep() {
    if (this.currentStepIndex >= (this.steps.length - 1)) {
      this.close.emit();
      return;
    }
    this.currentStepIndex++;
  }

  goToStep(stepNum) {
    this.currentStepIndex = stepNum;
  }

  prevStep() {
    this.currentStepIndex--;
  }

  getProgressBarStyle(index) {
    const step = this.steps[index];
    const nextStep = this.steps[index + 1];
    if (step?.complete && nextStep?.complete) {
      return true;
    }
    return false;
  }

  setDefaultConfiguration() {
    const appData = cloneDeep(DEFAULT_GLOBAL_CONFIG);
    appData.id = crypto.randomUUID();
    const networkInterfaceDefs = {};
    this.availableInterfaces.forEach((networkInterface: any) => {
      const defaultConfig = cloneDeep(DEFAULT_INTERFACE_CONFIG);
      networkInterfaceDefs[networkInterface.name] = defaultConfig;
    });
    appData.interfaces = networkInterfaceDefs;
    this.firewallInstance.appData = appData;
    this.saveFirewallConfig();
  }

  saveFirewallConfig() {
    this.currentProgressStep = 0
    this.updatingFirewallConfig = true;
    delay(() => {
      this.steps[0].complete = true;
      this.currentProgressStep = 1;
    }, 800);
    delay(() => {
      this.steps[1].complete = true;
      this.currentProgressStep = 2;
    }, 1650);
    delay(() => {
      this.steps[2].complete = true;
      this.currentProgressStep = -1;
      this.updatingFirewallConfig = false;
      this.configUpdated = true;
    }, 2300);
    return;
    this.firewallSvc.save(this.firewallInstance).subscribe({
      next: (result) => {
        if (result?.close) {
          // Save Success
          return;
        }
      },
      complete: () => {
        this.steps[0].complete = true;
        this.currentProgressStep = 1;
        delay(() => {
          this.steps[1].complete = true;
          this.currentProgressStep = 2;
        }, 2000);
        delay(() => {
          this.steps[2].complete = true;
          this.currentProgressStep = -1;
        }, 4000);
      }
    });
  }
}
