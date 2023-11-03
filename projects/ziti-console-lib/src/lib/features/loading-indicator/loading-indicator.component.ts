import {Component, Input} from "@angular/core";
import {AnimationOptions} from 'ngx-lottie';

@Component({
  selector: 'lib-loading-indicator',
  templateUrl: './loading-indicator.component.html',
  styleUrls: ['./loading-indicator.component.scss'],
})
export class LoadingIndicatorComponent {
  @Input() isLoading = false;
  lottieOptions: AnimationOptions = {
    path: '/assets/animations/Loader.json',
  };
}
