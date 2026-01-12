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

import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
    selector: 'lib-form-field-toggle',
    templateUrl: './form-field-toggle.component.html',
    styleUrls: ['./form-field-toggle.component.scss'],
    standalone: false
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
  }

  toggleSwitch() {
    this.toggleOn = !this.toggleOn;
    this.toggleOnChange.emit(this.toggleOn);
  }

}
