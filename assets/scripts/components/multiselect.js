var SelectSource = function(id, append="") {
    this.id = id;
    this.data = [];
    this.append = append;
    this.onLoaded = null;
    this.variables = {
        id: "id",
        name: "name"
    };

    this.get = function(filter="") {
        var params = {
            type: this.id,
            paging: {
                page: 1,
                total: 100,
                sort: "name",
                order: "ASC",
                filter: filter,
                noSearch: false
            }
        };
		service.call("data", params, this.loaded.bind(this));
    }

    this.loaded = function(e) {
        this.data = e.data;
        if (this.onLoaded) this.onLoaded(this);
    }
}

var MultiSelect = function(id, label, max=10) {
    this.id = id;
    this.label = label;
    this.max = max;
    this.datasources = [];
    this.lastSearch = "";
    this.isSingle = false;
    this.freeform = false; // Not implemented yet allow free form text values
    this.appendHash = false; // Not implemented add # to freeform entries

    this.element = null;
    this.suggests = null;
    this.selected = null;
    this.filter = null;



    this.init = function() {
        this.element = $("@"+this.id);
        if (element) {
            var html = '<div class="searchSelector'+((this.isSingle)?" only":"")+'"><input id="'+this.id+'Search" type="text" maxlength="500" placeholder="'+this.label+'" />';
            html += '<div id="'+this.id+'Suggest" data-index="0" class="suggests"></div>';
            html += '<div id="'+this.id+'Selected" class="tagArea"></div></div>';
            element.html(html);
            this.suggests = $("#"+this.id+"Suggest");
            this.selected = $("#"+this.id+"Selected");
        }
        this.events();
    }

    this.events = function() {
        $("#"+this.id+"Search").keyup(this.keyup.bind(this));
        $("#"+this.id+"Search").focus(this.focus.bind(this));       
    }

    this.addSource = function(source) {
        source.onLoaded = this.onLoeded;
        source.get();
        this.datasources.push(source);
    }

    this.onLoaded = function(source) {
        var data = source.data;
        let html = "";
        for (var i=0; i<data.length; i++) {
            var item = data[i];
            var tagType = "";
            html += this.getHtml(item, source, false);
        }
        this.suggests.append(html);
        $(".tagButton").off("click");
        $(".tagButton").on("click", this.clicked);
    }

    this.focused = function(e) {
        this.keyup(e);
    }

    this.blurred = function(e) {
        this.suggests.hide();
    }

    this.keyup = function(e) {
        var search = this.filter.val().trim();
        this.suggests.empty();

        if (this.lastSearch!=search) {
            this.lastSearch = search;
            for (var i=0; i<this.datasources.length; i++) {
                this.datasources.get(search);
            }
        }
        this.suggests.show();
    }

    this.getHtml = function(item, source, isSelected) {
        var tagType = "";
        if (source.appennd=="#") tagType = "hash";
        else if (source.append=="@") tagType = "att";
        return '<div class="'+tagType+'tag tagButton" data-id="'+item[source.variables.id]+((isSelected)?' icon-close':'')+'"><span class="label">'+item[source.variables.name]+'</span></div>';
    }

    this.val(values) {
        if (values) {
            for (let i=0; i<values.length; i++) {

            }
        } else {

        }
    }

    this.clicked = function(e) {
        if (e.hasClass("icon-close")) {
            $(e).remove();
        } else {
            this.search.val("");
            e.addClass("icon-close");
            this.selected.append(e);
        }
    }

}