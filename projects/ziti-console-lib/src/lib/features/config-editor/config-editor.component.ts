import {Component, ComponentRef, EventEmitter, Input, OnInit, Output, ViewChild, ViewContainerRef} from '@angular/core';
import {JsonEditorComponent, JsonEditorOptions} from "ang-jsoneditor";
import {defer, isBoolean, isEmpty, isNil, keys} from "lodash";
import {SchemaService} from "../../services/schema.service";

@Component({
  selector: 'lib-config-editor',
  templateUrl: './config-editor.component.html',
  styleUrls: ['./config-editor.component.scss']
})
export class ConfigEditorComponent implements OnInit {

  items: any[] = [];

  lColorArray = [
    'white',
    'white',
    'white',
  ]

  bColorArray = [
    'var(--formBase)',
    'var(--formGroup)',
    'var(--formSubGroup)'
  ]
  hideConfigJSON = false;

  @Input() configErrors: any = {};
  @Output() configErrorsChange = new EventEmitter<any>();

  _configData: any = {};
  @Input() set configData(data) {
    this._configData = data;
  };
  @Output() configDataChange = new EventEmitter<any>();
  get configData() {
    return this._configData;
  }

  _showJsonView = false;
  @Input() set showJsonView(showJsonView: boolean) {
    this._showJsonView = showJsonView;
    this.updateConfigData();
  }
  get showJsonView() {
    return this._showJsonView;
  }

  _schema = false;
  @Input() set schema(schema: any) {
    this._schema = schema;
    this.createForm();
    this.updateConfigData();
  }

  get schema() {
    return this._schema;
  }

  @ViewChild("dynamicform", {read: ViewContainerRef}) dynamicForm!: ViewContainerRef;
  @ViewChild(JsonEditorComponent, {static: false}) editor!: JsonEditorComponent;
  constructor(private schemaSvc: SchemaService) {
  }

  ngOnInit() {
    this.createForm();
  }

  createForm() {
    this.clearForm();
    if (this.dynamicForm && this.schema) {
      this.renderSchema(this.schema);
    }
  }

  clearForm() {
    this.items.forEach((item: any) => {
      if (item?.component) item.component.destroy();
    });
    this.configErrors = {};
    this.items = [];
  }

  renderSchema(schema: any) {
    if (schema.properties) {
      this.items = this.schemaSvc.render(schema, this.dynamicForm, this.lColorArray, this.bColorArray);
      for (let obj of this.items) {
        const cRef = obj.component;
        cRef.instance.errors = this.configErrors;
        if (cRef?.instance.valueChange) {
          const pName: string[]  = cRef.instance.parentage;
          let parentKey;
          if(pName) parentKey = pName.join('.');
          //if (parentKey && !this.formData[parentKey]) this.formData[parentKey] = {};
        }
      }
    }
  }

  updateConfigData() {
    if (!this.showJsonView) {
      this.updateFormView(this.items, this.configData);
    } else {
      this.hideConfigJSON = true;
      defer(() => {
        this.getConfigDataFromForm();
      });
    }
  }

  updateFormView(items, data: any = {}) {
    items.forEach((item) => {
      if (item.items) {
        if (item.type === 'array') {
          if (item?.component?.instance?.addedItems) {
            item.addedItems = data[item.key] || [];
            item.component.instance.addedItems = data[item.key] || [];
          }
          this.updateFormView(item.items, {});
        } else {
          this.updateFormView(item.items, data[item.key]);
        }
      } else if (item?.component?.instance?.setProperties) {
        let val;
        switch (item.key) {
          case 'forwardingconfig':
            val = {
              protocol: data.protocol,
              address: data.address,
              port: data.port,
              forwardProtocol: data.forwardProtocol,
              forwardAddress: data.forwardAddress,
              forwardPort: data.forwardPort,
              allowedProtocols: data.allowedProtocols,
              allowedAddresses: data.allowedAddresses,
              allowedPortRanges: data.allowedPortRanges
            }
            break;
          case 'pap':
            val = {
              protocol: data.protocol,
              address: data.address,
              port: data.port,
              hostname: data.hostname,
            }
            break;
          default:
            val = data[item.key];
            break;
        }
        item?.component?.instance?.setProperties(val);
      } else if (item?.component?.setInput) {
        item.component.setInput('fieldValue', data[item.key]);
      }
    });
    return data;
  }

  getConfigDataFromForm() {
    const data = {};
    this.addItemsToConfig(this.items, data);
    this._configData = data;
    this.hideConfigJSON = false;
    this.configDataChange.emit(this.configData);
  }

  addItemsToConfig(items, data: any = {}, parentType = 'object') {
    items.forEach((item) => {
      if (item.type === 'array') {
        if (item.addedItems) {
          data[item.key] = item.addedItems;
        } else {
          data[item.key] = [];
        }
      } else if (item.type === 'object') {
        const val = this.addItemsToConfig(item.items, {}, item.type);
        let hasDefinition = false;
        keys(val).forEach((key) => {
          if (isBoolean(val[key]) || (!isEmpty(val[key]) && !isNil(val[key]))) {
            hasDefinition = true;
          }
        });
        data[item.key] = hasDefinition ? val : undefined;
      } else {
        let props = [];
        if (item?.component?.instance?.getProperties) {
          props = item?.component?.instance?.getProperties();
        } else if (item?.component?.instance) {
          props = [{key: item.key, value: item.component.instance.fieldValue}];
        }
        props.forEach((prop) => {
          data[prop.key] = prop.value;
        });
      }
    });
    return data;
  }

  validateConfig() {
    this.configErrors = {};
    const configItemsValid = this.validateConfigItems(this.items);
    if (!configItemsValid) {
      this.configErrors['configData'] = true;
    }
    this.configErrorsChange.emit(this.configErrors);
    return isEmpty(this.configErrors);
  }

  validateConfigItems(items, parentType = 'object') {
    let isValid = true;
    items.forEach((item) => {
      if (item.type === 'object') {
        if (!this.validateConfigItems(item.items, item.type)) {
          isValid = false;
        }
      } else if (item?.component?.instance?.isValid) {
        if (!item?.component?.instance?.isValid()) {
          isValid = false;
        }
      }
    });
    return isValid;
  }
}
