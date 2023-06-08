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
var fabrics = {
	name: "fabrics",
	page: 1,
	limit: 5000,
	sort: "name",
	order: "ASC",
	data: [],
	meta: {},
	filter: "",
	init: function() {
		fabrics.events();
	},
	getParams: function() {
		return {
			type: this.name,
			paging: {
				page: this.page,
				total: this.limit,
				sort: this.sort,
				order: this.order,
				filter: this.filter,
			}
		};
	},
	events: function() {

	},
	all: function() {
		this.limit = 500;
		this.get();
	},
	get: function() {
		var params = this.getParams();
		service.call("data", params, this.getReturned);
	},
	getReturned: function(e) {
		if (e.error) growler.error("Error", e.error);
		if (e.data) {
			fabrics.data = e.data;
			context.set(fabrics.name, fabrics.data);
		}
	}
}