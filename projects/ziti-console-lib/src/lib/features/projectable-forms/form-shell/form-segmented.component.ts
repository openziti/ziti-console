import {Component, EventEmitter, Input, Output} from '@angular/core';

export interface FormSegment {
  value: any;
  label: string;
}

@Component({
    selector: 'lib-form-segmented',
    templateUrl: './form-segmented.component.html',
    styleUrls: ['./form-segmented.component.scss'],
    standalone: false
})
export class FormSegmentedComponent {
  @Input() options: FormSegment[] = [];
  @Input() value: any;
  @Input() disabled = false;
  @Input() ariaLabel = '';
  @Output() valueChange = new EventEmitter<any>();

  select(option: FormSegment) {
    if (this.disabled || option.value === this.value) {
      return;
    }
    this.valueChange.emit(option.value);
  }
}
