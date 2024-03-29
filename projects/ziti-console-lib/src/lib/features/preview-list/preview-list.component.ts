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

import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'lib-preview-list',
  templateUrl: './preview-list.component.html',
  styleUrls: ['./preview-list.component.scss']
})
export class PreviewListComponent {
  @Input() hideOption: string;
  @Input() public label = '';
  @Input() public clickable = false;
  @Input() isLoading = false;
  @Input() allNames = [];
  @Input() allowRemove = false
  @Input() tooltip = '';
  @Output() itemSelected = new EventEmitter<string>();
  @Output() itemRemoved = new EventEmitter<string>();
  public names = [];
  filterFor = '';

  ngOnInit() {
    this.names = [];
    this.names.push(...this.allNames);
    this.names = this.names.filter((item) => item !== this.hideOption);
    this.sort();
  }

  ngOnChanges() {
    this.names = [];
    this.names.push(...this.allNames);
    this.names = this.names.filter((item) => item !== this.hideOption);
    this.sort();
  }

  onKeydownEvent() {
    this.names = [];
    for (let i = 0; i < this.allNames.length; i++) {
      if (this.allNames[i].indexOf(this.filterFor) >= 0) {
        this.names.push(this.allNames[i]);
      }
    }
    this.sort();
  }

  sort() {
    this.names.sort((item1, item2) => item1.localeCompare(item2));
  }

  selected(name: string) {
    if (this.clickable) this.itemSelected.emit(name);
  }

  remove(name) {
    this.itemRemoved.emit(name);
  }
}
