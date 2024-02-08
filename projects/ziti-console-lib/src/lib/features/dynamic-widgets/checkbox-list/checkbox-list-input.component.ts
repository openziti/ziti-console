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
import {defer, isEmpty} from "lodash";

@Component({
  selector: 'lib-checkbox-list-input',
  template: `
    <div [ngClass]="fieldClass">
      <label [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
      <div  *ngFor="let item of items">
          <input type="checkbox"
              class="jsonEntry checkbox"
                 [ngClass]="{'error': error}"
              [checked]="item.checked" (click)="item.checked=!item.checked;updateFieldVal();"/>
          <span class="boxlabel">{{item.name}}</span>
      </div>
      <div *ngIf="error" class="error">{{error}}</div>
    </div>
  `,
  styleUrls: ['./checkbox-list.component.scss'],
})
export class CheckboxListInputComponent {
  items: any[] = [];
  _fieldName = 'Field Label';
  _idName = 'fieldname';
  @Input() set fieldName(name: string) {
    this._fieldName = name;
    this._idName = name.replace(/\s/g, '').toLowerCase();
  }
  _fieldValue: string[] = [];
  @Input() set fieldValue(vals) {
    this._fieldValue = vals;
    this.updateCheckedItems();
  }
  get fieldValue():string [] {
    return this._fieldValue;
  }
  @Input() placeholder = '';
  @Input() parentage: string[] = [];
  @Input() set valueList(list: string[]) {
    this.updateCheckboxItems(list);
  }
  @Input() labelColor = '#000000';
  @Input() fieldClass = '';
  @Input() error = '';
  @Output() fieldValueChange = new EventEmitter<string[]>();
  valueChange = new Subject<string[]> ();

  updateCheckedItems() {
    if (isEmpty(this._fieldValue)) {
      return;
    }
    this.items?.forEach((item) => {
      let checked = false;
      this._fieldValue?.forEach((val) => {
        if (item.name === val) {
          checked = true;
        }
      });
      item.checked = checked;
    });
  }

  updateCheckboxItems(list: string[]) {
    const items: any[] = [];
    list.forEach(v => {
      items.push ({name: v, checked: false});
    });
    this.items = items;
  }

  updateFieldVal() {
    defer(() => {
      this._fieldValue = [];
      this.items.forEach(item => {
        if(item.checked) this._fieldValue.push(item.name);
      });
      this.fieldValueChange.emit(this._fieldValue);
      this.valueChange.next(this._fieldValue);
    });
  }
}

