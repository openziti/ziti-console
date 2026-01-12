import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {Subject} from "rxjs";
import {debounce} from "lodash";

@Component({
    selector: 'lib-string-input',
    template: `
      <div [ngClass]="fieldClass + (!_isValid ? 'invalid' : '')" class="string-input-container">
          <div class="label-container">
              <label for="schema_{{parentage?parentage+'_':''}}{{_idName}}"  [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
              <div
                  *ngIf="helpText"
                  class="form-field-info infoicon"
                  matTooltip="{{helpText}}"
                  matTooltipPosition="above"
                  matTooltipClass="wide-tooltip"
              ></div>
          </div>
          <input id="schema_{{parentage?parentage+'_':''}}{{_idName}}"
                 type="text" class="jsonEntry"
                 [required]="required"
                 [autocomplete]="autocomplete"
                 [ngClass]="{'error': error}"
                 [placeholder]="placeholder" [(ngModel)]="fieldValue" (paste)="onKeyup()" (keyup)="onKeyup()" (change)="emitEvents()"/>
          <div *ngIf="error" class="error">{{error}}</div>
      </div>
  `,
    styleUrls: ['string-input.component.scss'],
    standalone: false
})
export class StringInputComponent {
    _fieldName = 'Field Label';
    _idName = 'fieldname';
    @Input() set fieldName(name: string) {
        this._fieldName = name;
        this._idName = name.replace(/\s/g, '').toLowerCase();
    }
    @Input() helpText;
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

    _isValid = true;
    public setIsValid (isValid) {
        this._isValid = isValid;
    }

    onKeyup() {
        this.emitEventsDebounced();
    }

    emitEventsDebounced = debounce(this.emitEvents.bind(this), 500);
    emitEvents() {
        this.fieldValueChange.emit(this.fieldValue);
        this.valueChange.next(this.fieldValue);
    }
}
