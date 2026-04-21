import {Component, Input, OnInit} from "@angular/core";
import {AnimationOptions} from 'ngx-lottie';

import {isEmpty} from 'lodash';

const DEFAULT_LOADER_PATH = '/assets/animations/Loader.json';
const cachedAnimationData: {[path: string]: any} = {};
const inflightFetches: {[path: string]: Promise<any>} = {};

function loadAnimationData(path: string): Promise<any> {
  if (cachedAnimationData[path]) {
    return Promise.resolve(cachedAnimationData[path]);
  }
  if (!inflightFetches[path]) {
    inflightFetches[path] = fetch(path)
      .then((res) => res.json())
      .then((data) => {
        cachedAnimationData[path] = data;
        delete inflightFetches[path];
        return data;
      })
      .catch((err) => {
        delete inflightFetches[path];
        throw err;
      });
  }
  return inflightFetches[path];
}

@Component({
    selector: 'lib-loading-indicator',
    templateUrl: './loading-indicator.component.html',
    styleUrls: ['./loading-indicator.component.scss'],
    standalone: false
})
export class LoadingIndicatorComponent implements OnInit {
  @Input() isLoading = false;
  lottieOptions: AnimationOptions | undefined;

  ngOnInit() {
    const overridePath = localStorage.getItem('loading-indicator-path');
    const path = !isEmpty(overridePath) ? overridePath! : DEFAULT_LOADER_PATH;

    if (cachedAnimationData[path]) {
      this.lottieOptions = {animationData: cachedAnimationData[path]};
      return;
    }

    loadAnimationData(path)
      .then((data) => {
        this.lottieOptions = {animationData: data};
      })
      .catch(() => {
        this.lottieOptions = {path};
      });
  }
}
