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


var forms = {};

function exists() {
    return this!=null&&this.trim().length>0;
}

String.prototype.exists = exists;

function FormItem(id, label, validation, type, properties, data) {
    this.id = id;
    this.label = label;
    this.validation = validation;
    this.type = type;
    this.properties = properties;
    this.data = data;
}

forms.renderItem = function(obj) {
    var html = '';
    if (obj.label.exists()) html += '<label for="'+id+'">'+label+'</label>';
    if (obj.type=="input") {
        html += '<input id="'+obj.id+'" type="text"';
        foreach (key in obj.properties) {
            html += ' '+key+'="'+properties[key]+'"';
        }
        if (obj.data.exists()) html += ' value="'+data+'"';
        html += '/>';
    } else if (obj.type=="textarea") {
        html += '<textarea id="'+obj.id+'"';
        foreach (key in obj.properties) {
            html += ' '+key+'="'+properties[key]+'"';
        }
        html += '>';
        if (obj.data.exists()) html += data;
        html += '</textarea>';
    }
    return html;
}

forms.configType  = {
    form: [
        FormItem("TypeName", "Type Name", "input", "notempty", {
            type: "text",
            maxLength: 500,
            placeholder: "name the configuration type",
        }),
        FormItem("Schema", "Schema", "textarea", "notempty", {})
    ],
    inject: function(id) {
        var html = ''
        var items = forms.configType.form;
        for (var i=0; i<items.length; i++) {
            html += this.form.renderItem(items[i]);
        }
        $("#"+id).html(html);[]
    }
}
