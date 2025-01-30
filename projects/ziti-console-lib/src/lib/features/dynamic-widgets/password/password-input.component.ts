import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Subject} from "rxjs";
import {debounce} from "lodash";

@Component({
  selector: 'lib-password-input',
  template: `
      <div [ngClass]="fieldClass">
          <label for="schema_{{parentage?parentage+'_':''}}{{_idName}}"  [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
          <input id="schema_{{parentage?parentage+'_':''}}{{_idName}}"
                 type="password" class="jsonEntry"
                 [required]="required"
                 [autocomplete]="autocomplete"
                 [ngClass]="{'error': error}"
                 [placeholder]="placeholder" [(ngModel)]="fieldValue" (paste)="onKeyup()" (keyup)="onKeyup()" (change)="emitEvents()"/>
          <div *ngIf="error" class="error">{{error}}</div>
      </div>
  `,
    styles:['input.error {border-color:red;}','div.error {color:red}']
})
export class PasswordInputComponent {
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
    @Input() autocomplete = '';
    @Input() required = false;
    @Output() fieldValueChange = new EventEmitter<string>();
    valueChange = new Subject<string> ();

    onKeyup() {
        this.emitEventsDebounced();
    }

    emitEventsDebounced = debounce(this.emitEvents.bind(this), 500);
    emitEvents() {
        this.fieldValueChange.emit(this.fieldValue);
        this.valueChange.next(this.fieldValue);
    }
}
