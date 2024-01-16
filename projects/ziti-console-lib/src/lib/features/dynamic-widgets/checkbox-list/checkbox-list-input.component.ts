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
              class="jsonEntry"
                 [ngClass]="{'error': error}"
              [checked]="item.checked" (click)="item.checked=!item.checked;updateFieldVal();"/>
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

