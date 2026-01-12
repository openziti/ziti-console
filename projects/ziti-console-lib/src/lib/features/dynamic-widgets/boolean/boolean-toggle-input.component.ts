import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Subject} from "rxjs";
import {debounce} from "lodash";

@Component({
    selector: 'lib-boolean-toggle-input',
    template: `
    <div [ngClass]="fieldClass">
      <label for="schema_{{parentage?parentage+'_':''}}{{_idName}}"  [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
      <div id="schema_{{parentage?parentage+'_':''}}{{_idName}}" (click)="toggle()" 
             [ngClass]="{ on: fieldValue, error: error }" class="toggle">
          <span class="no" [hidden]="fieldValue">NO</span >
          <span class="yes" [hidden]="!fieldValue">YES</span >
          <div class="switch"></div>
        </div>
      <div *ngIf="error" class="error">{{error}}</div>
    </div>
  `,
    styleUrls: ['./boolean-toggle-input.component.scss'],
    standalone: false
})
export class BooleanToggleInputComponent {
  _fieldName = 'Field Label';
  _idName = 'fieldname';
  @Input() set fieldName(name: string) {
    this._fieldName = name;
    this._idName = name.replace(/\s/g, '').toLowerCase();
  }
  @Input() fieldValue = false;
  @Input() parentage: string[] = [];
  @Input() labelColor = '#000000';
  @Input() fieldClass = '';
  @Input() error = '';
  @Output() fieldValueChange = new EventEmitter<boolean>();
  valueChange = new Subject<boolean> ();

  toggle() {
    this.fieldValue = !this.fieldValue
    debounce(() => {
      this.fieldValueChange.emit(this.fieldValue);
      this.valueChange.next(this.fieldValue);
    }, 500)();
  }

}
