import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Subject} from "rxjs";
import {debounce} from "lodash";

@Component({
    selector: 'lib-number-input',
    template: `
    <div [ngClass]="fieldClass + (!_isValid ? 'invalid' : '')" class="{{!_isValid ? 'invalid' : ''}} number-input-container">
      <div class="label-container">
        <label for="schema_{{parentage?parentage+'_':''}}{{_idName}}"  [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
        @if (helpText) {
          <div
            class="form-field-info infoicon"
            matTooltip="{{helpText}}"
            matTooltipPosition="above"
            matTooltipClass="wide-tooltip"
          ></div>
        }
      </div>
      <input id="schema_{{parentage?parentage+'_':''}}{{_idName}}"
        type="number" class="jsonEntry"
        [ngClass]="{'error': error}"
        [placeholder]="placeholder" [(ngModel)]="fieldValue" (paste)="onKeyup()" (keyup)="onKeyup()" (change)="emitEvents()"/>
      @if (error) {
        <div class="error">{{error}}</div>
      }
    </div>
    `,
    styleUrls: ['number-input.component.scss'],
    standalone: false
})
export class NumberInputComponent {
  _fieldName = 'Field Label';
  _idName = 'fieldname';
  @Input() set fieldName(name: string) {
    this._fieldName = name;
    this._idName = name.replace(/\s/g, '').toLowerCase();
  }
  @Input() helpText;
  @Input() fieldValue: number | undefined;
  @Input() placeholder = '';
  @Input() parentage: string[] = [];
  @Input() labelColor = '#000000';
  @Input() fieldClass = '';
  @Input() error = '';
  @Output() fieldValueChange = new EventEmitter<number| undefined>();
  valueChange = new Subject<number| undefined> ();

  _isValid = true;
  private _emitEventsDebounced: any;

  constructor() {
    this._emitEventsDebounced = debounce(this.emitEvents.bind(this), 500);
  }

  public setIsValid(isValid) {
    this._isValid = isValid;
  }

  onKeyup() {
    this._emitEventsDebounced();
  }

  emitEvents() {
    this.fieldValueChange.emit(this.fieldValue);
    this.valueChange.next(this.fieldValue);
  }
}
