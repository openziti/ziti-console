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


var schema = {
    data: {},
    formId: null,
    value: {},
    codeView: null,
    timeoutId: null,
    suggesting: null,
    suggestId: null,
    suggestingField: "",
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
                $("#JSONViewArea").find(".CodeMirror").hide();
                $(".jsonV").hide();
                $("#"+schema.formId).show();
            }
        } else {
            $("#JSONViewArea").find(".CodeMirror").hide();
            $(".jsonV").hide();
            $("#"+schema.formId).show();
        }
    },
    events: function() {
        $('.arrayEntry').keyup(schema.addArray);
        $('.arrayEntry').blur(schema.addBlurArray);
        $(".toggle").off("click");
        $(".toggle").on("click", schema.toggle);
        $(".check").click(app.check);
        $(".subobject").click(schema.subobject);
        $("input[data-suggest]").keyup(schema.suggest);
    },
    toggle: function(e) {
        var id = $(e.currentTarget).attr("id");
		if ($(e.currentTarget).hasClass("on")) {
			$(e.currentTarget).removeClass("on");
            if (id) {
                $("."+id+"_area").hide();
                $("#"+id.split("forward").join("").toLowerCase()).prop("disabled", false);
            }
		} else {
			$(e.currentTarget).addClass("on");
            if (id) {
                $("."+id+"_area").show();
                $("#"+id.split("forward").join("").toLowerCase()).prop("disabled", true);
                if ($("#"+id.split("forward").join("").toLowerCase()).prop('nodeName')=="INPUT") $("#"+id.split("forward").join("").toLowerCase()).val("");
            }
		}
    },  
    suggest: function(e) {
        var element = $(e.currentTarget);
        schema.suggestingField = element.attr("id");
        var suggestionSource = element.data("suggest");
        schema.suggesting = new Data(suggestionSource);
        schema.suggesting.closeModals = false;
        schema.suggesting.init(false, false, false);
        context.removeListener(suggestionSource);
        context.addListener(suggestionSource, schema.suggestLoaded);
         
		if (this.suggestId) clearTimeout(this.suggestId);

		schema.suggesting.paging.filter = element.val();
		if (e.keyCode==13) {
			schema.suggesting.get();
		} else {
			this.suggestId = setTimeout(schema.suggesting.get.bind(schema.suggesting), 500);
		}
    },
    suggestLoaded: function(e) {
        var list = $("#"+schema.suggestingField+"_Suggestions");
        list.html("");
        if (e.data.length>0) {
            for (var i=0; i<e.data.length; i++) {
                list.append('<div class="suggestItem" data-field="'+schema.suggestingField+'">'+e.data[i].name+'</div>');
            }
            list.addClass("open");
            $(".suggestItem").click((e) => {
                var suggested = $(e.currentTarget);
                $("#"+suggested.data("field")).val(suggested.html());
                $("#"+schema.suggestingField+"_Suggestions").removeClass("open");
                $("#"+schema.suggestingField+"_Suggestions").html("");
            });
        } else {
            list.removeClass("open");
        }
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
        if (property.type=="boolean") return property.type;
        else {
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
        }
    },
    getField: function(key, property, parentKey) {
        var html = '';
        var type = "text";
        html += '<label for="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'">'+key.replace(/([A-Z])/g, ' $1').trim()+'</label>';
        console.log("Schema: "+schema.getType(property)+" "+key);
        if (schema.getType(property)=="object") {
            if (property.properties!=null) {
                html += '<div class="subform">';
                for (var subKey in property.properties) {
                    html += schema.getField(subKey, property.properties[subKey], key);
                }
                html += '</div></div>';
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
            var items = {};
            if (property.allOf&&property.allOf.length>=2) items = property.allOf[1];
            if (property.items) items = property.items;
            if (items.items) items = items.items;

            if (items.type&&items.type=="object"&&items.properties!=null) {
                var properties = items.properties;
                html += '<div id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'_selected" class="selectedItems"></div>';
                html += '<div class="subform">';
                var values = [];
                if (key=="portRanges"||key=="allowedPortRanges") html += '<div class="grid splitadd">';
                var order = ['low','high'];
                var subItems = [];
                for (var subKey in properties) {
                    subItems.push({
                        key: key,
                        subKey: subKey,
                        value: properties[subKey]
                    });
                }
                subItems.sort(function(a, b) {
                    var aPort = a.subKey.replace(/[^A-Za-z]+/g, '').toLowerCase().replace(/\s/g, '');
                    var bPort = b.subKey.replace(/[^A-Za-z]+/g, '').toLowerCase().replace(/\s/g, '');
                    return order.indexOf(aPort) - order.indexOf(bPort);
                });
                for (var i=0; i<subItems.length; i++) {
                    values.push(subItems[i].subKey);
                    html += schema.getField(subItems[i].subKey, subItems[i].value, subItems[i].key);
                }
                html += '<div><div id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'_Button" class="button subobject" data-id="'+key+'_schema" data-to="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'_selected" data-values="'+values.toString()+'">Add</div></div>'
                if (key=="portRanges") html += '</div>';
                html += '</div></div>';  
            } else {
                if (Array.isArray(items.enum)) {
                    html += '<div id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'" data-total="'+items.enum.length+'" class="checkboxList">';
                    for (var i=0; i<items.enum.length; i++) {
                        html += '<label><div id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'_'+i+'" data-value="'+items.enum[i]+'" class="check"></div> '+items.enum[i]+'</label>';
                    }
                    html += '</div></div>';
                } else {
                    html += '<div id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'_selected" class="selectedItems"></div>';
                    html += '<input id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'" type="text" class="jsonEntry arrayEntry" placeholder="enter values seperated with a comma"/></div>';
                }
            }
        } else if (schema.getType(property)=="boolean") {
            html = '<div>'+html;
            html += '<div id="schema_'+key+'" class="toggle"><div class="switch"></div><div class="label"></div></div></div>';
            if (key=="dialInterceptedAddress") {
                html += '<div class="schema_dialInterceptedAddress_area" style="display:none">';
                html += '<label for="schema_'+key+'_allowedAddresses">Forward Addresses</label>';
                html += '<div id="schema_'+key+'_allowedAddresses_selected" class="selectedItems"></div>';
                html += '<input id="schema_'+key+'_allowedAddresses" type="text" class="jsonEntry arrayEntry" placeholder="enter values seperated with a comma"/></div>';
                html += "</div>";
            }
            if (key=="dialInterceptedPort") {
                html += '<div class="schema_dialInterceptedPort_area" style="display:none">';
                html += '<label for="schema_'+key+'_allowedPorts">Forward Port Ranges</label>';
                html += '<div id="schema_'+key+'_allowedPorts_selected" class="selectedItems"></div>';

                html += '<div class="subform"><div class="grid splitadd">';
                html += '<div><label for="">High</label>';
                html += '<input id="schema_'+key+'_allowedPorts_high" type="text" class="jsonEntry" placeholder="enter the value"/></div>';
                html += '<div><label for="">Low</label>';
                html += '<input id="schema_'+key+'_allowedPorts_low" type="text" class="jsonEntry" placeholder="enter the value"/></div>';
                html += '<lab><div id="'+key+'_Button" class="button subobject" data-id="schema_'+key+'_allowedPorts" data-to="schema_'+key+'_allowedPorts_selected" data-types="number,number" data-values="high,low">Add</div></label>'
                html += '</div></div></div>';
            }
            if (key=="dialInterceptedProtocol") {
                html += '<div class="schema_dialInterceptedProtocol_area" style="display:none">';
                html += '<label for="schema_'+key+'_allowedProtocols">Forward Protocols</label>';
                html += '<div id="schema_'+key+'_allowedProtocols_selected" class="selectedItems"></div>';
                html += '<input id="schema_'+key+'_allowedProtocols" type="text" class="jsonEntry arrayEntry" placeholder="enter values seperated with a comma"/></div>';
                html += "</div>";
            }
        } else {
            html = '<div>'+html;
            if (property.enum&&property.enum.length>0) {
                html += '<select id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'" class="jsonSelect">';
                if (key=="type") {
                    html += '<option value="">Select Type...</option>';
                }
                for (var i=0; i<property.enum.length; i++) {
                    html += '<option value="'+property.enum[i]+'">'+property.enum[i]+'</option>';
                }
                html += '</select></div>';
            } else {
                if (key=="identity") {
                    html += '<input id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'" type="text" data-suggest="identities" class="jsonEntry" placeholder="start typing to see identities"/><div id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'_Suggestions" class="suggestions"></div></div>';
                } else {
                    html += '<input id="'+((parentKey!=null)?parentKey+'_':'')+'schema_'+key+'" type="text" class="jsonEntry" placeholder="enter the value"/></div>';
                }
            }
        }
        return html;
    },
    pullItem: function(key, items) {
        for (var i=0; i<items.length; i++) {
            if (items[i].key==key) return items[i].content;
        }
        return "";
    },
    pullAll: function(exclude, items) {
        var html = "";
        for (var i=0; i<items.length; i++) {
            if (!exclude.includes(items[i].key)) html += items[i].content;
        }
        return html;
    },
    render: function() {
        var html = '';
        var items = [];
        if (schema.data&&schema.data.properties) {
            for (var key in schema.data.properties) {
                if (key!="httpChecks"&&key!="portChecks") {
                    items.push({ key: key.toLowerCase(), content: schema.getField(key, schema.data.properties[key]), type: schema.getType(key, schema.data.properties[key]) });
                }
            }
        }
        var hasAddress = false;
        var hasHostName = false;
        var hasPort = false;
        var hasProtocol = false;
        var hasForwardProtocol = false;
        var hasForwardPort = false;
        var hasForwardAddress = false;
        for (var i=0; i<items.length; i++) {
            if (items[i].key=="port") hasPort = true;
            else if (items[i].key=="address") hasAddress = true;
            else if (items[i].key=="hostname") hasHostName = true;
            else if (items[i].key=="protocol") hasProtocol = true;
            else if (items[i].key=="forwardprotocol") hasForwardProtocol = true;
            else if (items[i].key=="forwardport") hasForwardPort = true;
            else if (items[i].key=="forwardaddress") hasForwardAddress = true;
        }

        var exclude = [];
        if (hasHostName) {
            if (hasProtocol&&hasPort) {
                exclude = ["protocol","hostname","port"];
                html += '<div class="grid addressFull">'+schema.pullItem("protocol", items)+schema.pullItem("hostname", items)+schema.pullItem("port", items)+"</div>";
            } else {
                if (hasPort) {
                    exclude = ["hostname","port"];
                    html += '<div class="grid addressPort">'+schema.pullItem("hostname", items)+schema.pullItem("port", items)+"</div>";
                } else {
                    if (hasProtocol) {
                        exclude = ["hostname","protocol"];
                        html += '<div class="grid addressProtocol">'+schema.pullItem("protocol", items)+schema.pullItem("hostname", items)+"</div>";
                    }
                }
            }
        } else {
            if (hasAddress) {
                if (hasProtocol&&hasPort) {
                    exclude = ["protocol","address","port"];
                    html += '<div class="grid addressFull">'+schema.pullItem("protocol", items)+schema.pullItem("address", items)+schema.pullItem("port", items)+"</div>";
                } else {
                    if (hasPort) {
                        exclude = ["address","port"];
                        html += '<div class="grid addressPort">'+schema.pullItem("address", items)+schema.pullItem("port", items)+"</div>";
                    } else {
                        if (hasProtocol) {
                            exclude = ["address","protocol"];
                            html += '<div class="grid addressProtocol">'+schema.pullItem("protocol", items)+schema.pullItem("address", items)+"</div>";
                        }
                    }
                } 
            }
        }
        if (hasForwardProtocol) {
            exclude = exclude.concat(["forwardprotocol","allowedprotocols"]);
            html += schema.pullItem("forwardprotocol", items);
            html += '<div class="schema_forwardProtocol_area" style="display:none">'+schema.pullItem("allowedprotocols", items)+'</div ass>';
        }
        if (hasForwardAddress) {
            exclude = exclude.concat(["forwardaddress","allowedaddresses"]);
            html += schema.pullItem("forwardaddress", items);
            html += '<div class="schema_forwardAddress_area" style="display:none">'+schema.pullItem("allowedaddresses", items)+'</div>';
        }
        if (hasForwardPort) {
            exclude = exclude.concat(["forwardport","allowedportranges"]);
            html += schema.pullItem("forwardport", items);
            html += '<div class="schema_forwardPort_area" style="display:none">'+schema.pullItem("allowedportranges", items)+'</div></div>';
        }
        html += schema.pullAll(exclude, items);

        $("#"+schema.formId).html(html);
        $("input").blur((e) => {
            $(e.currentTarget).val($(e.currentTarget).val().trim());
        });
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
                if (json.dialInterceptedAddress) {
                    json.allowedAddresses = schema.getListValue('schema_dialInterceptedAddress_allowedAddresses');
                    json.forwardAddress = true;
                    delete json.address;
                    delete json.dialInterceptedAddress;
                } else {
                    delete json.dialInterceptedAddress;
                }
                if (json.dialInterceptedProtocol) {
                    json.allowedProtocols = schema.getListValue('schema_dialInterceptedProtocol_allowedProtocols');
                    json.forwardProtocol = true;
                    delete json.protocol;
                    delete json.dialInterceptedProtocol;
                } else {
                    delete json.dialInterceptedProtocol;
                }
                if (json.dialInterceptedPort) {
                    json.allowedPortRanges = schema.getListValue('schema_dialInterceptedPort_allowedPorts');
                    json.forwardPort = true;
                    delete json.port;
                    delete json.dialInterceptedPort;
                } else {
                    delete json.dialInterceptedPort;
                }
                if (json.forwardProtocol) {
                    delete json.protocol;
                } else {
                    delete json.forwardProtocol;
                    delete json.allowedProtocols;
                }
                if (json.forwardPort) {
                    delete json.port;
                } else {
                    delete json.forwardPort;
                    delete json.allowedPortRanges;
                }
                if (json.forwardAddress) {
                    delete json.address;
                } else {
                    delete json.forwardAddress;
                    delete json.allowedAddresses;
                }
                // if (json.listenOptions) delete json.listenOptions;
                if (json.httpChecks) delete json.httpChecks;
                if (json.portChecks) delete json.portChecks; 
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
        } else if (type=="boolean") {
            if (value) {
                $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).addClass("on");
                $("."+((parentKey!=null)?parentKey+'_':'')+"schema_"+key+"_area").show();
                $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key.split("forward").join("").toLowerCase()).prop("disabled", true);
                if ($("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key.split("forward").join("").toLowerCase()).prop('nodeName')=="INPUT") $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key.split("forward").join("").toLowerCase()).val("");
            } else $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).removeClass("on");
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
            var numValue = $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).val();
            if (numValue!=null && numValue.trim().length>0) {
                numValue = numValue.trim();
                if (numValue==""||isNaN(numValue)) {
                    numValue = 0;
                    if (key.toLowerCase().indexOf("timeout")>=0) numValue = 5000;
                } else {
                    numValue = Number(numValue)
                }
                json[key] = numValue;
            } else {
                delete json[key];
            }
        } else {    
            json[key] = $("#"+((parentKey!=null)?parentKey+'_':'')+"schema_"+key).val();
        }       
        return json;
    },
    getListValue: function(id) {
        var listItems = [];
        $("#"+id+"_selected").children().each(function(i, e) {
            if ($(e).hasClass("obj")) {
                var items = $(e).html().split(',');
                var obj = {};
                for (var i=0; i<items.length; i++) {
                    var info = items[i].split(':');
                    var prop = info.shift();
                    var value = info.join(':').trim();
                    if (!isNaN(value)) {
                        obj[prop] = Number(value);
                    } else {
                        obj[prop] = value;
                    }
                }
                listItems.push(obj);
            } else {
                listItems.push($(e).html());
            }
        });
        return listItems;
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
                if  (schema.data.required&&schema.data.required.includes(key)) {
                    var min = null;
                    var max = null;
                    if (property.minimum) min = Number(property.minimum);
                    if (property.maximum) max = Number(property.maximum);
                    if (isNaN(parseInt(theValue))) elem.addClass("errors");
                    else {
                        var val = Number(theValue);
                        if (min!=null&val<min) elem.addClass("errors");
                        if (max!=null&val>max) elem.addClass("errors");
                    }
                }
            } else if (type=="array") {
                if  (schema.data.required&&schema.data.required.includes(key)) {
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
                if (schema.data.required&&schema.data.required.includes(key)&&theValue.length==0) elem.addClass("errors");
            }
        }
    }
}
