/*
Copyright 2020 Netfoundry, Inc.
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
var data = {
	get: function(name, type, url, id) {
		service.call("subdata", { name: name, type: type, url: url, id: id }, this.getReturned);
	},
	getReturned: function(e) {
		if (e.error) growler.error("Error", e.error);
		if (e.data) {
            if (e.parent==appwans.name) {
                appwans.setSub(e.id, e.type, e.data);
            }
		}
	}
}