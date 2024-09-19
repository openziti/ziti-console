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

import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {isEmpty, map, unset} from "lodash";

@Component({
  selector: 'lib-custom-tags',
  templateUrl: './custom-tags.component.html',
  styleUrls: ['./custom-tags.component.scss']
})
export class CustomTagsComponent implements OnInit, OnChanges {

  @Input() tags: any = {};
  @Output() tagsChange: EventEmitter<any> = new EventEmitter<any>();

  tagsArray = [];
  newTagName = '';
  newTagValue = '';
  errors: any = {};
  object = Object;

  constructor() {}

  ngOnInit() {
    this.updateTagsArray();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.updateTagsArray()
  }

  updateTagsArray() {
    this.tagsArray = map(this.tags, (value, key) => {
      return {name: key, value: value}
    });
    this.tagsChange.emit(this.tags);
  }

  addTag() {
    this.errors = {};
    if(isEmpty(this.newTagName)) {
      this.errors['name'] = true;
    }
    if(isEmpty(this.newTagValue)) {
      this.errors['value'] = true;
    }
    if(!isEmpty(this.errors)) {
      return;
    }
    this.tags[this.newTagName] = this.newTagValue;
    this.newTagName = '';
    this.newTagValue = '';
    this.updateTagsArray();
  }

  removeTag(tagName: string) {
    unset(this.tags, tagName);
    this.updateTagsArray();
  }

  enterKeyPressed(event) {
    this.addTag();
    event.stopPropagation();
    event.preventDefault();
  }
}
