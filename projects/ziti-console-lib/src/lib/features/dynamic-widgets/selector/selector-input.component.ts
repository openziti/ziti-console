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
  selector: 'lib-selector-input',
  template: `
    <div [ngClass]="fieldClass">
      <label [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
      <select id="schema_{{parentage?parentage+'_':''}}{{_idName}}"
             class="jsonEntry"
              [ngClass]="{'error': error}"
             [(ngModel)]="fieldValue" (change)="selected()">
          <option value="">{{placeholder}}</option>
        <ng-container *ngIf="!listIsObject">
          <option *ngFor="let name of _valueList" [value]="name">{{name}}</option>
        </ng-container>
        <ng-container *ngIf="listIsObject">
          <option *ngFor="let data of _valueList" [value]="data.value">{{data.name}}</option>
        </ng-container>
      </select>
      <div *ngIf="error" class="error">{{error}}</div>
    </div>
`
})
export class SelectorInputComponent {
  _fieldName = 'Field Label';
  _idName = 'fieldname';
  _valueList: any[] = [];
  listIsObject = false;
  @Input() set fieldName(name: string) {
    this._fieldName = name;
    this._idName = name.replace(/\s/g, '').toLowerCase();
  }
  @Input() fieldValue:any = '';
  @Input() placeholder = '';
  @Input() parentage: string[] = [];
  @Input() set valueList(list: any[]) {
    this.listIsObject = list?.length > 0 && typeof list[0] !== 'string';
    this._valueList = list;
    list.forEach(val => {
      if(val.default) this.fieldValue = val;
    });
  };
  @Input() labelColor = '#000000';
  @Input() fieldClass = '';
  @Input() error = '';
  @Output() fieldValueChange = new EventEmitter<string>();
  valueChange = new Subject<string> ();

  selected() {
    debounce(() => {
      this.fieldValueChange.emit(this.fieldValue);
      this.valueChange.next(this.fieldValue);
    }, 500)();
  }
}
