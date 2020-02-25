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
var configs = {
	name: "configs",
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
	all: function() {
		this.limit = 500;
		this.get();
	},
	doSort: function(e) {
		var sortBy = $(e.currentTarget).data("by");
		if (configs.sort==sortBy) {
			if (configs.order=="ASC") configs.order = "DESC";
			else configs.order = "ASC";
		} else configs.order = "ASC";
		configs.sort = sortBy;
		$(".asc").removeClass("asc");
		$(".desc").removeClass("desc");
		$(e.currentTarget).addClass(configs.order.toLowerconfigse());
		configs.get();
	},
	get: function() {
		var params = this.getParams();
		service.call("data", params, this.getReturned);
	},
	getReturned: function(e) {
		if (e.error) growler.error("Error", e.error);
		if (e.data) {
			configs.data = e.data;
			configs.meta = e.meta;
			context.set(configs.name, configs.data);
		}
	},
	save: function(name, type, data, tags, id) {
		var params = this.getParams();
		params.save = {
			name: name,
            type: type,
            data: data,
			tags: tags
		};
		if (id!=null&&id.trim().length>0) params.id = id;
		service.call("dataSave", params, this.saveReturned);
	},
	saveReturned: function(e) {
		if (e.data) {
			if (page) page.reset();
			modal.close();
			configs.data = e.data;
			configs.meta = e.meta;
			context.set(configs.name, configs.data);
		} else growler.error("Error saving "+configs.name, e.error);
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
		if (!configs.isLast()) {
			configs.page = configs.page+1;
			configs.get();
		}
	},
	prev: function() {
		if (!configs.isFirst()) {
			configs.page = configs.page-1;
			configs.get();
		}
	}
}