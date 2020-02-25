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
var gateways = {
	name: "edge-routers",
	page: 1,
	limit: 25,
	data: [],
	meta: {},
	sort: "name",
	order: "ASC",
	filter: "",
	init: function() {
		this.events();
		this.get();
	},
	events: function() {
		$(".sort").click(this.doSort);
	},
	getParams: function() {
		return {
			type: this.name,
			paging: {
				page: this.page,
				total: this.limit,
				sort: this.sort,
				order: this.order,
				filter: this.filter
			}
		};
	},
	doSort: function(e) {
		var sortBy = $(e.currentTarget).data("by");
		if (gateways.sort==sortBy) {
			if (gateways.order=="ASC") gateways.order = "DESC";
			else gateways.order = "ASC";
		} else gateways.order = "ASC";
		gateways.sort = sortBy;
		$(".asc").removeClass("asc");
		$(".desc").removeClass("desc");
		$(e.currentTarget).addClass(gateways.order.toLowerCase());
		gateways.get();
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
			gateways.data = e.data;
			gateways.meta = e.meta;
			context.set(gateways.name, gateways.data);
		}
	},
	save: function(name, roles, tags, id) {
		var params = this.getParams();
		params.save = {
			name: name,
			roleAttributes: roles,
			tags: tags
		};
		if (id.trim().length>0) {
			params.id = id;
		}
		service.call("dataSave", params, this.saveReturned);
	},
	details: function(id) {
		for (var i=0; i<this.data.length; i++) {
			if (this.data[i].id==id) return this.data[i];
		}
		return null;
	},
	delete: function(ids) {
		var params = this.getParams();
		params.ids = ids;
		service.call("delete", params, this.getReturned);
	},
	saveReturned: function(e) {
		if (e.data) {
			if (page) page.reset();
			modal.close();
			gateways.data = e.data;
			gateways.meta = e.meta;
			context.set(gateways.name, gateways.data);
		} else growler.error("Error saving "+gateways.name, e.error);
	},
	start: function() {
		if (this.page==1) return 1;
		else return ((this.page-1)*this.limit)+1;
	},
	end: function() {
		if (this.page==1) return this.data.length;
		else return (this.start()-1)+this.data.length;
	},
	total: function() {
		return this.meta.pagination.totalCount;
	},
	isFirst: function() {
		return this.meta.pagination.offset==0;
	},
	isLast: function() {
		return (this.meta.pagination.offset+this.meta.pagination.limit)>=this.meta.pagination.totalCount;
	},
	next: function() {
		if (!gateways.isLast()) {
			gateways.page = gateways.page+1;
			gateways.get();
		}
	},
	prev: function() {
		if (!gateways.isFirst()) {
			gateways.page = gateways.page-1;
			gateways.get();
		}
	}
}