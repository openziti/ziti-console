import {Component, EventEmitter, Inject, Input, Output, ViewChild} from '@angular/core';

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
export class ProgressMeterComponent {

  errors: any = {};

  @Input() title = '';
  @Input() steps: ProgressMeterStep[] = [];
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

  getProgressBarStyle(index) {
    const step = this.steps[index];
    const nextStep = this.steps[index + 1];
    if (step?.state === 'COMPLETE' && nextStep?.state === 'COMPLETE') {
      return true;
    }
    return false;
  }

}
