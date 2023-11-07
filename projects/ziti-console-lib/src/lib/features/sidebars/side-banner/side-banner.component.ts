import {Component, Input} from '@angular/core';

@Component({
  selector: 'lib-side-banner',
  templateUrl: './side-banner.component.html',
  styleUrls: ['./side-banner.component.scss']
})
export class SideBannerComponent {
  @Input() version = '';

}
