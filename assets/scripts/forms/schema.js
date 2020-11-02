
var schema = {
    data: {},
    formId: null,
    value: {},
    codeView: null,
    timeoutId: null,
    init: function(formId, codeId) {
        schema.formId = formId;
        if (codeId) {
            schema.codeView = CodeMirror.fromTextArea(document.getElementById(codeId), { mode: "application/json", lineNumbers: true, extraKeys: {"Ctrl-Space": "autocomplete"} });
            schema.codeView.setSize(null, 260);
            schema.codeView.on('keyup', function () {
                if (schema.timeoutId) clearTimeout(schema.timeoutId);
                schema.timeoutId = setTimeout(function() {
                    schema.updateForm(JSON.parse(schema.codeView.getValue()));
                }, 1000);
            }); 
        }    
    },
    setView: function(isCode) {
        if (schema.codeView) {
            if (isCode) {
                $(".CodeMirror").show();
                $(".jsonV").show();
                schema.codeView.setValue(JSON.stringify(schema.val()));
                schema.codeView.autoFormatRange({line:0, ch:0}, {line:schema.codeView.lineCount()});
                $("#"+schema.formId).hide();
            } else {
                $(".CodeMirror").hide();
                $(".jsonV").hide();
                $("#"+schema.formId).show();
            }
        } else {
            $(".CodeMirror").hide();
            $(".jsonV").hide();
            $("#"+schema.formId).show();
        }
    },
    events: function() {
        $('.arrayEntry').keyup(schema.addArray);
        $('.arrayEntry').blur(schema.addBlurArray);
        $(".toggle").off("click");
        $(".toggle").on("click", app.toggle);
        $(".check").click(app.check);
        $(".subobject").click(schema.subobject);
    },
    removeMe: function(e) {
        $(e.currentTarget).remove();
    },
    subobject: function(e) {
        var obj = $(e.currentTarget);
        var id = obj.data("id");
        var to = obj.data("to");
        var vals = obj.data("values").split(',');
        var val = "";
        var types = [];
        for (var i=0; i<vals.length; i++) {
            val += ((i>0)?",":"")+vals[i]+": "+$("#"+id+"_"+vals[i]).val();
            $("#"+id+"_"+vals[i]).val("");
            if ($("#"+id+"_"+vals[i]).attr('type')=="number") {
                types.push("number");
            } else {
                types.push("string");
            }
        }
        var element = $('<div class="tag obj" data-types="'+types.toString()+'">'+val+'</div>');
        element.click(schema.removeMe);
        $("#"+to).append(element);
    },
    addBlurArray: function(e) {
        var id = $(e.currentTarget).prop("id");
        var val = $(e.currentTarget).val().split(',').join('').trim();
        if (val.length>0) {
            var element = $('<div class="tag">'+val+'</div>');
            element.click(schema.removeMe);
            $("#"+id+"_selected").append(element);
            $(e.currentTarget).val("");
        }
    },
    addArray: function(e) {
        if (e.keyCode==188||e.keyCode==13) {
            var id = $(e.currentTarget).prop("id");
            var val = $(e.currentTarget).val().split(',').join('').trim();
            if (val.length>0) {
                var element = $('<div class="tag">'+val+'</div>');
                element.click(schema.removeMe);
                $("#"+id+"_selected").append(element);
                $(e.currentTarget).val("");
            }
        }
    },
    getType: function(property) {
        if (property.enum!=null) return "String";
        else {
            if (property.type) return property.type;
            else {
                if (property.allOf&&property.allOf.length>0) {
                    return property.allOf[0].type;
                } else {
                    return "String";
                }
            }
        }
    },
    getField: function(key, property, parentKey) {
        var html = '';
        var type = "text";
        html += '<label for="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'">'+key.replace(/([A-Z])/g, ' $1').trim()+'</label>';
        if (schema.getType(property)=="object") {
            if (property.properties!=null) {
                html += '<div class="subform">';
                for (var subKey in property.properties) {
                    html += schema.getField(subKey, property.properties[subKey], key);
                }
                html += '</div>';
            } else html = '';
        } else if (schema.getType(property)=="integer")  {
            html = '<div>'+html;
            type = "number";
            placeholder = "enter a numberic value";
            if (property.minimum!=null&&property.maximum!=null) placeholder = "numeric value between "+property.minimum+"-"+property.maximum;
            else {
                if (property.minimum!=null) placeholder = "number great than "+property.minimum;
                if (property.maximum!=null) placeholder = "number less than "+property.maximum;
            }
            html += '<input id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'" type="number" class="jsonEntry" placeholder="'+placeholder+'" /></div>';
        } else if (schema.getType(property)=="array")  {
            html = '<div>'+html;
            if (property.allOf[1].items.type=="object"&&property.allOf[1].items.properties!=null) {
                html += '<div id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'_selected" class="selectedItems"></div>';
                html += '<div class="subform three">';
                var values = [];
                for (var subKey in property.allOf[1].items.properties) {
                    values.push(subKey);
                    html += schema.getField(subKey, property.allOf[1].items.properties[subKey], key);
                }
                html += '<div><div id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'_Button" class="button subobject" data-id="'+key+'_schema" data-to="schema_'+key+'_selected" data-values="'+values.toString()+'">Add</div></div>'
                html += '</div>';            
            } else {
                if (Array.isArray(property.allOf[1].items.enum)) {
                    html += '<div id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'" data-total="'+property.allOf[1].items.enum.length+'" class="checkboxList">';
                    for (var i=0; i<property.allOf[1].items.enum.length; i++) {
                        html += '<label><div id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'_'+i+'" data-value="'+property.allOf[1].items.enum[i]+'" class="check"></div> '+property.allOf[1].items.enum[i]+'</label>';
                    }
                    html += '</div>';
                } else {
                    html += '<div id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'_selected" class="selectedItems"></div>';
                    html += '<input id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'" type="text" class="jsonEntry arrayEntry" placeholder="enter values seperated with a comma"/></div>';
                }
            }
        } else if (schema.getType(property)=="boolean") {
            html = '<div>'+html;
            html += '<div id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'" class="toggle"><div class="switch"></div><div class="label"></div></div></div>';
        } else {
            html = '<div>'+html;
            if (property.enum&&property.enum.length>0) {
                html += '<select id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'" class="jsonSelect">';
                for (var i=0; i<property.enum.length; i++) {
                    html += '<option value="'+property.enum[i]+'">'+property.enum[i]+'</option>';
                }
                html += '</select></div>';
            } else {
                html += '<input id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'" type="text" class="jsonEntry" placeholder="enter values seperated with a comma"/></div>';
            }
        }
        return html;
    },
    render: function() {
        var html = '';
        if (schema.data&&schema.data.properties) {
            for (var key in schema.data.properties) {
                html += schema.getField(key, schema.data.properties[key]);
            }
        }
        $("#"+schema.formId).html(html);
        if (schema.codeView!=null) {
            setTimeout(function() {
                var json = schema.val();
                schema.codeView.setValue(JSON.stringify(json));
                schema.codeView.autoFormatRange({line:0, ch:0}, {line:schema.codeView.lineCount()});
            }, 500);
        }
        schema.events();
    },
    updateForm: function(value) {
        schema.val(value, true);
    },
    val: function(value, bypass) {
        if (value!=null) {
            if (schema.data&&schema.data.properties) {
                for (var key in schema.data.properties) {
                    var property = schema.data.properties[key];
                    var type = schema.getType(property);
                    if (type=="object") {
                        if (value[key]==null) value[key] = {};
                        if (property.properties!=null) {
                            for (var subKey in property.properties) {
                                value[key][subKey] = schema.setValue(subKey, type, value[key][subKey], key);
                            }
                        }
                    } else value[key] = schema.setValue(key, type, value[key]);
                }
                if (!bypass) {
                    schema.codeView.setValue(JSON.stringify(value));
                    schema.codeView.autoFormatRange({line:0, ch:0}, {line:schema.codeView.lineCount()});
                    schema.codeView.setSize(null, 260);
                }
            }
        } else {
            var json = {};
            if (schema.data&&schema.data.properties) {
                for (var key in schema.data.properties) {
                    var property = schema.data.properties[key];
                    if (schema.getType(property)=="object") {
                        json[key] = {};
                        if (property.properties!=null) {
                            for (var subKey in property.properties) {
                                json[key] = schema.getValue(subKey, property.properties[subKey], json[key], key);
                            }
                        }
                    } else json = schema.getValue(key, property, json);
                }
            }
            return json;
        }
    },
    setValue: function(key, type, value, parentKey) {
        if (value==null) {
            if (type=="array") {
                value = [];
            } else if (type=="integer") {
                value = 0;
            } else if (type=="boolean") {
                value = false;
            } else {
                value = "";
            }
        } else {
            if (type=="array") {
                $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key+"_selected").html("");
                if ($("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).hasClass("checkboxList")) {
                    var total = $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).data("total");
                    for (var i=0; i<total; i++) {
                        $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key+"_"+i).removeClass("checked");
                    }
                }
                for (var i=0; i<value.length; i++) {
                    if (typeof value[i] == "object") {
                        var values = [];
                        for (var prop in value[i]) {
                            values.push(prop+": "+value[i][prop]);
                        }
                        var types = [];

                        var obj = $("#"+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'_Button');
                        var id = obj.data("id");
                        var vals = obj.data("values").split(',');
                        for (var j=0; j<vals.length; j++) {
                            if ($("#"+id+"_"+vals[j]).attr('type')=="number") {
                                types.push("number");
                            } else {
                                types.push("string");
                            }
                        }

                        var element = $('<div class="tag obj" data-types="'+types.toString()+'">'+values.toString()+'</div>');
                        element.click(schema.removeMe);
                        $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key+"_selected").append(element);
                    } else {
                        if ($("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).hasClass("checkboxList")) {
                            var total = $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).data("total");
                            for (var i=0; i<total; i++) {
                                if ($("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key+"_"+i).data("value")==value[i]) {
                                    $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key+"_"+i).addClass("checked");
                                }
                            }
                        } else {
                            var element = $('<div class="tag">'+value[i]+'</div>');
                            element.click(schema.removeMe);
                            $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key+"_selected").append(element);
                        }
                    }
                }
             } else if (type=="boolean") {
                if (value) $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).addClass("on");
                else $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).removeClass("on");
            } else {    
                $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).val(value);
            }
        }
        return value;
    },
    getValue: function(key, property, json, parentKey) {
        if (schema.getType(property)=="array") {
            json[key] = [];
            if ($("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).hasClass("checkboxList")) {
                var obj = $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key);
                var total = obj.data("total");
                for (var i=0; i<total; i++) {
                    var item = $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key+"_"+i);
                    if (item.hasClass("checked")) json[key].push(item.data("value"));
                }
            } else {
                $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key+"_selected").children().each(function(i, e) {
                    if ($(e).hasClass("obj")) {
                        var items = $(e).html().split(',');
                        var types = $(e).data("types").split(',');
                        var obj = {};
                        for (var i=0; i<items.length; i++) {
                            var info = items[i].split(':');
                            var prop = info.shift();
                            var value = info.join(':').trim();
                            var type = types[i];
                            if (type=="number"&&!isNaN(value)) {
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
        } else if (schema.getType(property)=="boolean") {
            json[key] = $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).hasClass("on");
        } else if (schema.getType(property)=="integer") {
            json[key] = Number($("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).val());
        } else {    
            json[key] = $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).val();
        }       
        return json;
    },
    validate: function() {
        for (var key in schema.data.properties) {
            var property = schema.data.properties[key];
            schema.validateProperty(key, property);
        }
    },
    validateProperty: function(key, property, parentKey) {
        var type = schema.getType(property);
        if (type=="object") {
            for (var subKey in property.properties) {
                schema.validateProperty(subKey, property.properties[subKey], key);
            }
        } else {
            var elem = $("#"+((parentKey)?parentKey+"_":"")+"schema_"+key);
            var theValue = '';
            if (elem.val()!=null) theValue = elem.val();
            if (type=="integer") {
                if  (schema.data.required.includes(key)) {
                    var min = null;
                    var max = null;
                    if (property[key].minimum) min = Number(property[key].minimum);
                    if (property[key].maximum) max = Number(property[key].maximum);
                    if (isNaN(parseInt(theValue))) elem.addClass("errors");
                    else {
                        var val = Number(theValue);
                        if (min!=null&val<min) elem.addClass("errors");
                        if (max!=null&val>max) elem.addClass("errors");
                    }
                }
            } else if (type=="array") {
                if  (schema.data.required.includes(key)) {
                    if ($("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).hasClass("checkboxList")) {
                        var obj = $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key);
                        var total = obj.data("total");
                        var hasSelection = false;
                        for (var i=0; i<total; i++) {
                            var item = $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key+"_"+i);
                            if (item.hasClass("checked")) {
                                hasSelection = true;
                                break;
                            }
                        }             
                        if (!hasSelection) $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).addClass("errors");        
                    } else {
                        if ($("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key+"_selected").children().length==0) elem.addClass("errors");
                    }
                }
            } else {
                if (schema.data.required.includes(key)&&theValue.length==0) elem.addClass("errors");
            }
        }
    }
}