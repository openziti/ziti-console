import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {isEmpty, map, unset} from "lodash";

@Component({
  selector: 'lib-custom-tags',
  templateUrl: './custom-tags.component.html',
  styleUrls: ['./custom-tags.component.scss']
})
export class CustomTagsComponent implements OnInit {

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
