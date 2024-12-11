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
import {Subject} from "rxjs";
import {debounce, isEmpty} from "lodash";

@Component({
  selector: 'lib-text-list-input',
  template: `
    <div [ngClass]="fieldClass + (!_isValid ? ' invalid' : '')">
      <label for="schema_{{parentage?parentage+'_':''}}{{_idName}}"  [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
      <p-chips id="schema_{{parentage?parentage+'_':''}}{{_idName}}"
          (keyup)="onKeyup($event)"
          [(ngModel)]="fieldValue"
          [allowDuplicate]="false"
          [placeholder]="placeholder"
          [addOnBlur]="true"
          [ngClass]="fieldClass + (!_isValid ? ' invalid' : '')" 
          (onBlur)="emitEvents()"
          separator=",">
      </p-chips>
      <div *ngIf="error" class="error">{{error}}</div>
    </div>
 `,
  styleUrls:['./text-list-input.component.scss'  ]
})
export class TextListInputComponent {
  _fieldName = 'Field Label';
  _idName = 'fieldname';
  @Input() set fieldName(name: string) {
    this._fieldName = name;
    this._idName = name.replace(/\s/g, '').toLowerCase();
  }

  _fieldValue: any = '';
  @Input('fieldValue')
  set fieldValue(val) {
    this._fieldValue = val;
  }

  get fieldValue() {
    const val = isEmpty(this._fieldValue) ? undefined : this._fieldValue;
    return val;
  }

  @Input() placeholder = '';
  @Input() parentage: string[] = [];
  @Input() labelColor = '#000000';
  @Input() fieldClass = '';
  @Input() error = '';
  @Output() fieldValueChange = new EventEmitter<string>();
  valueChange = new Subject<string> ();

  onKeyup(event: any) {
    const key = event.key?.toLowerCase();
    if (key === " " || key === 'enter') {
      event.preventDefault();
      event.stopPropagation();
      const element = event.target as HTMLElement;
      element.blur();
      element.focus();
    }
    this.emitEvents();
  }

  emitEvents() {
    debounce(() => {
      this.fieldValueChange.emit(this.fieldValue);
      this.valueChange.next(this.fieldValue);
    }, 500)();
  }

  _isValid = true;
  public setIsValid(isValid) {
    this._isValid = isValid;
  }

}
