import {Component, Input, OnInit} from "@angular/core";
import {AnimationOptions} from 'ngx-lottie';

import {isEmpty} from 'lodash';

@Component({
    selector: 'lib-loading-indicator',
    templateUrl: './loading-indicator.component.html',
    styleUrls: ['./loading-indicator.component.scss'],
    standalone: false
})
export class LoadingIndicatorComponent implements OnInit {
  @Input() isLoading = false;
  lottieOptions: AnimationOptions = {
    path: 'assets/animations/Loader.json',
  };

  ngOnInit() {
    const loadingIndicatorPath = localStorage.getItem('loading-indicator-path');
    if (!isEmpty(loadingIndicatorPath)) {
      this.lottieOptions = {
        path: loadingIndicatorPath,
      };
    }
  }
}
