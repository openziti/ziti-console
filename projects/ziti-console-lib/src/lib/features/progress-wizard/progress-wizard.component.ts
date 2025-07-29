import {Component, EventEmitter, Inject, Input, Output, ViewChild} from '@angular/core';
import {delay, defer, isEmpty} from "lodash";
import {cloneDeep} from 'lodash-es';

export class ProgressWizardStep {
  index = 0;
  label: string = '';
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
  @Input() backButtonLabel = 'Back';
  @Input() nextButtonLabel = 'Next';
  @Input() nextButtonDisabled = false;
  @Input() titleImageSrc = '';
  @Input() showCloseButton = true;
  @Input() currentStepIndex = 0;
  @Output() currentStepIndexChange = new EventEmitter<any>;
  @Output() close = new EventEmitter<any>;
  @Output() done = new EventEmitter<any>;
  @Output() stepChanged = new EventEmitter;

  constructor() {}

  cancel() {
    this.close.emit();
  }

  confirm() {
    this.close.emit();
  }

  nextStep() {
    if (this.currentStepIndex >= (this.steps.length - 1)) {
      this.done.emit();
      return;
    }
    this.currentStepIndex++;
    this.currentStepIndexChange.emit(this.currentStepIndex);
    this.stepChanged.emit(this.steps[this.currentStepIndex]);
  }

  goToStep(stepNum) {
    this.currentStepIndex = stepNum.index;
    this.currentStepIndexChange.emit(this.currentStepIndex);
    this.stepChanged.emit(this.steps[this.currentStepIndex]);
  }

  prevStep() {
    this.currentStepIndex--;
    this.currentStepIndexChange.emit(this.currentStepIndex);
    this.stepChanged.emit(this.steps[this.currentStepIndex]);
  }

  get progressTrackHeight() {
    const heightfactor = 8.333;
    const trackNumber = ((this.steps ? this.steps.length : 1) - 1);
    const trackHeight = heightfactor * trackNumber;
    return trackHeight + 'rem';
  }
}
