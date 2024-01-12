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
var routers = {
	name: "routers",
	data: [],
	init: function() {
		this.events();
		this.get();
	},
	events: function() {
	},
	getParams: function() {
		return {
			type: this.name,
			url: context.get("fabricUrl")
		};
	},
	all: function() {
		this.limit = 500;
		this.get();
	},
	get: function() {
		if (context.get("fabricUrl").trim().length>0) {
			var params = this.getParams();
			service.call("dataFabric", params, this.getReturned);
		}
	},
	getReturned: function(e) {
		if (e.error) growler.error("Error", e.error);
		if (e.data) {
			routers.data = e.data;
			context.set(routers.name, routers.data);
		}
	},
	details: function(id) {
		for (var i=0; i<this.data.length; i++) {
			if (this.data[i].id==id) return this.data[i];
		}
		return null;
	},
}
