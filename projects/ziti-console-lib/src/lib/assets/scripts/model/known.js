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
var known = {
    name: "known",
    data: [],
	init: function() {
        known.get();
	},
	events: function() {
        
    },
    get: function() {

    },
    save: function() {
        var toSave = {

        }
		service.call("known", toSave, this.loaded);
    },
    details: function(id) {
        for (var i=0; i<known.data.length; i++) {
            if (known.data[i].id==id) return known.data[i];
        }
        return null;
    },
    load: function(e) {

    },
    loaded: function(e) {
        known.data = e.data;
    }
}
