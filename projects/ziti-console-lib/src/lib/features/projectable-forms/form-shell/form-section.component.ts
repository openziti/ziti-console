import {Component, Input} from '@angular/core';

@Component({
    selector: 'lib-form-section',
    templateUrl: './form-section.component.html',
    styleUrls: ['./form-section.component.scss'],
    standalone: false
})
export class FormSectionComponent {
  @Input() heading = '';
}
