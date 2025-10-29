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
import {forEach, isEmpty, map, unset, debounce, cloneDeep, set} from "lodash";

@Component({
  selector: 'lib-custom-tags',
  templateUrl: './custom-tags.component.html',
  styleUrls: ['./custom-tags.component.scss']
})
export class CustomTagsComponent implements OnInit, OnChanges {

  @Input() tags: any = {};
  @Output() tagsChange: EventEmitter<any> = new EventEmitter<any>();

  tagsArray: any = [];
  newTagName = '';
  newTagValue = '';
  errors: any = {};
  object = Object;

  newTag = {name: '', value: '', initName: '', initVal: '', showNewTag: true, errors: {}};

  tagNameChangedDebounced = debounce(this.tagNameChanged, 350);
  tagValueChangedDebounced = debounce(this.tagValueChanged, 350);
  updateTagsArrayDebounced = debounce(this.updateTagsArray, 350);
  updateTagsObjectDebounced = debounce(this.updateTagsObject, 350);

  constructor() {}

  ngOnInit() {
    this.updateTagsArray({});
  }

  ngOnChanges(changes: SimpleChanges) {
    this.updateTagsArray({});
  }

  updateTagsArray(event?: any) {
    this.tagsArray = map(this.tags, (value, key) => {
      return {name: key, value: value, initName: key, initVal: value, errors: {}}
    });
    this.tagsChange.emit(this.tags);
    event?.srcElement?.focus();
  }

  updateTagsObject(event?: any) {
    this.tagsArray.forEach((tag) => {
      if (tag.initName !== tag.name) {
        unset(this.tags, tag.initName);
        tag.initName = tag.name;
      }
      if (isEmpty(tag.name) && isEmpty(tag.value)) {
        unset(this.tags, tag.name);
      }
      this.tags[tag.name] = tag.value;
    });
    this.tagsChange.emit(this.tags);
  }

  addTag(event?) {
    this.validate();
    set(this.tagsArray, `[${this.tagsArray.length - 1}].showNewTag`, false);
    const newTag = cloneDeep(this.newTag);
    this.tagsArray = [...this.tagsArray, newTag];
    this.updateTagsObject();
    event?.stopPropagation();
    event?.preventDefault();
  }

  removeTag(tagName: string) {
    unset(this.tags, tagName);
    this.updateTagsArray({});
    set(this.tagsArray, `[${this.tagsArray.length - 1}].showNewTag`, true);
  }

  enterKeyPressed(event) {
    this.addTag();
    event.stopPropagation();
    event.preventDefault();
  }

  tagNameChanged(tag: any, event?) {
    this.updateTagsObjectDebounced(event);
  }

  tagValueChanged(tag: any, event?) {
    this.updateTagsObjectDebounced(event);
  }

  validate(event?) {
    this.tagsArray.forEach((tag) => {
      const errors = {};
      if (isEmpty(tag.name)) {
        errors['name'] = true;
      }
      if (isEmpty(tag.value)) {
        errors['value'] = true;
      }
      tag.errors = errors;
    });
  }

}
