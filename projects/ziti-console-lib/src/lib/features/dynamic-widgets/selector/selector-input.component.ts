import {Component, EventEmitter, Input, Output} from '@angular/core';
import {Subject} from "rxjs";
import {debounce, defer} from "lodash";

@Component({
  selector: 'lib-selector-input',
  template: `
    <div [ngClass]="fieldClass + (!_isValid ? 'invalid' : '')" class="selector-input-container">
      <div class="label-container">
        <label [ngStyle]="{'color': labelColor}">{{_fieldName}}</label>
        <div
            *ngIf="helpText"
            class="form-field-info infoicon"
            matTooltip="{{helpText}}"
            matTooltipPosition="above"
            matTooltipClass="wide-tooltip"
        ></div>
      </div>
      <select
          *ngIf="!hideSelect"
          id="schema_{{parentage?parentage+'_':''}}{{_idName}}"
          class="jsonEntry"
          [ngClass]="{'error': error}"
          [(ngModel)]="fieldValue"
          (change)="selected()"
      >
          <option [value]="undefined" *ngIf="placeholder">{{placeholder}}</option>
          <ng-container *ngIf="!listIsObject">
            <option *ngFor="let name of _valueList" [value]="name">{{name}}</option>
          </ng-container>
          <ng-container *ngIf="listIsObject">
            <option *ngFor="let data of _valueList" [value]="data.value">{{data.name}}</option>
          </ng-container>
      </select>
      <select
          *ngIf="hideSelect"
          class="placeholder-select"
          [ngClass]="{'error': error}"
          [(ngModel)]="fieldValue"
      >
      </select>
      <div *ngIf="error" class="error">{{error}}</div>
    </div>
  `,
  styleUrls: ['selector-input.component.scss']
})
export class SelectorInputComponent {
  _fieldName = 'Field Label';
  _idName = 'fieldname';
  _valueList: any[] = [];
  listIsObject = false;
  hideSelect = false;

  @Input() set fieldName(name: string) {
    this._fieldName = name;
    this._idName = name.replace(/\s/g, '').toLowerCase();
  }
  _fieldValue: string;
  @Input() set fieldValue(val: string) {
    this._fieldValue = val;
  }
  get fieldValue():string {
    return this._fieldValue;
  }

  @Input() helpText;
  @Input() placeholder = '';
  @Input() parentage: string[] = [];
  @Input() set valueList(list: any[]) {
    this.listIsObject = list?.length > 0 && typeof list[0] !== 'string';
    this._valueList = list;
    let valToSet;
    list.forEach(item => {
      if(item.default) {
        valToSet = item.value;
      }
    });
    valToSet = valToSet || this.fieldValue;
    this.reInitSelect();
  };

  @Input() labelColor = '#000000';
  @Input() fieldClass = '';
  @Input() error = '';
  @Output() fieldValueChange = new EventEmitter<string>();
  valueChange = new Subject<string> ();

  _isValid = true;
  public setIsValid (isValid) {
    this._isValid = isValid;
  }

  selected() {
    debounce(() => {
      if (this.fieldValue === 'undefined') {
        this.fieldValue = undefined;
      }
      this.fieldValueChange.emit(this.fieldValue);
      this.valueChange.next(this.fieldValue);
    }, 500)();
  }

  reInitSelect() {
    this.hideSelect = true;
    defer(() => {
      this.hideSelect = false;
    });
  }
}
