import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Subject} from "rxjs";
import {debounce} from "lodash";

@Component({
  selector: 'lib-text-list-input',
  template: `
    <div [ngClass]="fieldClass">
      <label for="schema_{{parentage?parentage+'_':''}}{{_idName}}"  [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
      <p-chips id="schema_{{parentage?parentage+'_':''}}{{_idName}}"
          (keyup)="onKeyup()"
          [(ngModel)]="fieldValue"
          [allowDuplicate]="false"
          [placeholder]="placeholder"
          [addOnBlur]="true"
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
