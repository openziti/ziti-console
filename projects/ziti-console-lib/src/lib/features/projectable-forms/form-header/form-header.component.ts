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
import {isFunction, defer} from 'lodash';

@Component({
  selector: 'lib-form-header',
  templateUrl: './form-header.component.html',
  styleUrls: ['./form-header.component.scss']
})
export class FormHeaderComponent {
  @Input() data: any = {};
  @Input() badges: any = [];
  @Input() title = '';
  @Input() moreActions: any = [];
  @Input() formView = 'simple';
  @Input() saveDisabled = false;
  @Input() saveTooltip = '';
  @Input() actionButtonText = 'Save';
  @Input() moreActionsText = 'More Actions';
  @Input() showHeaderToggle = true;
  @Input() showHeaderButton = true;
  @Output() formViewChange: EventEmitter<string> = new EventEmitter<string>();
  @Output() actionRequested: EventEmitter<any> = new EventEmitter<any>();

  showActionsDropDown = false;

  constructor() {}

  get hasMoreActions() {
    let hasMoreActions = false;
    this.moreActions?.forEach(action => {
      if (!isFunction(action.hidden) || !action.hidden()) {
        hasMoreActions = true;
      }
    });
    return hasMoreActions;
  }

  requestAction(action) {
    if (action?.name === 'save' && this.saveDisabled) {
      return;
    }
    if (action.name === 'toggle-view') {
      if (action.data === 'simple') {
        this.formView = 'raw';
      } else {
        this.formView = 'simple';
      }
      action.data = this.formView;
      this.formViewChange.emit();
    }
    if (action.callback) {
      action.callback();
    }
    this.actionRequested.emit({name: action.name, data: action.data})
    this.showActionsDropDown = false;
  }

  showMoreActions() {
    defer(() => {
      this.showActionsDropDown = true;
    });
  }

  closeActionsMoreActions() {
    defer(() => {
      this.showActionsDropDown = false;
    });
  }

  get headerBadges() {
    return this.data.badges || this.badges;
  }
}
