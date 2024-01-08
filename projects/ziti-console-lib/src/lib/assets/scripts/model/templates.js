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
var templates = {
    name: "templates",
    data: [],
	init: function() {
        templates.get();
	},
	events: function() {
        
    },
    get: function() {
        service.call("templates", {}, templates.loaded);
    },
    save: function(obj) {
		service.call("template", {template: obj}, this.loaded);
    },
    details: function(id) {
        for (var i=0; i<templates.data.length; i++) {
            if (templates.data[i].id==id) return templates.data[i];
        }
        return null;
    },
    load: function(e) {

    },
    loaded: function(e) {
        modal.close();
        templates.data = e;
        context.set(templates.name, templates.data);
    }
}
