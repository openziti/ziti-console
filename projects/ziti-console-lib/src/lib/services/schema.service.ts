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

import {ComponentRef, Injectable, ViewContainerRef} from '@angular/core';
import {ObjectComponent} from "../features/dynamic-widgets/object/object.component";
import {NumberInputComponent} from "../features/dynamic-widgets/number/number-input.component";
import {BooleanToggleInputComponent} from "../features/dynamic-widgets/boolean/boolean-toggle-input.component";
import {StringInputComponent} from "../features/dynamic-widgets/string/string-input.component";
import {SelectorInputComponent} from "../features/dynamic-widgets/selector/selector-input.component";
import _, {isNumber} from "lodash";
import {TextListInputComponent} from "../features/dynamic-widgets/text-list/text-list-input.component";
import {CheckboxListInputComponent} from "../features/dynamic-widgets/checkbox-list/checkbox-list-input.component";
import {
    ProtocolAddressPortInputComponent
} from "../features/dynamic-widgets/protocol-address-port/protocol-address-port-input.component";
import {PortRangesComponent} from "../features/dynamic-widgets/port-ranges/port-ranges.component";
import {ForwardingConfigComponent} from "../features/dynamic-widgets/forwarding-config/forwarding-config.component";
import {Subscription} from "rxjs";
import {GrowlerModel} from "../features/messaging/growler.model";
import {GrowlerService} from "../features/messaging/growler.service";

export type ProtocolAddressPort = {
    protocol: any;
    address: any;
    hostname: any;
    port: any;
}

@Injectable({
    providedIn: 'root'
})
export class SchemaService {
    data = {};
    formId = null;
    value = {};
    codeView = null;
    timeoutId = null;
    suggesting = null;
    suggestId: any = null;
    suggestingField = "";
    propertyExcludes = [];
    reservedProperties = [];
    reservedPropertiesMap: any = {
        protocolAddressPort: undefined,
        forwardProtocalAddressPort: undefined,
        allowedAddresses: undefined,
        forwardAddress: undefined
    };
    requiredProperties: any[] = ['allowedAddresses', 'allowedProtocols', 'allowedPorts'];
    subscriptions: Subscription = new Subscription();
    private items: any[] = [];
    private bColorArray: string[] = [];
    private lColorArray: string[] = [];

    constructor(private growlerService: GrowlerService) {
    }

    /** DOM helpers (replacing jQuery): id prefix and element access */
    private _prefix(p: any): string {
        return (p != null) ? p + '_' : '';
    }

    private _id(p: any, key: string, suffix = ''): string {
        return this._prefix(p) + 'schema_' + key + suffix;
    }

    private _q(id: string): HTMLElement | null {
        return document.getElementById(id);
    }

    private _qAll(selector: string): Element[] {
        return Array.from(document.querySelectorAll(selector));
    }

    getType(property: any) {
        if (property.type == "boolean") return property.type;
        else {
            if (property.enum != null) return "string";
            else {
                if (property.type) return property.type;
                else {
                    if (property.allOf && property.allOf.length > 0) {
                        return property.allOf[0].type;
                    } else {
                        return "string";
                    }
                }
            }
        }
    }

    renderSchema(schema, dynamicForm, lColorArray, bColorArray, formData) {
        if (schema.properties) {
            this.items = this.render(schema, dynamicForm, lColorArray, bColorArray);
            for (let obj of this.items) {
                const cRef = obj.component;
                if (cRef?.instance.valueChange) {
                    const pName: string[]  = cRef.instance.parentage;
                    let parentKey;
                    if(pName) parentKey = pName.join('.');
                    if (parentKey && !formData[parentKey]) formData[parentKey] = {};
                }
            }
        }
        return this.items;
    }

    render(schema: any, view: ViewContainerRef, lColorArray: string[], bColorArray: string[]) {
        this.items = [];
        this.bColorArray = bColorArray;
        this.lColorArray = lColorArray;
        if (schema.properties) {
            const nestLevel = 0;
            this.addFields(schema, view, nestLevel, []);
        }
        const itemsToAdd = [];
        if (this.reservedPropertiesMap.protocolAddressPort) {
            itemsToAdd.push(this.reservedPropertiesMap.protocolAddressPort);
        }
        if (this.reservedPropertiesMap.allowedAddresses && this.reservedPropertiesMap.forwardAddress) {
            itemsToAdd.push(this.reservedPropertiesMap.forwardAddress);
            itemsToAdd.push(this.reservedPropertiesMap.allowedAddresses);
        }
        this.items = [...itemsToAdd, ...this.items];
        return this.items;
    }

    validate(schema: any, formData: any): any {
        let errors = {};
        errors = {...errors, ...this.validateFields(schema, formData)};
        return errors
    }

    validateFields(schema, formData: any, parentage?: string): any {
        let errors = {};
        for (let key in schema.properties) {
            errors = {...errors, ...this.validateField(key, schema, formData, schema.properties[key], parentage)};
        }
        return errors;
    }

    validateField(key, schema, formData, property, parentage): any {
        let errors = {}
        var type = this.getType(property);

        if (type == "object") {
            let newParentage = key;
            if (parentage) newParentage = `${parentage}.${key}`;
            if (property.properties) {
                errors = {...errors, ...this.validateFields(property, formData, newParentage)};
            }
        } else {
            var theValue: string = _.get(formData, key)
            if (schema.required && schema.required.includes(key) && theValue.length == 0) {
                this.addError(errors, key, `${key} required`);

            } else if (type == "integer") {
                if (schema.required && schema.required.includes(key)) {
                    var min = null;
                    var max = null;
                    if (property.minimum) min = Number(property.minimum);
                    if (property.maximum) max = Number(property.maximum);
                    if (isNaN(parseInt(theValue))) {
                        this.addError(errors, key, `invalid number`);
                    } else {
                        var val = Number(theValue);
                        if (min != null && val < min) {
                            this.addError(errors, key, `minimum value ${min} expected`);
                        }
                        if (max != null && val > max) {
                            this.addError(errors, key, `maximum value ${max} expected`);
                        }
                    }
                }
            }
        }
        return errors;
    }

    setValue(schema: any, key: string, type: string, value: any, parentage: string[]) {
        if (value == null) {
            if (type == "array") {
                value = [];
            } else if (type == "integer") {
                value = 0;
            } else if (type == "boolean") {
                value = false;
            } else {
                value = "";
            }
        } else if (type == "boolean") {
            const id = this._id(parentage, key);
            const el = this._q(id);
            if (value) {
                el?.classList.add("on");
                this._qAll('.' + this._id(parentage, key) + "_area").forEach((area) => ((area as HTMLElement).style.display = ''));
                const keyLower = key.split("forward").join("").toLowerCase();
                const disabledEl = this._q(this._prefix(parentage) + "schema_" + keyLower);
                if (disabledEl) {
                    (disabledEl as HTMLInputElement).disabled = true;
                    if (disabledEl.tagName === 'INPUT') (disabledEl as HTMLInputElement).value = '';
                }
            } else {
                el?.classList.remove("on");
            }
        } else {
            if (type == "array") {
                const selectedEl = this._q(this._id(parentage, key, '_selected'));
                if (selectedEl) selectedEl.innerHTML = '';
                const keyEl = this._q(this._id(parentage, key));
                if (keyEl?.classList.contains("checkboxList")) {
                    const total = parseInt(String(keyEl.dataset['total'] ?? 0), 10);
                    for (let i = 0; i < total; i++) {
                        this._q(this._id(parentage, key) + '_' + i)?.classList.remove("checked");
                    }
                }
                for (let i = 0; i < value.length; i++) {
                    if (typeof value[i] == "object") {
                        let values = [];
                        for (let prop in value[i]) {
                            values.push(prop + ": " + value[i][prop]);
                        }
                        let types = [];
                        const obj = this._q(this._id(parentage, key, '_Button'));
                        const objId = obj?.dataset['id'];
                        const vals = (obj?.dataset['values'] ?? '').split(',');
                        for (let j = 0; j < vals.length; j++) {
                            const inputEl = objId ? this._q(objId + "_" + vals[j]) : null;
                            types.push(inputEl?.getAttribute('type') == "number" ? "number" : "string");
                        }
                        const element = document.createElement('div');
                        element.className = 'tag obj';
                        element.dataset['types'] = types.toString();
                        element.textContent = values.toString();
                        element.addEventListener('click', schema.removeMe.bind(schema));
                        this._q(this._id(parentage, key, '_selected'))?.appendChild(element);
                    } else {
                        if (keyEl?.classList.contains("checkboxList")) {
                            const total = parseInt(String(keyEl.dataset['total'] ?? 0), 10);
                            for (let ii = 0; ii < total; ii++) {
                                const itemEl = this._q(this._id(parentage, key) + '_' + ii);
                                if (itemEl?.dataset['value'] == value[i]) itemEl.classList.add("checked");
                            }
                        } else {
                            const element = document.createElement('div');
                            element.className = 'tag';
                            element.textContent = value[i];
                            element.addEventListener('click', schema.removeMe.bind(schema));
                            this._q(this._id(parentage, key, '_selected'))?.appendChild(element);
                        }
                    }
                }
            } else {
                const inputEl = this._q(this._id(parentage, key));
                if (inputEl && 'value' in inputEl) (inputEl as HTMLInputElement).value = value;
            }
        }
        return value;
    }

    getValue(key: string, property: any, json: any, parentage: string[]) {
        if (this.getType(property) == "array") {
            json[key] = [];
            const keyEl = this._q(this._id(parentage, key));
            if (keyEl?.classList.contains("checkboxList")) {
                const total = parseInt(String(keyEl.dataset['total'] ?? 0), 10);
                for (let i = 0; i < total; i++) {
                    const item = this._q(this._id(parentage, key) + '_' + i);
                    if (item?.classList.contains("checked")) json[key].push(item.dataset['value']);
                }
            } else {
                const selectedEl = this._q(this._id(parentage, key, '_selected'));
                if (selectedEl) {
                    Array.from(selectedEl.children).forEach((e) => {
                        const el = e as HTMLElement;
                        if (el.classList.contains("obj")) {
                            const items = el.innerHTML.split(',');
                            const types = (el.dataset['types'] ?? '').split(',');
                            const obj: any = {};
                            for (let i = 0; i < items.length; i++) {
                                const info = items[i].split(':');
                                const prop: any = info.shift();
                                const value: any = info.join(':').trim();
                                const type = types[i];
                                if (type == "number" && !isNaN(value as any)) {
                                    obj[prop] = Number(value);
                                } else {
                                    obj[prop] = value;
                                }
                            }
                            json[key].push(obj);
                        } else {
                            json[key].push(el.innerHTML);
                        }
                    });
                }
            }
        } else if (this.getType(property) == "boolean") {
            json[key] = this._q(this._id(parentage, key))?.classList.contains("on") ?? false;
        } else if (this.getType(property) == "integer") {
            const inputEl = this._q(this._id(parentage, key)) as HTMLInputElement | null;
            let numValue: any = inputEl?.value;
            if (numValue != null && numValue.trim().length > 0) {
                numValue = numValue.trim();
                if (numValue == "" || isNaN(numValue as any)) {
                    numValue = 0;
                    if (key.toLowerCase().indexOf("timeout") >= 0) numValue = 5000;
                } else {
                    numValue = Number(numValue);
                }
                json[key] = numValue;
            } else {
                delete json[key];
            }
        } else {
            const inputEl = this._q(this._id(parentage, key)) as HTMLInputElement | null;
            json[key] = inputEl?.value;
        }
        return json;
    }

    getListValue(id: string) {
        const listItems: any[] = [];
        const container = this._q(id + "_selected");
        if (!container) return listItems;
        Array.from(container.children).forEach((e) => {
            const el = e as HTMLElement;
            if (el.classList.contains("obj")) {
                const items = el.innerHTML.split(',');
                const obj: any = {};
                for (let i = 0; i < items.length; i++) {
                    const info = items[i].split(':');
                    const prop = info.shift();
                    const value: any = info.join(':').trim();
                    if (!isNaN(value)) {
                        obj[prop as string] = Number(value);
                    } else {
                        obj[prop as string] = value;
                    }
                }
                listItems.push(obj);
            } else {
                listItems.push(el.innerHTML);
            }
        });
        return listItems;
    }

    validateProperty(schema: any, key: string, property: any, parentage: string[]) {
        const type = this.getType(property);
        if (type == "object") {
            for (let subKey in property.properties) {
                this.validateProperty(subKey, property.properties[subKey], key, []);
            }
        } else {
            const elem = this._q(this._id(parentage, key));
            let theValue: any = '';
            if (elem && 'value' in elem) theValue = (elem as HTMLInputElement).value;
            if (type == "integer") {
                if (schema.required && schema.required.includes(key)) {
                    let min: number | null = null;
                    let max: number | null = null;
                    if (property.minimum) min = Number(property.minimum);
                    if (property.maximum) max = Number(property.maximum);
                    if (isNaN(parseInt(theValue))) elem?.classList.add("errors");
                    else {
                        const val = Number(theValue);
                        if (min != null && val < min) elem?.classList.add("errors");
                        if (max != null && val > max) elem?.classList.add("errors");
                    }
                }
            } else if (type == "array") {
                if (schema.data.required && schema.data.required.includes(key)) {
                    const keyEl = this._q(this._id(parentage, key));
                    if (keyEl?.classList.contains("checkboxList")) {
                        const total = parseInt(String(keyEl.dataset['total'] ?? 0), 10);
                        let hasSelection = false;
                        for (let i = 0; i < total; i++) {
                            const item = this._q(this._id(parentage, key) + '_' + i);
                            if (item?.classList.contains("checked")) {
                                hasSelection = true;
                                break;
                            }
                        }
                        if (!hasSelection) keyEl.classList.add("errors");
                    } else {
                        const selectedEl = this._q(this._id(parentage, key, '_selected'));
                        if (selectedEl?.children.length == 0) elem?.classList.add("errors");
                    }
                }
            } else {
                if (schema.data.required && schema.data.required.includes(key) && theValue.length == 0) elem?.classList.add("errors");
            }
        }
    }

    private buildNestedContainer(view: ViewContainerRef, nestLevel: number, key: string, parentage: string[], property: any, parent?: any, parentType?: any) {
        let componentRef = view.createComponent(ObjectComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('bcolor', this.bColorArray[nestLevel % this.bColorArray.length]);
        const embeddedView = componentRef.instance.wrapperContents;
        componentRef.setInput('labelColor', this.lColorArray[nestLevel % this.lColorArray.length]);
        componentRef.setInput('showAdd', parentType === 'array');
        componentRef.setInput('open', key === 'terminators');
        const newParent = [...parentage, key];
        this.addFields(property, embeddedView, ++nestLevel, newParent, parent);
        return componentRef;
    }

    private buildBooleanField(view: ViewContainerRef, nestLevel: number, key: string, parentage: string[]) {
        let componentRef = view.createComponent(BooleanToggleInputComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('fieldValue', false);
        componentRef.setInput('labelColor', this.lColorArray[nestLevel]);
        componentRef.instance.fieldValueChange.subscribe((event) => {
            this.checkBoxChanged(event, key, componentRef);
        });
        return componentRef;
    }

    private buildTextField(view: ViewContainerRef, nestLevel: number, key: string, parentage: string[]) {
        let componentRef = view.createComponent(StringInputComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('fieldValue', '');
        componentRef.setInput('placeholder', `enter a value for ${key}`);
        componentRef.setInput('labelColor', this.lColorArray[nestLevel]);
        return componentRef;
    }

    private buildNumericField(view: ViewContainerRef, nestLevel: number, key: string, property: any, parentage: string[]) {
        let placeholder = "enter a numeric value";
        if (property.minimum != null && property.maximum != null) placeholder = "numeric value between " + property.minimum + "-" + property.maximum;
        else {
            if (property.minimum != null) placeholder = "number great than " + property.minimum;
            if (property.maximum != null) placeholder = "number less than " + property.maximum;
        }
        let componentRef = view.createComponent(NumberInputComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('fieldValue', undefined);
        componentRef.setInput('placeholder', placeholder);
        componentRef.setInput('labelColor', this.lColorArray[nestLevel]);
        return componentRef;
    }

    private buildSelectField(view: ViewContainerRef, nestLevel: number, key: string, list: string[], parentage: string[]) {
        const val = list?.length > 0 ? list[0] : '';
        let componentRef = view.createComponent(SelectorInputComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        componentRef.setInput('placeholder', `select ${key}`);
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('valueList', list);
        componentRef.setInput('labelColor', this.lColorArray[nestLevel]);
        return componentRef;
    }

    private buildCheckBoxListField(view: ViewContainerRef, nestLevel: number, key: string, list: string[], parentage: string[]) {
        let componentRef = view.createComponent(CheckboxListInputComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('fieldValue', []);
        componentRef.setInput('valueList', list);
        componentRef.setInput('placeholder', `select a value`);
        componentRef.setInput('labelColor', this.lColorArray[nestLevel]);
        return componentRef;
    }

    checkBoxChanged(event, key, componentRef) {
        this.items.forEach((ref: any) => {
            if (key === 'forwardAddress' && ref.key === 'allowedAddresses') {
                ref.component.location.nativeElement.hidden = !event;
            }
            if (key === 'forwardPort' && ref.key === 'allowedPortRanges') {
                ref.component.location.nativeElement.hidden = !event;
            }
            if (key === 'forwardProtocol' && ref.key === 'allowedProtocols') {
                ref.component.location.nativeElement.hidden = !event;
            }
        });
    }

    private buildTextListField(view: ViewContainerRef, nestLevel: number, key: string, parentage: string[]) {
        let componentRef = view.createComponent(TextListInputComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('fieldValue', []);
        componentRef.setInput('placeholder', `enter values separated with a comma`);
        componentRef.setInput('labelColor', this.lColorArray[nestLevel]);
        return componentRef;
    }

    private buildPortRanges(view: ViewContainerRef, nestLevel: number, parentage: string[], properties: ProtocolAddressPort) {
        let componentRef = view.createComponent(PortRangesComponent);
        return {
            key: 'portRanges',
            component: componentRef
        };
    }

    private buildForwardingConfig(view: ViewContainerRef, nestLevel: number, parentage: string[], properties: ProtocolAddressPort) {
        let componentRef = view.createComponent(ForwardingConfigComponent);
        return {
            key: 'forwardingconfig',
            component: componentRef,
            required: true
        };
    }

    private buildProtocolAddressPort(view: ViewContainerRef, nestLevel: number, parentage: string[], properties: ProtocolAddressPort) {
        let labelPrefix = undefined;
        let protocolList = undefined;
        let showProtocol = false;
        let showAddress = false;
        let showHostName = false;
        let showPort = false;
        if (properties.protocol) {
            showProtocol = true;
            protocolList = properties.protocol?.enum?.map(p => p.toUpperCase());
            if (properties.protocol?.key?.startsWith('forward')) labelPrefix = 'Forward ';
        }
        if (properties.address) {
            showAddress = true;
            if (properties.address?.key?.startsWith('forward')) labelPrefix = 'Forward ';
        }
        if (properties.hostname) {
            showHostName = true;
            if (properties.hostname?.key?.startsWith('forward')) labelPrefix = 'Forward ';
        }
        if (properties.port) {
            showPort = true;
            if (properties.port?.key?.startsWith('forward')) labelPrefix = 'Forward ';
        }
        let componentRef = view.createComponent(ProtocolAddressPortInputComponent);
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('showProtocol', showProtocol);
        componentRef.setInput('showAddress', showAddress);
        componentRef.setInput('showHostName', showHostName);
        componentRef.setInput('showPort', showPort);
        componentRef.setInput('protocol', '');
        componentRef.setInput('address', '');
        componentRef.setInput('hostname', '');
        componentRef.setInput('port', '');
        componentRef.setInput('protocolList', protocolList);
        if (labelPrefix) componentRef.setInput('labelPrefix', labelPrefix);
        componentRef.setInput('labelColor', this.lColorArray[nestLevel]);
        return {
            key: 'pap',
            component: componentRef
        }
    }

    private getLabel(key: string) {
        return key.replace(/([A-Z])/g, (m, p) => ' ' + p).toUpperCase();
    }

    private addFields(schema: any, view: ViewContainerRef, nestLevel: number, parentage: string[], parent?: any) {
        const {specialFields, excludedProperties} = this.addSpecialFields(schema, view, nestLevel, parentage);
        if (specialFields.length > 0) {
            if (parentage.length > 0) {
                if (parent?.items) {
                    parent.items = [...parent.items, ...specialFields];
                } else if (parent) {
                    parent.items = [...specialFields];
                }
            } else {
                this.items = [...this.items, ...specialFields];
            }
        }
        for (let key in schema.properties) {
            if (excludedProperties.includes(key) || this.propertyExcludes.includes(key)) {
                continue;
            }
            let item: any = {};
            const component = this.addField(view, nestLevel, key, schema.properties[key], parentage, item);
            item.key = key;
            item.component = component;
            item.type = schema.properties[key]?.type;
            this.addSubscribers(item);
            if (this.reservedProperties.includes(key)) {
                this.reservedPropertiesMap[key] = item;
            } if (parentage.length > 0) {
                if (parent?.items) {
                    parent.items.push(item);
                } else if (parent) {
                    parent.items = [item];
                }
            } else {
                this.items.push(item);
            }
        }
    }

    addSubscribers(item) {
        if (item.type !== 'array') {
            return;
        }
        this.subscriptions.add(
            item?.component?.instance?.itemAdded?.subscribe((event) => {
                if (!this.itemDataValid(item)) {
                    const growlerData = new GrowlerModel(
                        'error',
                        'Error',
                        `Error Validating Config`,
                        'The entered configuration is invalid. Please update missing/invalid fields and try again.',
                    );
                    this.growlerService.show(growlerData);
                    return
                }
                const itemData = this.addItemData(item);
                if (!item.addedItems || item.addedItems.length <= 0) {
                    item.addedItems = [];
                }
                item.addedItems.push(itemData);
                item.component.instance.addedItems = item.addedItems;
            })
        );
        this.subscriptions.add(
            item?.component?.instance?.itemRemoved?.subscribe(() => {
                item.addedItems = item.component?.instance?.addedItems;
            })
        );
    }

    itemDataValid(item: any) {
        let isValid = true;
        item.items.forEach((subItem) => {
            if (subItem.type === 'array') {
                subItem.addedItems.forEach((addedItem) => {
                    if (addedItem?.component?.instance?.isValid) {
                        if (!addedItem?.component?.instance?.isValid()) {
                            isValid = false;
                        }
                    }
                });
            } else {
                if (subItem?.component?.instance?.isValid) {
                    if (!subItem?.component?.instance?.isValid()) {
                        isValid = false;
                    }
                }
            }
        });
        return isValid;
    }

    addItemData(item) {
        let itemData = {};
        item.items.forEach((subItem) => {
            let isValid = true;
            if (subItem.type === 'array') {
                if (subItem.addedItems) {
                    itemData[subItem.key] = subItem.addedItems;
                } else {
                    itemData[subItem.key] = [];
                }
            } else {
                if (subItem?.component?.instance?.getProperties) {
                    const props = subItem?.component?.instance?.getProperties();
                    props.forEach((prop) => {
                        itemData[prop.key] = prop.value;
                    });
                    subItem?.component?.instance?.setProperties({});
                } else if (subItem?.component?.instance?.fieldValue) {
                    itemData[subItem.key] = subItem.component.instance.fieldValue;
                    subItem.component.instance.fieldValue = undefined;
                } else if (subItem.items) {
                    itemData[subItem.key] = this.addItemData(subItem);
                }
            }
        });
        return itemData;
    }

    private addFieldToParentItem(itemToAdd, parentage) {
        let parentItem;
        let items = this.items;
        parentage.forEach((parent: any) => {
            items.forEach((item: any) => {
                if (item.key === parent) {
                    parentItem = item;
                    if (item.items) {
                        items = item.items;
                    }
                }
            })
        });
        parentItem.items = itemToAdd;
    }

    private addSpecialFields(schema: any, view: ViewContainerRef, nestLevel: number, parentage: string[]) {
        const specialFields = [];
        let address = undefined;
        let hostname = undefined;
        let port = undefined;
        let protocol = undefined;
        let forwardProtocol = undefined;
        let forwardPort = undefined;
        let forwardAddress = undefined;
        let portRanges = undefined;
        let excludedProperties = [];
        for (let key in schema.properties) {
            let exclude = true;
            if (key === "port") port = schema.properties[key];
            else if (key === "address") address = schema.properties[key];
            else if (key === "hostname") hostname = schema.properties[key];
            else if (key === "protocol") protocol = schema.properties[key];
            else if (key === "forwardProtocol") forwardProtocol = schema.properties[key];
            else if (key === "forwardPort") forwardPort = schema.properties[key];
            else if (key === "forwardAddress") forwardAddress = schema.properties[key];
            else if (key === "portRanges") portRanges = schema.properties[key];
            else exclude = false;

            if (exclude) {
                excludedProperties.push(key);
            }
        }
        if ((protocol || address || hostname || port) && !(forwardProtocol && forwardAddress && forwardPort)) {
            const properties: ProtocolAddressPort = {protocol, address, hostname, port};
            specialFields.push(this.buildProtocolAddressPort(view, nestLevel, parentage, properties));
        }
        if (forwardProtocol && forwardAddress && forwardPort) {
            const properties: ProtocolAddressPort = {
                protocol: forwardProtocol,
                address: forwardAddress,
                hostname: undefined,
                port: forwardPort
            };
            specialFields.push(this.buildForwardingConfig(view, nestLevel, parentage, properties));
            excludedProperties = [...excludedProperties, ...['allowedAddresses', 'allowedPortRanges', 'allowedProtocols']];
        }
        if (portRanges) {
            specialFields.push(this.buildPortRanges(view, nestLevel, parentage, portRanges));
        }
        return {specialFields, excludedProperties};
    }

    private addField(view: ViewContainerRef, nestLevel: number, key: string, property: any, parentage: string[], parent?: any) {
        const type = this.getType(property);
        let componentRef: ComponentRef<any> | null = null;
        if (type == "object") {
            if (property.properties) {
                componentRef = this.buildNestedContainer(view, nestLevel, key, parentage, property, parent, type);
            }
        } else if (type == "integer") {
            componentRef = this.buildNumericField(view, nestLevel, key, property, parentage);
        } else if (type == "array") {
            let items: any = {};
            if (property.allOf && property.allOf.length >= 2) items = property.allOf[1];
            if (property.items) items = property.items;
            if (items.items) items = items.items;

            if (items.type && items.type == "object" && items.properties != null) {
                const subItems = [];
                for (var subKey in items.properties) {
                    subItems.push({
                        key: subKey,
                        value: items.properties[subKey]
                    });
                }
                componentRef = this.buildNestedContainer(view, nestLevel, key, parentage, items, parent, type);
            } else if (Array.isArray(items.enum)) {
                componentRef = this.buildCheckBoxListField(view, nestLevel, key, items.enum, parentage);
            } else {

                componentRef = this.buildTextListField(view, nestLevel, key, parentage);
            }
        } else if (type == "boolean") {
            componentRef = this.buildBooleanField(view, nestLevel, key, parentage);
        } else if (property.enum && property.enum.length > 0) {
            componentRef = this.buildSelectField(view, nestLevel, key, property.enum, parentage);

        } else if (type == "string") {
            componentRef = this.buildTextField(view, nestLevel, key, parentage);
        }
        return componentRef;
    }

    private addError(errors: any, key: string, msg: string) {
        if (errors[key]) errors[key] = `${errors[key]}; ${msg}`;
        else errors[key] = msg;
        return errors;
    }
}
