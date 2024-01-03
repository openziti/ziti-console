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

import {Component, EventEmitter, Input, OnChanges, Output} from '@angular/core';

@Component({
  selector: 'lib-no-items',
  templateUrl: './no-items.component.html',
  styleUrls: ['./no-items.component.scss'],
})
export class NoItemsComponent implements OnChanges {
  @Input() image = 'No_Gateways';
  @Input() typeName = '';
  @Input() isEmpty = false;
  @Input() hasAdd = true;
  @Input() hiddenResults = false;
  @Input() isLoading = false;
  background;
  @Output() clickEmit = new EventEmitter<any>();
  @Output() refresh = new EventEmitter<any>();

  constructor() {
  }

  ngOnChanges() {
    this.background = {
      'background-image': 'url(/assets/svgs/' + this.image + '.svg)',
    };
  }

  iconClick() {
    this.clickEmit.emit();
  }
}
