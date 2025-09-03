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
import {isEmpty} from 'lodash';
import {Router} from "@angular/router";

@Component({
  selector: 'lib-preview-list',
  templateUrl: './preview-list.component.html',
  styleUrls: ['./preview-list.component.scss']
})
export class PreviewListComponent {
  //@Input() hideOption: string;
  @Input() public label = '';
  @Input() public clickable = false;
  @Input() isLoading = false;
  @Input() allNames = [];
  @Input() items = [];
  @Input() allowRemove = false
  @Input() tooltip = '';
  @Input() showfilter = true;
  @Output() itemSelected = new EventEmitter<string>();
  @Output() itemRemoved = new EventEmitter<string>();
  public previewItems = [];
  private hideOption = 'asdf';
  filterFor = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.setPreviewItems();
  }

  ngOnChanges() {
    this.setPreviewItems();
    this.sort();
  }

  setPreviewItems() {
    this.previewItems = [];
    if (!isEmpty(this.allNames)) {
      this.previewItems.push(...this.allNames);
      this.previewItems = this.previewItems.filter((item) => item !== this.hideOption);
    } else {
      this.previewItems.push(...this.items);
    }
    this.sort();
  }

  onKeydownEvent() {
    this.previewItems = [];
    for (let i = 0; i < this.allNames.length; i++) {
      if (!isEmpty(this.allNames)) {
        if (this.allNames[i].indexOf(this.filterFor) >= 0) {
          this.previewItems.push(this.allNames[i]);
        }
      } else {
        if (this.items[i].name.indexOf(this.filterFor) >= 0) {
          this.previewItems.push(this.items[i]);
        }
      }
    }
    this.sort();
  }

  sort() {
    this.previewItems.sort((item1, item2) =>  {
      if (item1.skipSort) {
        return item1.name;
      } else if (item2.skipSort) {
        return  item2.name;
      } else if (item1.name) {
        return item1.name.localeCompare(item2.name)
      } else {
        return item1.localeCompare(item2)
      }
    });
  }

  selected(item: string) {
    if (!this.clickable)  {
      return;
    }
    this.itemSelected.emit(item);
  }

  remove(item) {
    this.itemRemoved.emit(item);
  }

  linkClicked(event, item) {
    if (!this.clickable) {
      return;
    }
    this.router.navigateByUrl(item.href);
    event.preventDefault();
  }

  getHrefVal(href) {
    let hrefVal = href;
    if(hrefVal?.indexOf('/') === 0) {
      hrefVal = hrefVal.slice(1);
    }
    return './' + hrefVal;
  }
}
