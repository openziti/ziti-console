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
import {debounce} from "lodash";

@Component({
  selector: 'lib-checkbox-list-input',
  template: `
    <div [ngClass]="fieldClass">
      <label [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
      <div  *ngFor="let item of items">
          <input type="checkbox"
              class="jsonEntry"
                 [ngClass]="{'error': error}"
              [checked]="item.checked" (click)="item.checked=!item.checked;update();"/>
          <span class="boxlabel">{{item.name}}</span>
      </div>
      <div *ngIf="error" class="error">{{error}}</div>
    </div>
  `,
  styles:['.boxlabel {text-transform: uppercase; position:absolute;padding-top: 0.3rem; padding-left:0.25rem}',
      'input {width: 1rem; height: 1.5rem; border-radius: 4px;}',
      'input:checked {background-color: var(--green)!important}'
      ]
})
export class CheckboxListInputComponent {
  items: any[] = [];
  _fieldName = 'Field Label';
  _idName = 'fieldname';
  @Input() set fieldName(name: string) {
    this._fieldName = name;
    this._idName = name.replace(/\s/g, '').toLowerCase();
  }  @Input() fieldValue: string[] = [];
  @Input() placeholder = '';
  @Input() parentage: string[] = [];
  @Input() set valueList(list: string[]) {
    const items: any[] = [];
    list.forEach(v => {
      items.push ({name: v, checked: false});
    });
    this.items = items;
}
  @Input() labelColor = '#000000';
  @Input() fieldClass = '';
  @Input() error = '';
  @Output() fieldValueChange = new EventEmitter<string[]>();
  valueChange = new Subject<string[]> ();

  update() {
    debounce(() => {
      this.fieldValue = [];
      this.items.forEach(item => {
        if(item.checked) this.fieldValue.push(item.name);
      });
      this.fieldValueChange.emit(this.fieldValue);
      this.valueChange.next(this.fieldValue);
    }, 500)();
  }
}

