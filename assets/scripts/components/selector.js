var SelectorStyles = {
    format: function(values) {
        valString = "";
        if (values&&values.length>0) {
            for (var j=0; j<values.length; j++) {
                var type = "hash";
                var item = values[j];
                if (item.indexOf("@")==0) type="at";
                valString += '<div class="'+type+'tag">'+item+'</div>';
            }
        } else valString = "None";
        return valString;
    }
}

var Selector = function(id, label, atType, hashType) {
    this.id = id;
    this.label = label;
    this.atType = atType;
    this.hashType = hashType;
    this.isForceHash = true;
    this.atData = [];
    this.init = function() {
        var element = $("#"+this.id); 
        if (element) {
            var html = '<div class="searchSelector"><input id="'+this.id+'Search" type="text" maxlength="500" placeholder="Type to select '+this.label+' attributes" />';
            html += '<div id="'+this.id+'Suggest" data-index="0" class="suggests"></div>';
            html += '<div id="'+this.id+'Selected" class="tagArea"></div></div>';
            element.html(html);
        }
        this.events();
        if (this.atType) {
            var data = new Data(this.atType);
            data.paging.sort = "name";
            data.init(true);
        }
    };
    this.events = function() {
        if (this.atType) context.addListener(this.atType, this.atLoaded.bind(this));
        $("#"+this.id+"Search").keyup(this.commit.bind(this));
        $("#"+this.id+"Search").blur(this.blurred.bind(this));
    };
    this.atLoaded = function(e) {
        this.atData = e.data;
    };
    this.blurred = function(e) {
        var item = $("#"+this.id+"Search").val().trim();
        if (item.indexOf("@")!=0&&item.indexOf("#")!=0&&this.isForceHash) item = "#"+item;
        if (item.length>1) {
            if (item.indexOf("@")==0||item.indexOf("#")==0||!this.isForceHash) this.addIfNotExists($(e.currentTarget), item);
            $(".tagButton").off("click", function(e) {
                $(e.currentTarget).remove();
            });
            $(".tagButton").on("click", function(e) {
                $(e.currentTarget).remove();
            });
        }
    };
    this.val = function(vals) {
        var selected = $("#"+this.id+"Selected");
        if (vals) {
            selected.html("");
            for (var i=0; i<vals.length; i++) {
                var val = vals[i];
                if (val.indexOf("#")==0) selected.append('<div class="hashtag tagButton icon-close"><span class="label">'+val+'</span></div>');
                else if (val.indexOf("@")==0) selected.append('<div class="attag tagButton icon-close"><span class="label">'+val+'</span></div>');
                else selected.append('<div class="hashtag tagButton icon-close"><span class="label">'+val+'</span></div>');
            }
            $("#"+this.id+"Search").val("");
            $(".tagButton").off("click", function(e) {
                $(e.currentTarget).remove();
            });
            $(".tagButton").on("click", function(e) {
                $(e.currentTarget).remove();
            });
        } else {
            var values = [];
            selected.children().each(function(i, e) {
                values[values.length] = $(e).children("span").html();
            });
            return values;
        }
    },
    this.addIfNotExists = function(input, item) {
        var found = false;
        input.parent().find(".tagArea").children().each(function(i, e) {
            var itemValue =  $(e).children("span").html();
            if (itemValue==item) {
                found = true;
                var obj = $(e);
                obj.addClass("error");
                setTimeout(function() {
                    obj.removeClass("error");
                }, 500);
            }
        });          
        if (!found) {
            input.val("");
            var type = "hash";
            if (item.indexOf("@")==0) type="at";
            input.parent().find(".tagArea").append('<div class="'+type+'tag tagButton icon-close"><span class="label">'+item+'</span></div>');
        }  
    };
    this.suggestClicked = function(e) {
        var selected = $(e.currentTarget).html();
        var input = $(e.currentTarget).parent().parent().find("input");
        this.addIfNotExists(input, "@"+selected);
        $(".tagButton").off("click", function(e) {
            $(e.currentTarget).remove();
        });
        $(".tagButton").on("click", function(e) {
            $(e.currentTarget).remove();
        });
        var suggests = $(e.currentTarget).parent();
        suggests.removeClass("open");
        suggests.html("");
    };
    this.commit = function(e) {
        var suggests = $(e.currentTarget).parent().find(".suggests");
        if (e.keyCode==13) {
            if (suggests.find(".highlighted").length>0) {
                var selected = $(suggests.find(".highlighted")).html();
                var input = $(suggests.find(".highlighted")).parent().parent().find("input");
                this.addIfNotExists(input, "@"+selected);
                $(".tagButton").off("click", function(e) {
                    $(e.currentTarget).remove();
                });
                $(".tagButton").on("click", function(e) {
                    $(e.currentTarget).remove();
                });
                suggests.removeClass("open");
                suggests.html("");
            } else this.blurred(e);
        }
        if (e.keyCode==186||e.keyCode==188) {
            $(e.currentTarget).val($(e.currentTarget).val().slice(0, -1));
            this.blurred(e);
        }
        if (e.keyCode==38||e.keyCode==40) {
            var index = suggests.data("index");
            var max = suggests.children().length;
            if (e.keyCode==40) index++;
            else index--
            if (index>=max) index = 0;
            if (index<0) index = max-1;
            $(".suggest").removeClass("highlighted");
            $(suggests.children()[index]).addClass("highlighted");
            suggests.data("index", index);
        } else {
            suggests.data("index", -1);
            var searchVal = $(e.currentTarget).val();
            if (searchVal.indexOf('@')==0&&searchVal.length>2) {
                searchVal = searchVal.substr(1);
                suggests.html("");
                var found = false;
                var suggestItems = this.atData;
                for (var i=0; i<suggestItems.length; i++) {
                    if (suggestItems[i].name.startsWith(searchVal)) {
                        found = true;
                        suggests.append('<div class="suggest">'+suggestItems[i].name+'</div>');
                    }
                }
                if (found) {
                    suggests.addClass("open");
                    $(".suggest").click(this.suggestClicked.bind(this));
                }
            } else {
                suggests.html("");
                suggests.removeClass("open");
            }
        }
    };
}
