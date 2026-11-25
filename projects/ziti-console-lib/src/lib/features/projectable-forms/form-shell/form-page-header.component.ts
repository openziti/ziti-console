import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
    selector: 'lib-form-page-header',
    templateUrl: './form-page-header.component.html',
    styleUrls: ['./form-page-header.component.scss'],
    standalone: false
})
export class FormPageHeaderComponent {
  @Input() backLabel = 'Back';
  @Input() heading = '';
  @Input() name = '';
  @Input() badges: {label: string; class?: string; circle?: string}[] = [];
  @Output() back = new EventEmitter<void>();
}
