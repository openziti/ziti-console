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
var settings = {
	name: "settings",
	data: null,
	versionData: null,
	init: function() {
		settings.events();
		settings.get();
		settings.version();
	},
	events: function() {

	},
	get: function() {
		service.call("settings", { }, settings.returned);
	},
	version: function() {
		service.call("version", { }, settings.versionReturned);
	},
	versionReturned: function(e) {
		if (e.error) {
			growler.error(e.error);
		} else {
			settings.versionData = e;
			context.set("version", e);
		}
	},
	returned: function(e) {
		if (e.error) {
			growler.error(e.error);
		} else {
			settings.data = e;
			context.set(settings.name, e);
		}
	},
	delete: function(url) {
		service.call("server", {url: url}, settings.deleted, "DELETE");
	},
	deleted: function(e) {
		if (page!=null&&page.deleting!=null&&page.deleting==settings.versionData.baseUrl) window.location = "/login";
		else settings.returned(e);
	},
	addContoller: function(name, url) {
		if (name.trim().length==0||url.trim().length==0) growler.error("Invalid Form");
		else {
			service.call("controllerSave", {name:name, url: url}, settings.returned);
		}
	}
}
