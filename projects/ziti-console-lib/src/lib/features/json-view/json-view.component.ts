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
    this.watchData();
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
            const newData = JSON.parse(this.content.text)
            this.dataChange.emit(newData);
            this.currentData = newData;
          }
        }
      }
    });
  }

  updateEditor() {
    if (_.isEqual(this.currentData, this.data)) {
      return;
    }
    this.content = {
      json: this.data
    };
    this.editor.update(this.content);
  }

  watchData() {
    const watchProperty = (self, prop, currentVal, callback) => {
      _.delay(() => {
        const newVal = self.data[prop];
        if (newVal !== currentVal) {
          callback();
        }
        watchProperty(self, prop, newVal, callback);
      }, 100);
    };
    _.forEach(_.keys(this.data), (key) => {
      watchProperty(this, key, this.data[key], (val) => {
        this.updateEditor();
      });
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
      console.log(errors);
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
    console.log(clipData);
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
