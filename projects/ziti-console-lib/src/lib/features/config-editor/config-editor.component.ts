import {Component, ComponentRef, EventEmitter, Input, OnInit, Output, ViewChild, ViewContainerRef} from '@angular/core';
import {JsonEditorComponent, JsonEditorOptions} from "ang-jsoneditor";
import {debounce, defer, delay, isBoolean, isEmpty, isNil, keys} from "lodash";
import {SchemaService} from "../../services/schema.service";
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import {GrowlerModel} from "../messaging/growler.model";
import {GrowlerService} from "../messaging/growler.service";  // Import ajv-formats

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
  ]

  bColorArray = [
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

  formDataChangedDebounced: any = debounce(this.formDataChanged.bind(this), 350);
  jsonDataChangedDebounced: any = debounce(this.jsonDataChanged.bind(this), 350);
  @ViewChild("dynamicform", {read: ViewContainerRef}) dynamicForm!: ViewContainerRef;
  @ViewChild(JsonEditorComponent, {static: false}) editor!: JsonEditorComponent;
  constructor(private schemaSvc: SchemaService, private growlerService: GrowlerService) {
  }

  ngOnInit() {
    this.createForm();
    defer(() => {
      this.formDataChanged();
    });
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

  validateConfig(schema?, showGrowler = true) {
    this.configData = this.removeUndefinedProperties(this.configData);
    let validationErrors;
    let valid = true;
    if (schema) {
      // Initialize Ajv
      const ajv = new Ajv({allErrors: true});
      addFormats(ajv);
      ajv.addFormat('idn-hostname', /^.+$/);
      const validate = ajv.compile(schema);
      valid = validate(this.configData);
      validationErrors = validate.errors;
    }
    this.configErrors = {};
    const propertyValidationMap = {};
    this.validateConfigItems(this.items, undefined, '', validationErrors);
    this.buildPropertyValidationMap(validationErrors, propertyValidationMap);
    if (!valid) {
      this.configErrors['configData'] = true;
      if (showGrowler) {
        this.displayConfigErrors(propertyValidationMap);
      }
    }
    this.configErrorsChange.emit(this.configErrors);
    return isEmpty(this.configErrors);
  }

  buildPropertyValidationMap(validationErrors, propertyValidationMap) {
    validationErrors?.forEach((error) => {
      let path = error.instancePath;
      if (!isEmpty(error?.params?.missingProperty)) {
        path += '/' + error?.params?.missingProperty;
      }
      if (!isEmpty(path)) {
        propertyValidationMap[path] = `<b>${path}</b>: ${error.message}`;
      }
    });
  }

  validateConfigItems(items, parentType = 'object', path = '', validationErrors = []) {
    let isValid = true;
    items.forEach((item) => {
      if (item.type === 'object') {
        console.log(validationErrors);
        if (!this.validateConfigItems(item.items, item.type, path + '/' + item.key, validationErrors)) {
          isValid = false;
        }
      } else if (item?.component?.instance?.setValidationErrors) {
        item?.component?.instance?.setValidationErrors(path, validationErrors)
      } else {
        const hasValidationError: any = validationErrors?.some((error) => {
          let pathToMach = error.instancePath;
          if (!isEmpty(error?.params?.missingProperty)) {
            pathToMach += '/' + error?.params?.missingProperty;
          }
          const matched = pathToMach === (path + '/' + item.key);
          return matched;
        });
        if (item?.component?.instance?.setIsValid) {
          item?.component?.instance?.setIsValid(!hasValidationError);
        }
      }
    });
    return isValid;
  }

  displayConfigErrors(propertyValidationMap) {
    let validationMessage = '';
    if (!isEmpty(propertyValidationMap)) {
      const props = keys(propertyValidationMap);
      props.forEach((key, index) => {
        validationMessage += `<li>${propertyValidationMap[key]}</li>`;
      });
    }
    if (isEmpty(validationMessage)) {
      validationMessage = 'The entered configuration is invalid. Please update missing/invalid fields and try again.';
    } else {
      validationMessage = `<ul style="margin-top: 5px;">${validationMessage}</ul>`;
    }
    const growlerData = new GrowlerModel(
        'error',
        'Error',
        `Error Validating Config`,
        validationMessage,
    );
    this.growlerService.show(growlerData);
  }

  formDataChanged() {
    delay(() => {
      this.getConfigDataFromForm();
    }, 200);
  }

  jsonDataChanged(event) {
    defer(() => {
      this.configDataChange.emit(this.configData);
      this.updateFormView(this.items, this.configData);
    });
  }

  removeUndefinedProperties(data) {
    if (Array.isArray(data)) {
      return data
          .map(item => this.removeUndefinedProperties(item))
          .filter(item => item !== undefined);
    } else if (typeof data === 'object' && data !== null) {
      return Object.fromEntries(
          Object.entries(data)
              .filter(([_, value]) => value !== undefined)
              .map(([key, value]) => [key, this.removeUndefinedProperties(value)])
      );
    }
    return data;
  }
}
