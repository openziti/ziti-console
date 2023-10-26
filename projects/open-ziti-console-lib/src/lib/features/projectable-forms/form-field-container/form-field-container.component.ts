import {Component, Input} from '@angular/core';

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
  @Input() contentStyle: any = '';
  @Input() showHeader: any = true;

  constructor() {}
}
