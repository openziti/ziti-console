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

import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Subject} from "rxjs";
import {debounce} from "lodash";

@Component({
  selector: 'lib-string-input',
  template: `
      <div [ngClass]="fieldClass">
          <label for="schema_{{parentage?parentage+'_':''}}{{_idName}}"  [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
          <input id="schema_{{parentage?parentage+'_':''}}{{_idName}}"
                 type="text" class="jsonEntry"
                 [ngClass]="{'error': error}"
                 [placeholder]="placeholder" [(ngModel)]="fieldValue" (paste)="onKeyup()" (keyup)="onKeyup()"/>
          <div *ngIf="error" class="error">{{error}}</div>
      </div>
  `,
    styles:['input.error {border-color:red;}','div.error {color:red}']
})
export class StringInputComponent {
    _fieldName = 'Field Label';
    _idName = 'fieldname';
    @Input() set fieldName(name: string) {
        this._fieldName = name;
        this._idName = name.replace(/\s/g, '').toLowerCase();
    }
    @Input() fieldValue = '';
    @Input() placeholder = '';
    @Input() parentage: string[] = [];
    @Input() labelColor = '#000000';
    @Input() fieldClass = '';
    @Input() error = '';
    @Output() fieldValueChange = new EventEmitter<string>();
    valueChange = new Subject<string> ();

    onKeyup() {
        debounce(() => {
            this.fieldValueChange.emit(this.fieldValue);
            this.valueChange.next(this.fieldValue);
        }, 500)();
    }
}
