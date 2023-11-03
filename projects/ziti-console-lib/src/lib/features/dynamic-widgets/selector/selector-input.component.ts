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
