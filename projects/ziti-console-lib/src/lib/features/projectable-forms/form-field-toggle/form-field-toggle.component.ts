import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'lib-form-field-toggle',
  templateUrl: './form-field-toggle.component.html',
  styleUrls: ['./form-field-toggle.component.scss']
})
export class FormFieldToggleComponent {

  @Input() label = 'Show More Options';
  @Input() orientation = 'row';
  @Input() labelOn = 'ON';
  @Input() labelOff = 'OFF';
  @Input() toggleOn = false;
  @Output() toggleOnChange = new EventEmitter<boolean>();

  enterKeyPressed(event) {
    this.toggleSwitch();
    event.stopPropagation();
    event.preventDefault();
  }

  toggleSwitch() {
    this.toggleOn = !this.toggleOn;
    this.toggleOnChange.emit(this.toggleOn);
  }

}
