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
    this.results = [];

    this.element = null;
    this.suggests = null;
    this.selected = null;
    this.filter = null;



    this.init = function() {
        this.element = $("#"+this.id);
        if (this.element) {
            var html = '<div class="searchSelector'+((this.isSingle)?" only":"")+'"><input id="'+this.id+'Search" type="text" maxlength="500" placeholder="'+this.label+'" />';
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
    }

    this.addSource = function(source) {
        source.onLoaded = this.onLoaded.bind(this);
        source.get();
        this.datasources.push(source);
    }

    this.onLoaded = function(source) {
        var data = source.data;
        this.results.push(data);
        let html = "";
        for (var i=0; i<data.length; i++) {
            var item = data[i];
            html += this.getHtml(item, source, false);
        }
        this.suggests.append(html);
        $(".tagButton").off("click");
        $(".tagButton").on("click", this.clicked.bind(this));
        console.log(this.results.length);
        if (this.results.length>0) this.suggests.addClass("open");
        else this.suggests.removeClass("open");
    }

    this.focus = function(e) {
        this.keyup(e);
    }

    this.blur = function(e) {
        this.suggests.hide();
    }

    this.keyup = function(e) {
        var search = this.filter.val().trim();

        if (this.lastSearch!=search) {
            this.results = [];
            this.suggests.empty();
            this.lastSearch = search;
            for (var i=0; i<this.datasources.length; i++) {
                this.datasources[i].get(search);
            }
        }
    }

    this.getHtml = function(item, source, isSelected) {
        var tagType = "";
        if (source.appennd=="#") tagType = "hash";
        else if (source.append=="@") tagType = "att";
        return '<div class="'+tagType+'tag tagButton" data-id="'+item[source.variables.id]+((isSelected)?' icon-close':'')+'"><span class="label">'+item[source.variables.name]+'</span></div>';
    }

    this.val = function(values) {
        if (values) {
            this.selected.empty();
            for (let i=0; i<values.length; i++) {
                var item = data[i];
                this.selected.append(this.getHtml(item, source, false));
            }
            this.filter.val("");
            $(".tagButton").off("click");
            $(".tagButton").on("click", this.clicked.bind(this));
        } else {
            values = [];
            this.selected.children().each((i, e) => {
                values.push({
                    id: $(e).data("id"),
                    name: $(e).html()
                });
            });
            return values;
        }
    }

    this.clicked = function(e) {
        let elem = $(e.currentTarget);
        if (elem.hasClass("icon-close")) {
            elem.remove();
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
                elem.addClass("icon-close");
                $(".suggests").removeClass("open");
                this.selected.append(elem);
            }
        }
    }

}