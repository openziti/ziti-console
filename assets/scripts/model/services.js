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
var services = {
	name: "services",
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
				filter: this.filter,
			}
		};
	},
	doSort: function(e) {
		var sortBy = $(e.currentTarget).data("by");
		if (services.sort==sortBy) {
			if (services.order=="ASC") services.order = "DESC";
			else services.order = "ASC";
		} else services.order = "ASC";
		services.sort = sortBy;
		$(".asc").removeClass("asc");
		$(".desc").removeClass("desc");
		$(e.currentTarget).addClass(services.order.toLowerCase());
		services.get();
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
			services.data = e.data;
			services.meta = e.meta;
			context.set(services.name, services.data);
		}
	},
	getSubs: function(id, type, url) {
		var params = {
			id: id,
			type: type,
			url: url
		};
		service.call("dataSubs", params, this.subsReturned);
	},
	subsReturned: function(e) {
		if (e.error) growler.error(e.error);
		else context.set(e.type+"sub", e.data);
	},
	setSub: function(id, type, items) {
		for (var i=0; i<services.data.length; i++) {
			if (services.data[i].id===id) {
				services.data[i][type] = items;
				break;
			}
		}
	},
	save: function(name, router, endpointAddress, roles, tags, id, removal) {
		var params = this.getParams();
		params.save = {
			name: name,
			legacyPassthrough: true,
			egressRouter: router,
			endpointAddress: endpointAddress,
			tags: tags,
			roleAttributes: roles
		};
		if (id!=null&&id.trim().length>0) {
			params.additional = {};
			params.id = id;
			params.removal = removal;
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
			services.data = e.data;
			services.meta = e.meta;
			context.set(services.name, services.data);
		} else growler.error("Error saving "+services.name, e.error);
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
		if (!services.isLast()) {
			services.page = services.page+1;
			services.get();
		}
	},
	prev: function() {
		if (!services.isFirst()) {
			services.page = services.page-1;
			services.get();
		}
	}
}