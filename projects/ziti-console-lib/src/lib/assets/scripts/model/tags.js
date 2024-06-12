/*
Copyright 2020 NetFoundry, Inc.
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
var tags = {
    name: "tags",
    data: [],
    tagData: [],
    map: null,
    custom: [],
	init: function() {
        tags.get();
	},
	events: function() {
        $('*[data-resource]').click(tags.load);
        $('*[data-array]').keyup(tags.addArray);
        $('*[data-array]').blur(tags.addBlurArray);
        $(".modal.box.full.open").on("click", tags.hideSelector);
    },
    form: function() {
        if ($("#TagForm").length>0) {

        }
    },
    save: function(id, label, description, defaultval, typeval, objects) {
        var found = false;
        var tag = {
            type: "custom",
            id: id,
            label: label,
            description: description,
            default: defaultval,
            value: typeval,
            objects: objects
        };
        for (var i=0; i<tags.data.length; i++) {
            if (tags.data[i].id==id) {
                tags.data[i] = tag;
                found = true;
                break;
            }
        }
        if (!found) tags.data.push(tag);
		service.call("tagSave", { tags: tags.data }, this.getReturned);
    },
    details: function(id) {
        for (var i=0; i<tags.data.length; i++) {
            if (tags.data[i].id==id) return tags.data[i];
        }
        return null;
    },
    load: function(e) {
        tags.showSelector(e);
    },
    loaded: function(e) {
        var items = e.id.split("-");
        tags.showResources(items[items.length-1]);
    },
    hideSelector: function(e) {
        $('*[data-resources]').removeClass("open");
    },
    showSelector: function(e) {
        var tagId = $(e.currentTarget).data("id");
        var resourceElements = $('#Tag_Resources_'+tagId);
        tags.showResources(tagId);
        resourceElements.addClass("open");
    },
    showResources: function(tagId) {
        var resourceElements = $('#Tag_Resources_'+tagId);
        resourceElements.html("");
        var items = context.get("resources-"+tagId);
        for (var i=0; i<items.length; i++) {
            var element = $('<div class="resource" data-id="'+app.validate(items[i])+'" style="background-image:url('+app.validate(items[i])+');"></div>');
            element.click(tags.selectResource);
            resourceElements.append(element);
        }
        var element = $('<div class="upload" data-id="'+app.validate(tagId)+'"><div id="Progress_'+app.validate(tagId)+'" class="progress"></div></div>');
        var selector = $('<input id="Tag_'+app.validate(tagId)+'_SelectFile" data-id="'+app.validate(tagId)+'" type="file"/>');
        element.click(uploader.select);
        selector.change(uploader.selected);
        resourceElements.append(element);
        resourceElements.append(selector);
    },
    selectResource: function(e) {
        var id = $(e.currentTarget).parent().data("id");
        var file = $(e.currentTarget).data("id");
        $("#Tag_"+id+"_Hider").val(file);
        $("#Tag_"+id).css("background-image","url("+file+")");
        $('#Tag_Resources_'+id).removeClass("open");
    },
    doSelect: function(id, file) {
        $("#Tag_"+id+"_Hider").val(file);
        $("#Tag_"+id).css("background-image","url("+file+")");
        $('#Tag_Resources_'+id).removeClass("open");
    },
    addBlurArray: function(e) {
        var id = $(e.currentTarget).data("tag");
        var val = $(e.currentTarget).val().split(',').join('').trim();
        if (val.length>0) {
            var element = $('<div class="tag">'+app.validate(val)+'</div>');
            element.click(tags.removeMe);
            $("#Tag_"+id+"_Selected").append(element);
            $(e.currentTarget).val("");
        }
    },
    addArray: function(e) {
        if (e.keyCode==188||e.keyCode==13) {
            var id = $(e.currentTarget).data("tag");
            var val = $(e.currentTarget).val().split(',').join('').trim();
            if (val.length>0) {
                var element = $('<div class="tag">'+app.validate(val)+'</div>');
                element.click(tags.removeMe);
                $("#Tag_"+id+"_Selected").append(element);
                $(e.currentTarget).val("");
            }
        }
    },
    getObjTag(tag, obj) {
        if (obj&&obj.tags) {
            for (var key in obj.tags) {
                if (key==tag.id) return obj.tags[key];
            }
        }
        return ((tag.default)?tag.default:"");
    },
    reset: function(obj) {
        var values = tags.tagData;
        for (var i=0; i<values.length; i++) {
            var value = tags.getObjTag(values[i], obj);
            var tag = values[i];
            if (tag.value=="avatar") $("#Tag_"+tag.id).css("background-image", "url("+value+")");
            else if (tag.value=="icon") $("#Tag_"+tag.id).css("background-image", "url("+value+")");
            else if (tag.value=="map") {
                $("#Tag_"+tag.id+"_Map").removeClass("open");
                $("#Tag_"+tag.id).val(value);
                var items = value.split(',');
                if (items.length==2) {
                    if (!isNaN(items[0])&&!isNaN(items[1])) {
                        $("#Tag_"+tag.id+"_Map").addClass("open");
                        if (!tags.map) tags.map = L.map("Tag_"+tag.id+"_Map");
                        tags.map.setView([items[0], items[1]], 13);
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {attribution: '&copy; NetFoundry Inc.'}).addTo(tags.map);
                        L.marker([items[0], items[1]]).addTo(tags.map).bindPopup(obj.name).openPopup();
                        setTimeout(function() {
                            tags.map.invalidateSize();
                        }, 1000);
                    }
                }
            } else if (tag.value=="array") {
                var items = value.split(',');
                $("#Tag_"+tag.id+"_Selected").html("");
                for (var j=0; j<items.length; j++) {
                    if (items[j].trim().length>0) {
                        var element = $('<div class="tag">'+app.validate(items[j])+'</div>');
                        element.click(tags.removeMe);
                        $("#Tag_"+tag.id+"_Selected").append(element);
                    }
                }
            } else {
                $("#Tag_"+tag.id).val(value);
            }
        }
    },
    val: function() {
        return this.getValues(tags.tagData);
    },
    getValues: function(values) {
        var toReturn = {};
        for (var i=0; i<values.length; i++) {
            var tag = values[i];
            var value = "";
            if (tag.value=="string") {
                value = $("#Tag_"+tag.id).val();
            } else if (tag.value=="boolean") {
                value = $("#Tag_"+tag.id).is(":checked");
            } else if (tag.value=="avatar") {
                value = $("#Tag_"+tag.id+"_Hider").val();
            } else if (tag.value=="icon") {
                value = $("#Tag_"+tag.id+"_Hider").val();
            } else if (tag.value=="array") {
                var value = "";
                $("#Tag_"+tag.id+"_Selected").children().each(function(i, item) {
                    value += ((i>0)?",":"")+$(item).html();
                });
            } else {
                value = $("#Tag_"+tag.id).val();
            }
            if (value.trim().length>0) toReturn[tag.id] = value;
        }
        for (var i=0; i<tags.custom.length; i++) {
            var id = $("#Tag_"+tags.custom[i]).val();
            var value = $("#TagVal_"+tags.custom[i]).val();
            toReturn[id] = value;
        }
        return toReturn;
    },
    removeMe: function(e) {
        $(e.currentTarget).remove();
    },
    get: function() {
        service.call("tags", {}, tags.getReturned);
    },
    getReturned: function(e) {
        tags.data = e;
        context.set(tags.name, tags.data);
        if ($("*[data-tagarea]").length==1) tags.bind();
    },
    bind: function() {
        var html = "";
        var tagArea = $("*[data-tagarea]");
        var matcher = tagArea.data("tagarea");
        tagArea.html("");
        var customList = [];
        for (var i=0; i<tags.data.length; i++) {
            if (tags.data[i].objects=="all"||tags.data[i].objects.indexOf(matcher)>=0) {
                this.tagData[this.tagData.length] = tags.data[i];
                html += tags.html(tags.data[i]);
            }
        }
        tagArea.html(html);
        tags.events();
    },
    extended: function(element, details) {
        var html = '';
        html += '<div class="grid tags">';
        html += '    <label>Name</label><label>Value</label>';
        html += '</div>';
        html += '<div id="NewTags">';
        if (details) {
            for (key in details.tags) {
                if (!tags.isDefined(key)) {
                    tags.custom.push(key);
                    var keyVal = app.validate(key);
                    html += '<div id="Area_'+keyVal+'" class="grid tags">';
                    html += '<input id="Tag_'+keyVal+'" placeholder="enter the tag key" type="text"  maxlength="100" value="'+keyVal+'"/>';
                    html += '<input id="TagVal_'+keyVal+'" placeholder="enter the value" type="text"  maxlength="100" value="'+app.validate(details.tags[key])+'"/><div data-id="'+keyVal+'" class="removeIcon icon-clear"></div>';
                    html += '</div>';
                }
            }
        }
        html += '</div>';
        html += '<div class="grid tags">';
        html += '    <input id="NewKey" type="text" data-enter="AddCustomButton" maxlength="100" placeholder="enter the tag key" /><input id="NewValue" data-enter="AddCustomButton" placeholder="enter the value" type="text" maxlength="100"/><div id="AddCustomButton" class="addIcon icon-add"></div>';
        html += '</div>';
        element.html(html);
		$("input").blur(app.trim);
        $(".removeIcon").off("click");
        $(".removeIcon").on("click", tags.removeTag);
        $(".addIcon").off("click");
        $(".addIcon").on("click", tags.defineTag);
        $("#NewKey").on("keyup", app.enter);
        $("#NewValue").on("keyup", app.enter);
    },
    defineTag: function(e) {
        $("#NewKey").removeClass("errors");
        var newKey = $("#NewKey").val().trim().split(' ').join('');
        var newVal = $("#NewValue").val().trim();
        var found = false;
        for (var i=0; i<tags.data.length; i++) {
            if (tags.data[i].id==newKey) {
                found = true;
                break;
            }
        }
        if (found) {
            $("#NewKey").addClass("errors");
            growler.error("Key already exists.")
        }
        if (newKey&&newKey.length>0&&newVal&&newVal.length>0&&!found) {
            var html = '';
            var validKey = app.validate(newKey);
            var validVal = app.validate(newVal);
            html += '<div id="Area_'+validKey+'" class="grid tags">';
            html += '<input id="Tag_'+validKey+'" type="text" maxlength="100" placeholder="enter the tag key" value="'+validKey+'" />';
            html += '<input id="TagVal_'+validKey+'" placeholder="enter the value" type="text" maxlength="100" value="'+validVal+'"/><div data-id="'+validKey+'" class="removeIcon icon-clear"></div>';
            html += '</div>';
            tags.custom.push(newKey);
            $("#NewKey").val("");
            $("#NewValue").val("");
            $("#NewTags").append(html);
            $(".removeIcon").off("click");
            $(".removeIcon").on("click", tags.removeTag);
        } 
    },
    removeTag: function(e) {
        var key = $(e.currentTarget).data("id");
        $("#Area_"+key).remove();
    },
    isDefined: function(key) {
        for (var i=0; i<tags.data.length; i++) {
            if (tags.data[i].id==key) return true;
        }
        return false;
    },
    html: function(tag) {
        var html = '<label for="Tag_'+tag.id+'">'+tag.label+'</label>';
        if (tag.value=="string") {
            html += '<input id="Tag_'+tag.id+'" type="text" data-tag="'+tag.id+'" maxlength="500" placeholder="'+tag.description+'" />';
        } else if (tag.value=="boolean") {
            html += '<input id="Tag_'+tag.id+'" type="checkbox" data-tag="'+tag.id+'" />';
        } else if (tag.value=="map") {
            html += '<div id="Tag_'+tag.id+'_Map" data-map="'+tag.id+'" class="map"></div>';
            html += '<input id="Tag_'+tag.id+'" type="text" data-tag="'+tag.id+'" maxlength="500" placeholder="'+tag.description+'" />';
        } else if (tag.value=="avatar") {
            html += '<div class="formRow">';
            html += '<div id="Tag_'+tag.id+'" data-id="'+tag.id+'" data-resource="avatar" class="resource icon profile" title="'+tag.description+'" style="background-image: url('+tag.default+')"></div><div id="Tag_Resources_'+tag.id+'" class="resources" data-id="'+tag.id+'" data-resources="avatar"></div>';
            html += '<input id="Tag_'+tag.id+'_Hider" data-tag="'+tag.id+'" type="hidden"/>';
            resources.get(tag.id);
            context.addListener("resources-"+tag.id, tags.loaded);
        } else if (tag.value=="icon") {
            html += '<div class="formRow">';
            html += '<div id="Tag_'+tag.id+'" data-id="'+tag.id+'" data-resource="icon" class="resource icon" title="'+tag.description+'" style="background-image: url('+tag.default+')"></div><div id="Tag_Resources_'+tag.id+'" class="resources" data-id="'+tag.id+'" data-resources="icon"></div>';
            html += '<input id="Tag_'+tag.id+'_Hider" data-tag="'+tag.id+'" type="hidden"/>';
            resources.get(tag.id);
            context.addListener("resources-"+tag.id, tags.loaded);
        } else if (tag.value=="array") {
            html += '<div id="Tag_'+tag.id+'_Selected"></div>';
            html += '<input id="Tag_'+tag.id+'" type="text" data-tag="'+tag.id+'" data-array="'+tag.id+'" maxlength="500" placeholder="'+tag.description+'" />';
        }
        return html;
    }
}
