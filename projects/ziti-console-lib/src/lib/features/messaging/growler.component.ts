/*
    Copyright NetFoundry Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {GrowlerModel} from "./growler.model";
import {GrowlerService} from "./growler.service";
import {Subscription} from "rxjs";

@Component({
  selector: 'lib-growler',
  template: `
    <div *ngIf="show" [ngClass]="{ open: show }" class="growler {{ level }}" id="Growler">
      <div class="title">{{ title }}</div>
      <div class="subtitle">{{ subtitle }}</div>
      <div [innerHTML]="content" class="content"></div>
      <div class="icon"></div>
    </div>`,
  styleUrls: ['./growler.component.scss']
})
export class GrowlerComponent  implements OnInit, OnDestroy {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() level = '';
  @Input() content = '';
  @Input() show = false;

  private growlerServiceSub: Subscription;

  constructor(private growlerService: GrowlerService) {

  }

  ngOnInit(): void {
    this.growlerServiceSub = this.growlerService.data$.subscribe((data) => {
      this.showGrowler(data);
    });
  }

  ngOnDestroy(): void {
    if(this.growlerServiceSub) this.growlerServiceSub.unsubscribe();
  }

  private showGrowler(data: GrowlerModel) {
    this.title = data.title;
    this.subtitle = data.subtitle;
    this.level = data.level;
    this.content = data.content;
    this.show = true;
    setTimeout(() => {
      this.show = false;
    }, 5000);

  }
}
