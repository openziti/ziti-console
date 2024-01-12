import {Component, Input, Output, EventEmitter} from '@angular/core';

@Component({
  selector: 'lib-form-field-container',
  templateUrl: './form-field-container.component.html',
  styleUrls: ['./form-field-container.component.scss']
})
export class FormFieldContainerComponent {

  @Input() title = '';
  @Input() title2 = undefined;
  @Input() layout = 'column';
  @Input() helpText: any = undefined;
  @Input() helpText2: any = undefined;
  @Input() label: any = undefined;
  @Input() count: any = undefined;
  @Input() action: any = undefined;
  @Input() actionLabel: string;
  @Input() class = '';
  @Input() contentStyle: any = '';
  @Input() showHeader: any = true;

  @Output() actionRequested: EventEmitter<any> = new EventEmitter<any>();
  constructor() {}

  actionClicked() {
    this.actionRequested.emit({action: this.action});
  }
}
