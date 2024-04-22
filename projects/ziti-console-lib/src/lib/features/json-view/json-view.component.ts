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

import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input, OnChanges,
  Output,
  SimpleChanges,
  ViewChild
} from "@angular/core";

import {GrowlerService} from '../messaging/growler.service';
import {GrowlerModel} from '../messaging/growler.model';

import _ from 'lodash';
import {createAjvValidator, JSONEditor, Mode} from "vanilla-jsoneditor";

@Component({
  selector: 'lib-json-view',
  templateUrl: './json-view.component.html',
  styleUrls: ['./json-view.component.scss'],
})
export class JsonViewComponent implements AfterViewInit, OnChanges {

  @Input() data: any = {};
  @Input() schema: any = {};
  @Input() readOnly: boolean = false;
  @Input() jsonInvalid: boolean = false;
  @Input() showCopy: boolean = false;
  @Output() dataChange: EventEmitter<any> = new EventEmitter();
  @Output() jsonChange: EventEmitter<any> = new EventEmitter();
  @Output() jsonInvalidChange: EventEmitter<any> = new EventEmitter();
  onChangeDebounced;
  schemaRefs: any;
  content: any;
  @ViewChild('editor', {static: false}) editorDiv!: ElementRef;
  validator: any;
  private editor: JSONEditor;
  private schemaDefinitions: any;
  oldData: any;
  currentData: any;
  constructor(private growlerService: GrowlerService) {
    this.onChangeDebounced = _.debounce(this.onChange.bind(this), 400);
  }

  ngAfterViewInit() {
    if (this.schema) {
      this.validator = createAjvValidator({
        schema: this.schema,
        schemaDefinitions: this.schemaDefinitions,
        ajvOptions: {}
      });
    }
    this.initEditor();
    if (this.readOnly) {
      this.watchData();
    }
  }

  initEditor() {
    this.currentData = this.data;
    this.content = {
      text: undefined,
      json: this.data
    };
    this.editor = new JSONEditor({
      target: this.editorDiv.nativeElement,
      props: {
        validator: this.validator,
        content: this.content,
        readOnly: this.readOnly,
        mode: Mode.text,
        onChange: (updatedContent, previousContent, {contentErrors, patchResult}) => {
          this.content = updatedContent
          if (this.content?.json) {
            this.dataChange.emit(this.content.json);
            this.currentData = this.content.json;
          } else if (this.content?.text) {
            try {
              const newData = JSON.parse(this.content.text)
              this.dataChange.emit(newData);
              this.currentData = newData;
            } catch (e) {
              this.jsonInvalidChange.emit(false);
            }
          }
          const errors = this.validate(this.currentData);
          if (!errors && !_.isEmpty(this.content.text)) {
            this.jsonInvalidChange.emit(false);
          } else {
            this.jsonInvalidChange.emit(true);
          }
        }
      }
    });
  }

  updateEditor() {
    if (_.isEqual(this.oldData, this.data)) {
      return;
    }
    this.oldData = _.cloneDeep(this.data);
    this.content = {
      json: this.oldData
    };
    this.editor.update(this.content);
  }

  watchData() {
    const watchDataObj = (originalData, self, callback) => {
      _.delay(() => {
        const currentData = self.data;
        if (!_.isEqual(originalData, currentData)) {
          callback();
          originalData = _.cloneDeep(currentData);
        }
        watchDataObj(originalData, self, callback);
      }, 100);
    };
    const originalData = _.cloneDeep(this.data);
    watchDataObj(originalData, this, (val) => {
      this.updateEditor();
    });
  }

  async onChange() {
    let newData;
    try {
      newData = this.editor.get();
    } catch (e) {
      console.log(e);
    }

    if (newData) {
      this.dataChange.emit(newData);
    }

    const errors = await this.validate(newData);
    if (!errors) {
      if (newData) {
        this.jsonChange.emit(newData);
      }
      this.jsonInvalidChange.emit(false);
    } else {
      this.jsonInvalidChange.emit(true);
    }
  }

  public getData() {
    return this.editor.get();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['schema']) {
      this.schema = changes['schema'].currentValue;

      if(this.schema) {
        if (this.validator) {
          this.validator.schema = this.schema;
        } else {
          this.validator = createAjvValidator({
            schema: changes['schema'].currentValue,
            schemaDefinitions: this.schemaDefinitions,
            ajvOptions: {}
          });
        }
      }
    }
  }

  public validate(newData: any = undefined) {
    return this.editor.validate();
  }

  enterKeyPressed(event) {
    event.stopPropagation();
    event.preventDefault();
  }

  copyToClipboad() {
    var clipData = JSON.stringify(JSON.parse(JSON.stringify(this.data)),null,2);
    navigator.clipboard.writeText(clipData);
    const growlerData = new GrowlerModel(
        'success',
        'Success',
        `Text Copied`,
        `API call JSON body copied to clipboard`,
    );
    this.growlerService.show(growlerData);
  }
}
