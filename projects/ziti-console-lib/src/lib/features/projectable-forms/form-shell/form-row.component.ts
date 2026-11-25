import {Component, Input} from '@angular/core';

@Component({
    selector: 'lib-form-row',
    templateUrl: './form-row.component.html',
    styleUrls: ['./form-row.component.scss'],
    standalone: false
})
export class FormRowComponent {
  @Input() label = '';
  @Input() badge: 'required' | 'optional' | '' = '';
  @Input() hint = '';
  @Input() error = '';
  @Input() forId = '';
}
