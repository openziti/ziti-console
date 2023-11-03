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

export type ProtocolAddressPort = {
    protocol: any;
    address: any;
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
        "portchecks", 'httpchecks',
        'protocol', 'address', 'port',
        'forwardprotocol', 'forwardaddress', 'forwardport'
    ]
    private items: any[] = [];
    private bColorArray: string[] = [];
    private lColorArray: string[] = [];

    constructor() {
    }

    init(formId: string, codeId: string) {
        // schema.formId = formId;
        // if (codeId) {
        //     schema.codeView = CodeMirror.fromTextArea(document.getElementById(codeId), {
        //         mode: "application/json",
        //         lineNumbers: true,
        //         extraKeys: {"Ctrl-Space": "autocomplete"}
        //     });
        //     schema.codeView.setSize(null, 260);
        //     schema.codeView.on('keyup', () => {
        //         if (schema.timeoutId) clearTimeout(schema.timeoutId);
        //         schema.timeoutId = setTimeout(() => {
        //             schema.updateForm(JSON.parse(schema.codeView.getValue()));
        //         }, 1000);
        //     });
        // }
    }

    toggle(e: any) {
        // let id = $(e.currentTarget).attr("id");
        // if ($(e.currentTarget).hasClass("on")) {
        //     $(e.currentTarget).removeClass("on");
        //     if (id) {
        //         $("." + id + "_area").hide();
        //         $("#" + id.split("forward").join("").toLowerCase()).prop("disabled", false);
        //     }
        // } else {
        //     $(e.currentTarget).addClass("on");
        //     if (id) {
        //         $("." + id + "_area").show();
        //         $("#" + id.split("forward").join("").toLowerCase()).prop("disabled", true);
        //         if ($("#" + id.split("forward").join("").toLowerCase()).prop('nodeName') == "INPUT") $("#" + id.split("forward").join("").toLowerCase()).val("");
        //     }
        // }
    }

    suggest(e: any) {
        // let element = $(e.currentTarget);
        // schema.suggestingField = element.attr("id");
        // let suggestionSource = element.data("suggest");
        // schema.suggesting = new Data(suggestionSource);
        // schema.suggesting.closeModals = false;
        // schema.suggesting.init(false, false, false);
        // context.removeListener(suggestionSource);
        // context.addListener(suggestionSource, schema.suggestLoaded);
        //
        // if (this.suggestId) clearTimeout(this.suggestId);
        //
        // schema.suggesting.paging.filter = element.val();
        // if (e.keyCode == 13) {
        //     schema.suggesting.get();
        // } else {
        //     this.suggestId = setTimeout(schema.suggesting.get.bind(schema.suggesting), 500);
        // }
    }

    suggestLoaded(e: any) {
        // let list = $("#" + schema.suggestingField + "_Suggestions");
        // list.html("");
        // if (e.data.length > 0) {
        //     for (let i = 0; i < e.data.length; i++) {
        //         list.append('<div class="suggestItem" data-field="' + schema.suggestingField + '">' + e.data[i].name + '</div>');
        //     }
        //     list.addClass("open");
        //     $(".suggestItem").click((e: any) => {
        //         let suggested = $(e.currentTarget);
        //         $("#" + suggested.data("field")).val(suggested.html());
        //         $("#" + schema.suggestingField + "_Suggestions").removeClass("open");
        //         $("#" + schema.suggestingField + "_Suggestions").html("");
        //     });
        // } else {
        //     list.removeClass("open");
        // }
    }

    subobject(e: any) {
        // let obj = $(e.currentTarget);
        // let id = obj.data("id");
        // let to = obj.data("to");
        // let vals = obj.data("values").split(',');
        // let val = "";
        // let types = [];
        // for (let i = 0; i < vals.length; i++) {
        //     val += ((i > 0) ? "" : "") + vals[i] + ": " + $("#" + id + "_" + vals[i]).val();
        //     $("#" + id + "_" + vals[i]).val("");
        //     if ($("#" + id + "_" + vals[i]).attr('type') == "number") {
        //         types.push("number");
        //     } else {
        //         types.push("string");
        //     }
        // }
        // let element = $('<div class="tag obj" data-types="' + types.toString() + '">' + val + '</div>');
        // element.click(schema.removeMe);
        // $("#" + to).append(element);
    }

    addBlurArray(e: any) {
        // let id = $(e.currentTarget).prop("id");
        // let val = $(e.currentTarget).val().split('').join('').trim();
        // if (val.length > 0) {
        //     let element = $('<div class="tag">' + val + '</div>');
        //     element.click(schema.removeMe);
        //     $("#" + id + "_selected").append(element);
        //     $(e.currentTarget).val("");
        // }
    }

    addArray(e: any) {
        // if (e.keyCode == 188 || e.keyCode == 13) {
        //     let id = $(e.currentTarget).prop("id");
        //     let val = $(e.currentTarget).val().split('').join('').trim();
        //     if (val.length > 0) {
        //         let element = $('<div class="tag">' + val + '</div>');
        //         element.click(schema.removeMe);
        //         $("#" + id + "_selected").append(element);
        //         $(e.currentTarget).val("");
        //     }
        // }
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
            // if (schema.codeView != null) {
            //     setTimeout(() => {
            //         let json = schema.val();
            //         schema.codeView.setValue(JSON.stringify(json));
            //         schema.codeView.autoFormatRange({line: 0, ch: 0}, {line: schema.codeView.lineCount()});
            //     }, 500);
            // }
        }
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
            const k = key.toLowerCase();
            errors = {...errors, ...this.validateField(k, schema, formData, schema.properties[key], parentage)};
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

    private buildNestedContainer(view: ViewContainerRef, nestLevel: number, key: string, parentage: string[], property: any) {
        let componentRef = view.createComponent(ObjectComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('bcolor', this.bColorArray[nestLevel]);
        const embeddedView = componentRef.instance.wrapperContents;
        componentRef.setInput('labelColor', this.lColorArray[nestLevel]);
        const newParent = [...parentage, key]
        this.addFields(property, embeddedView, ++nestLevel, newParent);
        return componentRef;
    }

    private buildBooleanField(view: ViewContainerRef, nestLevel: number, key: string, parentage: string[]) {
        let componentRef = view.createComponent(BooleanToggleInputComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('fieldValue', '');
        componentRef.setInput('labelColor', this.lColorArray[nestLevel]);
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
        componentRef.setInput('fieldValue', false);
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

    private buildTextListField(view: ViewContainerRef, nestLevel: number, key: string, parentage: string[]) {
        let componentRef = view.createComponent(TextListInputComponent);
        componentRef.setInput('fieldName', this.getLabel(key));
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('fieldValue', ['test1', 'test2']);
        componentRef.setInput('placeholder', `enter values separated with a comma`);
        componentRef.setInput('labelColor', this.lColorArray[nestLevel]);
        return componentRef;
    }

    private buildProtocolAddressPort(view: ViewContainerRef, nestLevel: number, parentage: string[], properties: ProtocolAddressPort) {
        let labelPrefix = undefined;
        let protocolList = undefined;
        let showProtocol = false;
        let showAddress = false;
        let showPort = false;
        if (properties.protocol) {
            showProtocol = true;
            protocolList = properties.protocol.items.enum.map(p => p.toUpperCase());
            if (properties.protocol.key.startsWith('forward')) labelPrefix = 'Forward ';
        }
        if (properties.address) {
            showAddress = true;
            if (properties.address.key.startsWith('forward')) labelPrefix = 'Forward ';
        }
        if (properties.port) {
            showPort = true;
            if (properties.port.key.startsWith('forward')) labelPrefix = 'Forward ';
        }
        let componentRef = view.createComponent(ProtocolAddressPortInputComponent);
        if (parentage && !_.isEmpty(parentage)) componentRef.setInput('parentage', parentage);
        componentRef.setInput('showProtocol', showProtocol);
        componentRef.setInput('showAddress', showAddress);
        componentRef.setInput('showPort', showPort);
        componentRef.setInput('protocolValue', '');
        componentRef.setInput('addressValue', '');
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

    private addFields(schema: any, view: ViewContainerRef, nestLevel: number, parentage: string[]) {
        // this.addSpecialFields(schema, view, nestLevel, parentage);
        for (let key in schema.properties) {
            const k = key.toLowerCase();
            // if (this.propertyExcludes.indexOf(k) < 0) {
            this.items.push({
                key: k,
                component: this.addField(view, nestLevel, key, schema.properties[key], parentage)
            });
            // }
        }
    }

    private addSpecialFields(schema: any, view: ViewContainerRef, nestLevel: number, parentage: string[]) {
        let address = undefined;
        let hostName = undefined;
        let port = undefined;
        let protocol = undefined;
        let forwardProtocol = undefined;
        let forwardPort = undefined;
        let forwardAddress = undefined;
        for (let key in schema.properties) {
            if (key === "port") port = schema.properties[key];
            else if (key === "address") address = schema.properties[key];
            else if (key === "hostname") hostName = schema.properties[key];
            else if (key === "protocol") protocol = schema.properties[key];
            else if (key === "forwardprotocol") forwardProtocol = schema.properties[key];
            else if (key === "forwardport") forwardPort = schema.properties[key];
            else if (key === "forwardaddress") forwardAddress = schema.properties[key];
        }
        if (protocol || address || port) {
            const properties: ProtocolAddressPort = {protocol, address, port};
            this.items.push(this.buildProtocolAddressPort(view, nestLevel, parentage, properties));
        }
        if (forwardProtocol || forwardAddress || forwardPort) {
            const properties: ProtocolAddressPort = {
                protocol: forwardProtocol,
                address: forwardAddress,
                port: forwardPort
            };
            this.items.push(this.buildProtocolAddressPort(view, nestLevel, parentage, properties));
        }
    }

    private addField(view: ViewContainerRef, nestLevel: number, key: string, property: any, parentage: string[]) {
        const type = this.getType(property);
        let componentRef: ComponentRef<any> | null = null;
        if (type == "object") {
            if (property.properties != null) {
                componentRef = this.buildNestedContainer(view, nestLevel, key, parentage, property);
            }
        } else if (type == "integer") {
            componentRef = this.buildNumericField(view, nestLevel, key, property, parentage);
        } else if (type == "array") {
            let items: any = {};
            if (property.allOf && property.allOf.length >= 2) items = property.allOf[1];
            if (property.items) items = property.items;
            if (items.items) items = items.items;

            if (items.type && items.type == "object" && items.properties != null) {
                componentRef = this.buildNestedContainer(view, nestLevel, key, parentage, property);
                // if (items.type && items.type == "object" && items.properties != null) {
                //     let properties = items.properties;
                //     html += '<div id="' + ((parentage != null) ? parentage + '_' : '') + 'schema_' + key + '_selected" class="selectedItems"></div>';
                //     html += '<div class="subform">';
                //     let values = [];
                //     if (key == "portRanges" || key == "allowedPortRanges") html += '<div class="grid splitadd">';
                //     let order = ['low', 'high'];
                //     let subItems = [];
                //     for (let subKey in properties) {
                //         subItems.push({
                //             key: key,
                //             subKey: subKey,
                //             value: properties[subKey]
                //         });
                //     }
                //     subItems.sort(function (a, b) {
                //         let aPort = a.subKey.replace(/[^A-Za-z]+/g, '').toLowerCase().replace(/\s/g, '');
                //         let bPort = b.subKey.replace(/[^A-Za-z]+/g, '').toLowerCase().replace(/\s/g, '');
                //         return order.indexOf(aPort) - order.indexOf(bPort);
                //     });
                //     for (let i = 0; i < subItems.length; i++) {
                //         values.push(subItems[i].subKey);
                //         html += this.getField(subItems[i].subKey, subItems[i].value, subItems[i].key);
                //     }
                //     html += '<div><div id="' + ((parentage != null) ? parentage + '_' : '') + 'schema_' + key + '_Button" class="button subobject" data-id="' + key + '_schema" data-to="' + ((parentage != null) ? parentage + '_' : '') + 'schema_' + key + '_selected" data-values="' + values.toString() + '">Add</div></div>'
                //     if (key == "portRanges") html += '</div>';
                //     html += '</div></div>';
                // } else
            } else if (Array.isArray(items.enum)) {
                componentRef = this.buildCheckBoxListField(view, nestLevel, key, items.enum, parentage);

            } else {

                componentRef = this.buildTextListField(view, nestLevel, key, parentage);
            }
        } else if (type == "boolean") {
            componentRef = this.buildBooleanField(view, nestLevel, key, parentage);

            // html = '<div>' + html;
            // html += '<div id="schema_' + key + '" class="toggle"><div class="switch"></div><div class="label"></div></div></div>';
            // if (key == "dialInterceptedAddress") {
            //     html += '<div class="schema_dialInterceptedAddress_area" style="display:none">';
            //     html += '<label for="schema_' + key + '_allowedAddresses">Forward Addresses</label>';
            //     html += '<div id="schema_' + key + '_allowedAddresses_selected" class="selectedItems"></div>';
            //     html += '<input id="schema_' + key + '_allowedAddresses" type="text" class="jsonEntry arrayEntry" placeholder="enter values seperated with a comma"/></div>';
            //     html += "</div>";
            // }
            // if (key == "dialInterceptedPort") {
            //     html += '<div class="schema_dialInterceptedPort_area" style="display:none">';
            //     html += '<label for="schema_' + key + '_allowedPorts">Forward Port Ranges</label>';
            //     html += '<div id="schema_' + key + '_allowedPorts_selected" class="selectedItems"></div>';
            //
            //     html += '<div class="subform"><div class="grid splitadd">';
            //     html += '<div><label for="">High</label>';
            //     html += '<input id="schema_' + key + '_allowedPorts_high" type="text" class="jsonEntry" placeholder="enter the value"/></div>';
            //     html += '<div><label for="">Low</label>';
            //     html += '<input id="schema_' + key + '_allowedPorts_low" type="text" class="jsonEntry" placeholder="enter the value"/></div>';
            //     html += '<lab><div id="' + key + '_Button" class="button subobject" data-id="schema_' + key + '_allowedPorts" data-to="schema_' + key + '_allowedPorts_selected" data-types="number,number" data-values="high,low">Add</div></label>'
            //     html += '</div></div></div>';
            // }
            // if (key == "dialInterceptedProtocol") {
            //     html += '<div class="schema_dialInterceptedProtocol_area" style="display:none">';
            //     html += '<label for="schema_' + key + '_allowedProtocols">Forward Protocols</label>';
            //     html += '<div id="schema_' + key + '_allowedProtocols_selected" class="selectedItems"></div>';
            //     html += '<input id="schema_' + key + '_allowedProtocols" type="text" class="jsonEntry arrayEntry" placeholder="enter values seperated with a comma"/></div>';
            //     html += "</div>";
            // }
        } else if (property.enum && property.enum.length > 0) {
            componentRef = this.buildSelectField(view, nestLevel, key, property.enum, parentage);

        } else if (type == "string") {
            componentRef = this.buildTextField(view, nestLevel, key, parentage);
        }
        return componentRef;
    }

    // val(schema: any, value: any, bypass: boolean) {
    //     if (value != null) {
    //         if (schema.properties) {
    //             for (let key in schema.properties) {
    //                 let property = schema.properties[key];
    //                 let type = this.getType(property);
    //                 if (type == "object") {
    //                     if (value[key] == null) value[key] = {};
    //                     if (property.properties != null) {
    //                         for (let subKey in property.properties) {
    //                             value[key][subKey] = this.setValue(schema, subKey, type, value[key][subKey], key);
    //                         }
    //                     }
    //                 } else value[key] = this.setValue(schema, key, type, value[key]);
    //             }
    //             // if (!bypass) {
    //             //     schema.codeView.setValue(JSON.stringify(value));
    //             //     schema.codeView.autoFormatRange({line: 0, ch: 0}, {line: schema.codeView.lineCount()});
    //             //     schema.codeView.setSize(null, 260);
    //             // }
    //         }
    //     } else {
    //         let json: any = {};
    //         if (schema.properties) {
    //             for (let key in schema.properties) {
    //                 let property = schema.properties[key];
    //                 if (this.getType(property) == "object") {
    //                     json[key] = {};
    //                     if (property.properties != null) {
    //                         for (let subKey in property.properties) {
    //                             json[key] = this.getValue(schema, subKey, property.properties[subKey], json[key]);
    //                         }
    //                     }
    //                 } else json = this.getValue(schema, key, property, json);
    //             }
    //             if (json.dialInterceptedAddress) {
    //                 json.allowedAddresses = schema.getListValue('schema_dialInterceptedAddress_allowedAddresses');
    //                 json.forwardAddress = true;
    //                 delete json.address;
    //                 delete json.dialInterceptedAddress;
    //             } else {
    //                 delete json.dialInterceptedAddress;
    //             }
    //             if (json.dialInterceptedProtocol) {
    //                 json.allowedProtocols = schema.getListValue('schema_dialInterceptedProtocol_allowedProtocols');
    //                 json.forwardProtocol = true;
    //                 delete json.protocol;
    //                 delete json.dialInterceptedProtocol;
    //             } else {
    //                 delete json.dialInterceptedProtocol;
    //             }
    //             if (json.dialInterceptedPort) {
    //                 json.allowedPortRanges = schema.getListValue('schema_dialInterceptedPort_allowedPorts');
    //                 json.forwardPort = true;
    //                 delete json.port;
    //                 delete json.dialInterceptedPort;
    //             } else {
    //                 delete json.dialInterceptedPort;
    //             }
    //             if (json.forwardProtocol) {
    //                 delete json.protocol;
    //             } else {
    //                 delete json.forwardProtocol;
    //                 delete json.allowedProtocols;
    //             }
    //             if (json.forwardPort) {
    //                 delete json.port;
    //             } else {
    //                 delete json.forwardPort;
    //                 delete json.allowedPortRanges;
    //             }
    //             if (json.forwardAddress) {
    //                 delete json.address;
    //             } else {
    //                 delete json.forwardAddress;
    //                 delete json.allowedAddresses;
    //             }
    //             // if (json.listenOptions) delete json.listenOptions;
    //             if (json.httpChecks) delete json.httpChecks;
    //             if (json.portChecks) delete json.portChecks;
    //         }
    //         return json;
    //     }
    // }

    private addError(errors: any, key: string, msg: string) {
        if (errors[key]) errors[key] = `${errors[key]}; ${msg}`;
        else errors[key] = msg;
        return errors;
    }
}
