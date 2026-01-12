import {Component, Input} from '@angular/core';

@Component({
    selector: 'lib-card',
    templateUrl: './card.component.html',
    styleUrls: ['./card.component.scss'],
    standalone: false
})
export class CardComponent {

  @Input() imageUrl = 'test';
  @Input() title = '';
  @Input() content = '';
  @Input() buttonText = '';
  @Input() id = '';
  @Input() href = '';

  linkClicked(event) {
    event.preventDefault();
  }
}
