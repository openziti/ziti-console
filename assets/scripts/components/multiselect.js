var SelectSource = function(id, append="", name="name") {
    this.id = id;
    this.data = [];
    this.append = append;
    this.onLoaded = null;
    this.variables = {
        id: "id",
        name: name
    };

    this.get = function(filter="") {
        var params = {
            type: this.id,
            paging: {
                page: 1,
                total: 100,
                sort: this.variables.name,
                order: "ASC",
                filter: filter,
                noSearch: false,
                searchOn: this.variables.name
            }
        };
		service.call("data", params, this.loaded.bind(this));
    }

    this.loaded = function(e) {
        this.data = e.data;
        if (this.onLoaded) this.onLoaded(this);
    }
}

var MultiSelect = function(id, max=10, freeform=false) {
    this.id = id;
    this.max = max;
    this.datasources = [];
    this.isSingle = false;
    this.freeform = freeform; 
    this.appendHash = false;
    this.returnObject = false;
    this.results = [];

    this.element = null;
    this.suggests = null;
    this.selected = null;
    this.filter = null;
    this.isLoading = false;
    this.filterId = null;



    this.init = function() {
        this.element = $("#"+this.id);
        if (this.element) {
            this.element.addClass("multiselector");
            var html = '<div class="searchSelector'+((this.isSingle)?" only":"")+'"><input id="'+this.id+'Search" autocomplete="new-password" type="text" maxlength="500" data-i18n="TypeToFilter" />';
            html += '<div id="'+this.id+'Selected" class="tagArea"></div></div>';
            html += '<div id="'+this.id+'Suggest" data-index="0" class="suggests"></div>';
            this.element.html(html);
            this.suggests = $("#"+this.id+"Suggest");
            this.selected = $("#"+this.id+"Selected");
            this.filter = $("#"+this.id+"Search");
        }
        this.events();
    }

    this.events = function() {
        $("#"+this.id+"Search").keyup(this.keyup.bind(this));
        $("#"+this.id+"Search").focus(this.focus.bind(this));  
        $(document).click((e) => {
            setTimeout(() => {
                if (!this.filter.is(":focus")) this.suggests.removeClass("open");
            }, 50);
        });    
    }

    this.tagEvents = function() {
        this.element.find(".tagButton").off("click");
        this.element.find(".tagButton").on("click", this.clicked.bind(this));
    }

    this.addSource = function(source) {
        source.onLoaded = this.onLoaded.bind(this);
        if (source.append=="#") this.appendHash = true;
        source.get();
        this.datasources.push(source);
    }

    this.onLoaded = function(source) {
        if (this.isLoading) {
            this.results = [];
            this.isLoading = false;
            this.suggests.empty();
        }
        var data = source.data;
        for (let i=0; i<data.length; i++) {
            this.results.push(data[i]);
        }
        let html = "";
        for (var i=0; i<data.length; i++) {
            var item = data[i];
            if (!this.isSelected(item, source)) html += this.getHtml(item, source, false);
        }
        this.suggests.append(html);
        if (this.results.length>0) {
            if (this.filter.is(":focus")) this.suggests.addClass("open");
        } else this.suggests.removeClass("open");
        if (html=="") this.suggests.removeClass("open");
        this.tagEvents();
    }

    this.focus = function(e) {
        if (this.results.length>0) {
            if (this.suggests.html()=="") this.suggests.removeClass("open");
            else this.suggests.addClass("open");
        }
    }

    this.blur = function(e) {
        // this.suggests.hide();
    }

    this.keyup = function(e) {
        if (e && e.keyCode==13 && this.freeform) {
            let newVal = this.filter.val().trim();
            if (newVal.length>0&&newVal.charAt(0)=="@") newVal = newVal.substr(1);
            if (this.appendHash) newVal = "#"+newVal;
            if (!this.isSelected(newVal)) {
                var html = this.ItemHtml(newVal, newVal, "", true);
                this.selected.append(html);
                this.filter.val("");
                this.keyup();
                this.tagEvents();
            }
        } else {
            if (this.filterId) {
                clearTimeout(this.filterId);
                this.filterId = null;
            } 
            this.filterId = setTimeout(() => {
                this.doFilter();
            }, 1000);
        }
    }

    this.doFilter = function() {
        var search = this.filter.val().trim();
        this.isLoading = true;
        for (var i=0; i<this.datasources.length; i++) {
            this.datasources[i].get(search);
        }
    }

    this.getHtml = function(item, source, isSelected) {
        var tagType = "";
        if (source.appennd=="#") tagType = "hash";
        else if (source.append=="@") tagType = "at";
        var id = "";
        var name = "";
        if (typeof item == "string") {
            id = item;
            name = item;
        } else {
            if (item.hasOwnProperty(source.variables.id)) id = item[source.variables.id];
            if (item.hasOwnProperty(source.variables.name)) name = item[source.variables.name];
        }
        name = source.append+name;
        return this.ItemHtml(id, name, tagType, isSelected);
    }

    this.ItemHtml = function(id, name, type, selected) {
        return '<div class="'+type+'tag tagButton'+((selected)?' icon-close':'')+'" data-id="'+id+'"><span class="label">'+name+'</span></div>';
    },

    this.isSelected = function(item, source) {
        var id = "";
        let isSelect = false;
        if (typeof item == "string") {
            id = item;
        } else {
            if (source&&item.hasOwnProperty(source.variables.id)) id = item[source.variables.id];
        }
        this.selected.children().each((i, e) => {
            if ($(e).data("id")==id) isSelect = true;
        });
        this.suggests.children().each((i, e) => {
            if ($(e).data("id")==id) isSelect = true;
        });
        return isSelect;
    }

    this.val = function(values) {
        if (values) {
            this.selected.empty();
            for (let i=0; i<values.length; i++) {
                var item = values[i];
                var id = "";
                var name = "";
                if (typeof item == "string") {
                    id = item;
                    name = item;
                } else {
                    if (item.hasOwnProperty(source.variables.id)) id = item[id];
                    if (item.hasOwnProperty(source.variables.name)) name = item[name];
                }
                this.selected.append(this.ItemHtml(id, name, "", true));
            }
            this.filter.val("");
            this.tagEvents();
        } else {
            values = [];
            this.selected.children().each((i, e) => {
                if (this.returnObject) {
                    var value = {
                        id: $(e).data("id"),
                        name: $(e).find(".label").html()
                    };
                    values.push(value);
                } else {
                    values.push($(e).data("id"));
                }
            });
            return values;
        }
    }

    this.clicked = function(e) {
        let elem = $(e.currentTarget);
        if (elem.hasClass("icon-close")) {
            elem.remove();
            this.filter.focus();
            this.doFilter();
        } else {
            let found = false;
            let newName = elem.children("span").html();
            this.selected.children().each((i, e) => {
                var currentItem = $(e);
                let name = currentItem.children("span").html();
                if (name==newName) {
                    found = true;
                    currentItem.addClass("error");
                    setTimeout(function() {
                        currentItem.removeClass("error");
                    }, 500);
                }
            });
            if (!found) {
                this.filter.val("");
                this.filter.focus();
                elem.remove();
                elem.addClass("icon-close");
                this.selected.append(elem);
                this.tagEvents();
                if (this.suggests.html()=="") this.suggests.removeClass("open");
            }
        }
    }

}