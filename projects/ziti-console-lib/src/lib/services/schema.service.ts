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
import _ from "lodash";
import {TextListInputComponent} from "../features/dynamic-widgets/text-list/text-list-input.component";
import {CheckboxListInputComponent} from "../features/dynamic-widgets/checkbox-list/checkbox-list-input.component";
import {
    ProtocolAddressPortInputComponent
} from "../features/dynamic-widgets/protocol-address-port/protocol-address-port-input.component";
import {PortRangesComponent} from "../features/dynamic-widgets/port-ranges/port-ranges.component";
import {ForwardingConfigComponent} from "../features/dynamic-widgets/forwarding-config/forwarding-config.component";

export type ProtocolAddressPort = {
    protocol: any;
    address: any;
    hostName: any;
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
    propertyExcludes = [
        "portChecks", 'httpChecks',
    ]
    reservedProperties = [];
    reservedPropertiesMap: any = {
        protocolAddressPort: undefined,
        forwardProtocalAddressPort: undefined,
        allowedAddresses: undefined,
        forwardAddress: undefined
    };
    private items: any[] = [];
    private bColorArray: string[] = [];
    private lColorArray: string[] = [];

    constructor() {
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
            if (value) {
                $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).addClass("on");
                $("." + ((parentage != null) ? parentage + '_' : '') + "schema_" + key + "_area").show();
                $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key.split("forward").join("").toLowerCase()).prop("disabled", true);
                if ($("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key.split("forward").join("").toLowerCase()).prop('nodeName') == "INPUT") $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key.split("forward").join("").toLowerCase()).val("");
            } else $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).removeClass("on");
        } else {
            if (type == "array") {
                $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key + "_selected").html("");
                if ($("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).hasClass("checkboxList")) {
                    let total = $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).data("total");
                    for (let i = 0; i < total; i++) {
                        $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key + "_" + i).removeClass("checked");
                    }
                }
                for (let i = 0; i < value.length; i++) {
                    if (typeof value[i] == "object") {
                        let values = [];
                        for (let prop in value[i]) {
                            values.push(prop + ": " + value[i][prop]);
                        }
                        let types = [];

                        let obj = $("#" + ((parentage != null) ? parentage + '_' : '') + 'schema_' + key + '_Button');
                        let id = obj.data("id");
                        let vals = obj.data("values").split(',');
                        for (let j = 0; j < vals.length; j++) {
                            if ($("#" + id + "_" + vals[j]).attr('type') == "number") {
                                types.push("number");
                            } else {
                                types.push("string");
                            }
                        }

                        let element = $('<div class="tag obj" data-types="' + types.toString() + '">' + values.toString() + '</div>');
                        element.click(schema.removeMe);
                        $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key + "_selected").append(element);
                    } else {
                        if ($("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).hasClass("checkboxList")) {
                            let total = $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).data("total");
                            for (let i = 0; i < total; i++) {
                                if ($("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key + "_" + i).data("value") == value[i]) {
                                    $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key + "_" + i).addClass("checked");
                                }
                            }
                        } else {
                            let element = $('<div class="tag">' + value[i] + '</div>');
                            element.click(schema.removeMe);
                            $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key + "_selected").append(element);
                        }
                    }
                }
            } else {
                $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).val(value);
            }
        }
        return value;
    }

    getValue(key: string, property: any, json: any, parentage: string[]) {
        if (this.getType(property) == "array") {
            json[key] = [];
            if ($("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).hasClass("checkboxList")) {
                let obj = $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key);
                let total = obj.data("total");
                for (let i = 0; i < total; i++) {
                    let item = $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key + "_" + i);
                    if (item.hasClass("checked")) json[key].push(item.data("value"));
                }
            } else {
                $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key + "_selected").children().each(function (i, e) {
                    if ($(e).hasClass("obj")) {
                        let items = $(e).html().split(',');
                        let types = $(e).data("types").split(',');
                        let obj: any = {};
                        for (let i = 0; i < items.length; i++) {
                            let info = items[i].split(':');
                            let prop: any = info.shift();
                            let value: any = info.join(':').trim();
                            let type = types[i];
                            if (type == "number" && !isNaN(value)) {
                                obj[prop] = Number(value);
                            } else {
                                obj[prop] = value;
                            }
                        }
                        json[key].push(obj);
                    } else {
                        json[key].push($(e).html());
                    }
                });
            }
        } else if (this.getType(property) == "boolean") {
            json[key] = $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).hasClass("on");
        } else if (this.getType(property) == "integer") {
            let numValue: any = $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).val();
            if (numValue != null && numValue.trim().length > 0) {
                numValue = numValue.trim();
                if (numValue == "" || isNaN(numValue)) {
                    numValue = 0;
                    if (key.toLowerCase().indexOf("timeout") >= 0) numValue = 5000;
                } else {
                    numValue = Number(numValue)
                }
                json[key] = numValue;
            } else {
                delete json[key];
            }
        } else {
            json[key] = $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).val();
        }
        return json;
    }

    getListValue(id: string) {
        let listItems: any[] = [];
        $("#" + id + "_selected").children().each(function (i, e) {
            if ($(e).hasClass("obj")) {
                let items = $(e).html().split(',');
                let obj: any = {};
                for (let i = 0; i < items.length; i++) {
                    let info = items[i].split(':');
                    let prop = info.shift();
                    let value: any = info.join(':').trim();
                    if (!isNaN(value)) {
                        obj[prop as string] = Number(value);
                    } else {
                        obj[prop as string] = value;
                    }
                }
                listItems.push(obj);
            } else {
                listItems.push($(e).html());
            }
        });
        return listItems;
    }

    validateProperty(schema: any, key: string, property: any, parentage: string[]) {
        let type = this.getType(property);
        if (type == "object") {
            for (let subKey in property.properties) {
                this.validateProperty(subKey, property.properties[subKey], key, []);
            }
        } else {
            let elem = $("#" + ((parentage) ? parentage + "_" : "") + "schema_" + key);
            let theValue: any = '';
            if (elem.val() != null) theValue = elem.val();
            if (type == "integer") {
                if (schema.required && schema.required.includes(key)) {
                    let min = null;
                    let max = null;
                    if (property.minimum) min = Number(property.minimum);
                    if (property.maximum) max = Number(property.maximum);
                    if (isNaN(parseInt(theValue))) elem.addClass("errors");
                    else {
                        let val = Number(theValue);
                        if (min != null && val < min) elem.addClass("errors");
                        if (max != null && val > max) elem.addClass("errors");
                    }
                }
            } else if (type == "array") {
                if (schema.data.required && schema.data.required.includes(key)) {
                    if ($("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).hasClass("checkboxList")) {
                        let obj = $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key);
                        let total = obj.data("total");
                        let hasSelection = false;
                        for (let i = 0; i < total; i++) {
                            let item = $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key + "_" + i);
                            if (item.hasClass("checked")) {
                                hasSelection = true;
                                break;
                            }
                        }
                        if (!hasSelection) $("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key).addClass("errors");
                    } else {
                        if ($("#" + ((parentage != null) ? parentage + '_' : '') + "schema_" + key + "_selected").children().length == 0) elem.addClass("errors");
                    }
                }
            } else {
                if (schema.data.required && schema.data.required.includes(key) && theValue.length == 0) elem.addClass("errors");
            }
        }
    }

    private buildNestedContainer(view: ViewContainerRef, nestLevel: number, key: string, parentage: string[], property: any, parent?: any) {
        let componentRef = view.createComponent(ObjectComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('bcolor', this.bColorArray[nestLevel]);
        const embeddedView = componentRef.instance.wrapperContents;
        componentRef.setInput('labelColor', this.lColorArray[nestLevel]);
        const newParent = [...parentage, key]
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
        let componentRef = view.createComponent(SelectorInputComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('fieldValue', '');
        componentRef.setInput('valueList', list);
        componentRef.setInput('placeholder', `select a value`);
        componentRef.setInput('labelColor', this.lColorArray[nestLevel]);
        return componentRef;
    }

    private buildCheckBoxListField(view: ViewContainerRef, nestLevel: number, key: string, list: string[], parentage: string[]) {
        let componentRef = view.createComponent(CheckboxListInputComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('fieldValue', '');
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
            key: 'portranges',
            component: componentRef
        };
    }

    private buildForwardingConfig(view: ViewContainerRef, nestLevel: number, parentage: string[], properties: ProtocolAddressPort) {
        let componentRef = view.createComponent(ForwardingConfigComponent);
        return {
            key: 'forwardingconfig',
            component: componentRef
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
        if (properties.hostName) {
            showHostName = true;
            if (properties.hostName?.key?.startsWith('forward')) labelPrefix = 'Forward ';
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
        componentRef.setInput('protocolValue', '');
        componentRef.setInput('addressValue', '');
        componentRef.setInput('hostNameValue', '');
        componentRef.setInput('portValue', '');
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
        const excludedProperites = this.addSpecialFields(schema, view, nestLevel, parentage);
        for (let key in schema.properties) {
            if (excludedProperites.includes(key) || this.propertyExcludes.includes(key)) {
                continue;
            }
            let item: any = {};
            const component = this.addField(view, nestLevel, key, schema.properties[key], parentage, item);
            item.key = key;
            item.component = component;
            if (this.reservedProperties.includes(key)) {
                this.reservedPropertiesMap[key] = item;
            } if (parentage.length > 0) {
                if (parent.items) {
                    parent.items.push(item);
                } else {
                    parent.items = [item];
                }
            } else {
                this.items.push(item);
            }
        }
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
        let address = undefined;
        let hostName = undefined;
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
            else if (key === "hostname") hostName = schema.properties[key];
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
        if ((protocol || address || hostName || port) && !(forwardProtocol && forwardAddress && forwardPort)) {
            const properties: ProtocolAddressPort = {protocol, address, hostName, port};
            this.items.push(this.buildProtocolAddressPort(view, nestLevel, parentage, properties));
        }
        if (forwardProtocol && forwardAddress && forwardPort) {
            const properties: ProtocolAddressPort = {
                protocol: forwardProtocol,
                address: forwardAddress,
                hostName: undefined,
                port: forwardPort
            };
            this.items.push(this.buildForwardingConfig(view, nestLevel, parentage, properties));
            excludedProperties = [...excludedProperties, ...['allowedAddresses', 'allowedPortRanges', 'allowedProtocols']];
        }
        if (portRanges) {
            this.items.push(this.buildPortRanges(view, nestLevel, parentage, portRanges));
        }
        return excludedProperties;
    }

    private addField(view: ViewContainerRef, nestLevel: number, key: string, property: any, parentage: string[], parent?: any) {
        const type = this.getType(property);
        let componentRef: ComponentRef<any> | null = null;
        if (type == "object") {
            if (property.properties) {
                componentRef = this.buildNestedContainer(view, nestLevel, key, parentage, property, parent);
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
                        key: key,
                        subKey: subKey,
                        value: items.properties[subKey]
                    });
                }
                componentRef = this.buildNestedContainer(view, nestLevel, key, parentage, property);
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
