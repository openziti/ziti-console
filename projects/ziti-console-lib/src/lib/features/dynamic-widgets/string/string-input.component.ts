import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Subject} from "rxjs";
import {debounce} from "lodash";

@Component({
  selector: 'lib-string-input',
  template: `
      <div [ngClass]="fieldClass + (!_isValid ? 'invalid' : '')" class="string-input-container">
          <label for="schema_{{parentage?parentage+'_':''}}{{_idName}}"  [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
          <input id="schema_{{parentage?parentage+'_':''}}{{_idName}}"
                 type="text" class="jsonEntry"
                 [ngClass]="{'error': error}"
                 [placeholder]="placeholder" [(ngModel)]="fieldValue" (paste)="onKeyup()" (keyup)="onKeyup()"/>
          <div *ngIf="error" class="error">{{error}}</div>
      </div>
  `,
    styleUrls: ['string-input.component.scss']
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

    _isValid = true;
    public setIsValid (isValid) {
        this._isValid = isValid;
    }

    onKeyup() {
        debounce(() => {
            this.fieldValueChange.emit(this.fieldValue);
            this.valueChange.next(this.fieldValue);
        }, 500)();
    }
}
