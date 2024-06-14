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

var Data = function(name, context) {
	this.name = name;
	this.max = 1000;
	this.isLoaded = false;
	this.autoBind = false;
	this.data = [];
	this.meta = {};
	this.context = ((context)?context:this.name);
	this.searchField = null;
	this.clearField = null;
	this.closeModals = true;
	this.searchId = null;
	this.saveButton = null;
	this.deleting = [];
	this.editId = "";
	this.isFirstLoad = true;
	this.isSortable = false;
	this.params = {};
	this.lastSelected = null;
	this.paging = {
		page: 1,
		total: 50,
		sort: "name",
		order: "ASC",
		filter: "",
		noSearch: false
	};
	this.systemConfigTypes = ['host.v1', 'host.v2', 'intercept.v1', 'ziti-tunneler-client.v1', 'ziti-tunneler-server.v1'];
	this.init = function(load, autoBind, all) {
		if (autoBind) {
			this.autoBind = autoBind;
			this.isSortable = true;
		}
		this.events();
		if (all) this.paging.total = this.max;
		if (load) this.get();
	};
    this.events = function() {
		if (this.isSortable) {
			$(".sort").click($.proxy(function (e) {
				this.paging.sort = $(e.currentTarget).data("by");
				if ($(e.currentTarget).hasClass("asc")) {
					$(e.currentTarget).removeClass("asc");
					$(e.currentTarget).addClass("desc");
					this.paging.order = "desc";
				} else if ($(e.currentTarget).hasClass("desc")) {
					$(e.currentTarget).removeClass("desc");
					$(e.currentTarget).addClass("asc");
					this.paging.order = "asc";
				} else {
					$(".asc").removeClass("asc");
					$(".desc").removeClass("desc");
					$(e.currentTarget).addClass("asc");
					this.paging.order = "asc";
				}
				this.get();
			}, this));
		}
		if (this.autoBind) {
			this.searchField = $("*[data-defined='search']");
			if (this.searchField.length==1) this.searchField.keyup(this.search.bind(this));
			this.clearField = $("*[data-defined='clear']");	
			if (this.clearField.length==1) this.clearField.click(this.clear.bind(this));
			$(".action").click(this.action.bind(this));
			this.saveButton = $("*[data-defined='save']");
			if (page&&page.save) this.saveButton.click(page.save);
			$(".searchButton").click(this.get.bind(this));
		}
		$(document).click((e) => {
			if (!$(e.target).hasClass('dots') && $(e.target).parents('.dots').length === 0) {
				$(".gridMenu").removeClass('open');
			}
		});
	};
	this.isEditing = function() {
		return (this.editId!='');
	},
	this.action = function(e) {
		this.formReset();
		if (page&&page.formReset) page.formReset();
		var action = $(e.currentTarget).data("action");
		if (action=="add") {
			$(".adding").show();
			$(".editing").hide();
			modal.show("AddModal");
		} else if (action=="remove") {
			this.deleting = [];
			$(".selector.selected").each(function(index, e) {
				var id = $(e).data("id");
				if (id&&id.trim().length>0&&id!="{{id}}") this.deleting[this.deleting.length] = id;
			}.bind(this));
			if (this.deleting.length>0) {
				this.delete(this.deleting);
			}
		}		
	};
	this.delete = function(ids) {
		this.deleting = ids;
		var singular = "Item";
		var plural = "Items";
		if (page&&page.binding&&page.binding.pageTitle) plural = page.binding.pageTitle;
		if (page&&page.binding&&page.binding.singular) singular = page.binding.singular;
		if (this.deleting.length>0) {
			modal.confirm("you want to delete these "+this.deleting.length+" "+((this.deleting.length>1)?plural:singular), this.doDelete.bind(this));
		}
	};
	this.search = function(e) {
		if (this.searchId) clearTimeout(this.searchId);
		this.paging.filter = this.searchField.val();
		if (this.clearField) {
			if (this.searchField.val().trim().length>0) this.clearField.addClass("showing");
			else this.clearField.removeClass("showing");
		}
		if (e.keyCode==13) {
			this.get();
		} else {
			this.searchId = setTimeout(this.get.bind(this), 3000);
		}
	};
	this.clear = function(e) {
		this.searchField.val("");
		this.paging.filter = "";
		this.get();
		this.clearField.removeClass("showing");
	};
	this.get = function() { 
		if (this.searchId) clearTimeout(this.searchId);
		service.call("data", this.getParams(), this.loaded.bind(this));
	};
	this.all = function() {
		this.paging.total = this.max;
		this.get();
	};
	this.loaded = function(e) {
		this.isLoaded = true;
		if (e.error) growler.error("Error", e.error);
		if (e.data) {
			if (this.closeModals) {
				modal.close();
				this.formReset();
			}
			this.data = e.data;
			this.meta = e.meta;
			if (this.autoBind) {
				this.bind();
				if (this.isFirstLoad) {
					if (window.location.href.endsWith("#a")) setTimeout(function() { $(".action").click(); }, 500);
				}
			}
			window.context.set(this.context, this.data);
			if (page.loaded) page.loaded();
			this.isFirstLoad = false;
		}
	};
	this.bind = function(data) {
		if (data) this.data = data;
		$(".selector.selected").removeClass("selected");
		app.setAction(); // May Remove this not sure why its here
		var empty = $("*[data-defined='empty']");
		var table = $("*[data-defined='table']");
		var rows = $("*[data-defined='rows']");
		var template = $("*[data-defined='template']");

		if (rows&&template&&rows.length>0&&template.length>0) {
			rows.html("");
			if (this.data.length>0) {
				for (var i=0; i<this.data.length; i++) {
					var row = template.clone();
					row.removeClass("template");
					row.attr("id", "Row"+i);
					var obj = this.data[i];
					let readOnly = false;
					if (this.context === 'config-types') {
						readOnly = this.systemConfigTypes.includes(obj.name);
					}
					for (var prop in obj) {
						if (page.row) row.html(page.row(row.html(), obj));
						var propVal = obj[prop];
						propVal = app.validate(propVal);
						row.html(row.html().split("{{"+prop+"}}").join(propVal));
						row.html(row.html().split("{{selector."+prop+"}}").join(app.validate(SelectorStyles.format(obj[prop+"Display"]))));
						row.html(row.html().split("{{roles."+prop+"}}").join(app.validate(SelectorStyles.format(propVal))));
						if (row.html().indexOf("{{moment."+prop+"}}")>=0) row.html(row.html().split("{{moment."+prop+"}}").join(moment(obj[prop]).format("M/D/YYYY hh:mm A")));
					}
					row.attr("data-defined", "");
					rows.append(row);
					if (readOnly) {
						row.addClass('readOnly');
						row.find('.selector').addClass('disabled');
						row.find('.dots').addClass('readOnly');
					}
				}

                if (page&&page.gridAction) $(".gridAction").click(page.gridAction);
                $(".navigate").off("click");
                $(".navigate").addClass("disabled");
                if (!this.isFirst()) {
                    $(".navigate.prev").removeClass("disabled");
                    $(".navigate.prev").on("click", this.prev.bind(this));
                }
                if (!this.isLast()) {
                    $(".navigate.next").removeClass("disabled");
                    $(".navigate.next").on("click", this.next.bind(this));
                } 				
				$(".selector").off("click");
				$(".selector").click(this.select.bind(this));
				$(".dots").click(this.dots);
				$("#Start").html(this.start());
				$("#End").html(this.end());
				$("#Total").html(this.total());

				if (window.location.href.endsWith("#a")&&page.add) page.add();

				$(".col").each(function(i, obj) {
					var value = $(obj).text().split('\n').join(' ').split('  ').join(' ').split('"').join('').replace(/<[^>]*>?/gm, '');
					if (!$(obj).hasClass("notitle")&&!$(obj).hasClass("allowOver")&&!$(obj).parent().hasClass("template")) $(obj).attr("title", value);
				});

				if (empty) empty.hide();
				if (table) table.show();
			} else {
				if (empty) empty.show();
				if (table) table.hide();
			}
		} else {
			if (empty) empty.show();
			if (table) table.hide();
		}
	};
	this.doBind = function(data) {
		if (data) this.data = data;
		$(".selector.selected").removeClass("selected");

		var empty = $("*[data-defined='empty']");
		var table = $("*[data-defined='table']");
		var rows = $("*[data-defined='rows']");
		var template = $("*[data-defined='template']");

		if (rows&&template&&rows.length>0&&template.length>0) {
			rows.html("");
			if (this.data.length>0) {
				for (var i=0; i<this.data.length; i++) {
					var row = template.clone();
					row.removeClass("template");
					row.attr("id", "Row"+i);
					var obj = this.data[i];
					for (var prop in obj) {
						if (page.row) row.html(page.row(row.html(), obj));
						row.html(row.html().split("{{"+prop+"}}").join(app.validate(obj[prop])));
						row.html(row.html().split("{{selector."+prop+"}}").join(app.validate(SelectorStyles.format(obj[prop+"Display"]))));
						row.html(row.html().split("{{selector."+prop+"}}").join(app.validate(SelectorStyles.format(obj[prop]))));
						row.html(row.html().split("{{moment."+prop+"}}").join(moment(obj[prop]).format("M/D/YYYY hh:mm A")));
					}
					row.attr("data-defined", "");
					rows.append(row);
				}

                if (page&&page.gridAction) $(".gridAction").click(page.gridAction);
                $(".navigate").off("click");
                $(".navigate").addClass("disabled");		
				$(".selector").off("click");
				$(".selector").click(this.select.bind(this));
				$(".dots").click(this.dots);
				$("#Start").html(this.start());
				$("#End").html(this.end());
				$("#Total").html(this.total());

				if (window.location.href.endsWith("#a")&&page.add) page.add();

				$(".col").each(function(i, obj) {
					var value = $(obj).text().split('\n').join(' ').split('  ').join(' ').split('"').join('').replace(/<[^>]*>?/gm, '');
					if (!$(obj).hasClass("notitle")&&!$(obj).hasClass("allowOver")&&!$(obj).parent().hasClass("template")) $(obj).attr("title", value);
				});

				if (empty) empty.hide();
				if (table) table.show();
			} else {
				if (empty) empty.show();
				if (table) table.hide();
			}
		} else {
			if (empty) empty.show();
			if (table) table.hide();
		}
	};
	this.formReset = function() {
		this.editId = "";
		$("#AddModal").find("input").val("");
		$("#AddModal").find("textarea").val("");
		$("#AddModal").find("select").each(function(i,e) {
			var defaultVal = $(e).data("default");
			if (defaultVal) $(e).val(defaultVal);
			else $(e).val("");
		});
		// $("#AddModal").find(".suggests").html("");
		$("#AddModal").find(".tagArea").html("");
		$("#TagExtended").html("");
		$(".toggle").removeClass("on");
		if (tags) {
			tags.reset();
			tags.extended($("#TagExtended"));
		}
		if (page&&page.editId) page.editId = "";
		if (page&&page.reset) page.reset();
	};
	this.reset = function() {
		$(".action").addClass("icon-add");
		$(".action").removeClass("icon-minus");
		$(".action").removeClass("remove");
		$(".action").data("action", "add");
	};
	this.select = function(e) {
		var selector = $(e.currentTarget);
		if (selector.hasClass("disabled")) {
			return;
		}
		if (selector.hasClass("selected")) {
			selector.removeClass("selected");
			if (selector.hasClass("all")) $(".selector").removeClass("selected");
			else {
				
				if (this.lastSelected) {
					if (e.ctrlKey) {
						var isIn = false;
						var startId = this.lastSelected.data("id");
						var endId = selector.data("id");
						$(".selector").each((i,e) => {
							var elem = $(e);
							if (elem.data("id")==startId || elem.data("id")==endId) {
								isIn = !isIn;
							} 
							if (isIn) {
								if (elem.hasClass("selected")) elem.removeClass("selected");
							}
						});
					}
				}

				if ($(".rows").find(".selector.selected").length==0) {
					if ($(".head").find(".selector.selected").hasClass("all")) $(".head").find(".selector.selected").removeClass("selected");
				}
			}
		} else {
			selector.addClass("selected");
			if (selector.hasClass("all")) {
				$(".selector").each((index, item) => {
					if (!$(item).hasClass('disabled')) {
						$(item).addClass("selected");
					}
				});
			}
			else {
				if (this.lastSelected) {
					if (e.ctrlKey) {
						var isIn = false;
						var startId = this.lastSelected.data("id");
						var endId = selector.data("id");
						$(".selector").each((i,e) => {
							var elem = $(e);
							if (elem.data("id")==startId || elem.data("id")==endId) {
								isIn = !isIn;
							} 
							if (isIn) {
								if (!elem.hasClass("selected")) elem.addClass("selected");
							}
						});
					}
				}
			}
			if ($(".rows").find(".selector.selected").length==this.data.length) $(".head").find(".selector").addClass("selected");
		}
		this.lastSelected = selector;
		app.setAction();		
	};
	this.dots = function(e) {
		var menu = $(e.currentTarget).children(".gridMenu");
		$(".gridMenu.open").css('margin-top', undefined);
		if (menu.hasClass("open")) {
			menu.removeClass("open");
		}
		else {
			$(".gridMenu.open").removeClass("open");
			menu.addClass("open");
			if ($(e.currentTarget).hasClass("readOnly")) {
				menu.find('[data-action="delete"]').hide();
			}
			setTimeout(() => {
				const height = menu[0]?.offsetHeight || 120;
				const windowOffset = window.innerHeight - e.clientY;
				const menuOffset = windowOffset <= height ? (height - windowOffset) + 7 : 0;
				menu.css('margin-top', -menuOffset + 'px');
			}, 10);
		}
	};
	this.getParams = function() {
		return { type: this.name, paging: this.paging };
	};
	this.saveChain = function(obj) {
		var params = this.getParams();
		params.save = obj;
		params.chained = true;
		service.call("dataSave", params, this.saved.bind(this));
	},
	this.saved = function(e) {
		if (page.saved) page.saved(e);
	},
	this.saveInline = function(obj, url) {
		var params = this.getParams();
		params.save = obj;
		params.url = url;
		params.type = this.name;
		service.call("dataSave", params, this.subLoaded.bind(this));
	},
	this.save = function(obj) {
		if (localStorage.getItem("filterAfterSave")=="on"&&this.closeModals) {
			if (this.searchField) this.searchField.val($("#Name").val()); 
			this.paging.filter = this.searchField.val();
		}
		var params = this.getParams();
		params.save = obj;
		if (this.editId.trim().length>0) params.id = this.editId;
		service.call("dataSave", params, this.loaded.bind(this));
	};
	this.getSubs = function(detail, type, callAfter) {
		if (!callAfter) callAfter = this.subLoaded.bind(this);
		service.call("subdata", { url: detail._links[type].href, name: this.name, type: type }, callAfter);
	};
	this.subLoaded = function(e) {
		if (e.error) growler.error("Error", e.error);
		if (e.data) {
			window.context.set(e.type, e.data);
		}
	};
	this.getDetails = function(detail, type) {		
		service.call("subdata", { url: detail._links.self.href, name: this.name, type: type }, this.detailsLoaded.bind(this));
	};
	this.detailsLoaded = function(e) {
		if (e.error) growler.error("Error", e.error);
		if (e.data) {
			window.context.set(e.type, e.data);
			var details = e.data;

			for (var prop in details) {
				var element = $("*[data-bind='data."+prop+"']");
				if (element.length>0) {
					$(element).each(function(index, elem) {
						var type = $(elem).prop("tagName");
						if (details[prop]) {
							if (type=="INPUT"||type=="SELECT") $(elem).val(details[prop]);
							else if (type=="TEXTAREA") $(elem).val(details[prop].split('\\n').join('\n'));
							else if (type=="DIV"||type=="SPAN") $(elem).html(details[prop]);
						}
					});
				}
			}

			modal.show("DetailModal");
		}
	};
	this.applyTemplate = function(data, template, none) {
		let toReturn = "";
		if (data.length==0) toReturn = none;
		else {
			for (let i=0; i<data.length; i++) {
				var item = data[i];
				let line = template;
				for (prop in item) {
					line = line.split("{{"+prop+"}}").join(item[prop]);
				}
				toReturn += ((i>0)?"<br/>":"")+line;
			}
		}
		return toReturn;
	},
	this.details = function(id) {
		if (this.autoBind) this.formReset();
		var details;
		for (var i=0; i<this.data.length; i++) {
			if (this.data[i].id==id) details = this.data[i];
		}
		if (this.autoBind&&details) {
			this.editId = id;
			$(".adding").hide();
			$(".editing").show();
			tags.reset(details);
			tags.extended($("#TagExtended"), details);
			for (var prop in details) {
				var element = $("*[data-bind='data."+prop+"']");
				if (element.length>0) {
					$(element).each(function(index, elem) {
						var type = $(elem).prop("tagName");
						if (details[prop]) {
							if (type=="INPUT"||type=="SELECT") $(elem).val(details[prop]);
							else if (type=="TEXTAREA") $(elem).val(details[prop].split('\\n').join('\n'));
							else if (type=="DIV"||type=="SPAN") $(elem).html(details[prop]);
						}
					});
				}
			}
		}
		return details;
	};
	this.inlineDelete = function(url) {
		var params = this.getParams();
		params.ids = this.deleting;
		params.url = url;
		service.call("delete", params, this.loaded.bind(this));
	},
	this.doDelete = function() {
		var params = this.getParams();
		params.ids = this.deleting;
		service.call("delete", params, this.loaded.bind(this));
	};
	this.start = function() {
		if (this.paging.page==1) return 1;
		else return ((this.paging.page-1)*this.paging.total)+1;
	};
	this.end = function() {
		if (this.paging.page==1) return this.data.length;
		else return (this.start()-1)+this.data.length;
	};
	this.total = function() {
		if (this.meta && this.meta.pagination) {
			return this.meta.pagination.totalCount;
		} else return this.data.length;
	};
	this.isFirst = function() {
		return this.meta.pagination.offset==0;
	};
	this.isLast = function() {
		return (this.meta.pagination.offset+this.meta.pagination.limit)>=this.meta.pagination.totalCount;
	};
	this.next = function() {
		if (!this.isLast()) {
			this.paging.page = this.paging.page+1;
			this.get();
		}
	};
	this.prev = function() {
		if (!this.isFirst()) {
			this.paging.page = this.paging.page-1;
			this.get();
		}
	};
}
