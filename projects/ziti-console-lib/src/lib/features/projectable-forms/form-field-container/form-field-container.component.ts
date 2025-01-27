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

import {Component, Input, Output, EventEmitter} from '@angular/core';

@Component({
  selector: 'lib-form-field-container',
  templateUrl: './form-field-container.component.html',
  styleUrls: ['./form-field-container.component.scss']
})
export class FormFieldContainerComponent {

  @Input() title = '';
  @Input() title2 = undefined;
  @Input() titleIcon = undefined;
  @Input() layout = 'column';
  @Input() helpText: any = undefined;
  @Input() helpText2: any = undefined;
  @Input() label: any = undefined;
  @Input() count: any = undefined;
  @Input() action: any = undefined;
  @Input() actionLabel: string;
  @Input() class = '';
  @Input() contentStyle: any = '';
  @Input() showHeader: any = true;
  @Input() showToggle = false;
  @Input() headerActions: any[];
  @Input() headerToggle = false;

  @Output() actionRequested: EventEmitter<any> = new EventEmitter<any>();
  @Output() headerToggleChange: EventEmitter<boolean> = new EventEmitter<boolean>();
  constructor() {}

  actionClicked(action) {
    this.actionRequested.emit(action);
  }

  toggleHeader(option?) {
    if (option == 'left') {
      this.headerToggle = false;
    } else if (option === 'right') {
      this.headerToggle = true;
    } else {
      this.headerToggle = !this.headerToggle;
    }
    this.headerToggleChange.emit(this.headerToggle);
  }
}
