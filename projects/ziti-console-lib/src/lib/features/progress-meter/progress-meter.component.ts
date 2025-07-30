import {Component, EventEmitter, Input, Output} from '@angular/core';

export class ProgressMeterStep {
  index = 0;
  label: string = '';
  state: '' | 'TO_DO' | 'IN_PROGRESS' | 'COMPLETE' | 'ERROR' | 'WARNING' = '';
};

@Component({
  selector: 'lib-progress-meter',
  templateUrl: './progress-meter.component.html',
  styleUrls: ['./progress-meter.component.scss']
})
export class ProgressMeterComponent {

  errors: any = {};

  @Input() title = '';
  @Input() steps: ProgressMeterStep[] = [];
  @Input() currentStepIndex = 0;
  @Output() currentStepChange = new EventEmitter<any>;

  constructor() {}

  getProgressBarStyle(index) {
    const step = this.steps[index];
    const nextStep = this.steps[index + 1];
    if (step?.state === 'COMPLETE' && nextStep?.state === 'COMPLETE') {
      return true;
    }
    return false;
  }

}
