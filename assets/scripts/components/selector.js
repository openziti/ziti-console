var SelectorStyles = {
    format: function(values) {
        valString = "";
        if (values&&values.length>0) {
            for (var j=0; j<values.length; j++) {
                var type = "hash";
                var item = values[j];
                if (item.name) {
                    if (item.name.indexOf("@")==0) type="at";
                    valString += '<div class="'+type+'tag">'+item.name+'</div>';
                } else {
                    if (typeof item === 'object') {
                        valString += "";
                    } else {
                        if (item.indexOf("@")==0) type="at";
                        valString += '<div class="'+type+'tag">'+item+'</div>';
                    }
                }
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
    this.data;
    this.isSingleSelect = false;
    this.isDropOver = false;
    this.isForceHash = true;
    this.isForceAt = false;
    this.searchVal = "";
    this.atData = [];
    this.suggests;
    this.init = function() {
        var element = $("#"+this.id); 
        if (element) {
            var html = '<div class="searchSelector'+((this.isDropOver)?" inline":"")+((this.isSingleSelect)?" only":"")+'"><input id="'+this.id+'Search" type="text" maxlength="500" placeholder="Type to select '+this.label+' attributes" />';
            html += '<div id="'+this.id+'Suggest" data-index="0" class="suggests"></div>';
            html += '<div id="'+this.id+'Selected" class="tagArea"></div></div>';
            element.html(html);
        }
        this.events();
        if (this.atType) {
            this.data = new Data(this.atType);
            this.data.closeModals = false;
            this.data.paging.total = 1000;
            this.data.paging.sort = "name";
            this.data.init(false);
        }
    };
    this.events = function() {
        if (this.atType) context.addListener(this.atType, this.atLoaded.bind(this));
        $("#"+this.id+"Search").keyup(this.keyup.bind(this));
        $("#"+this.id+"Search").blur(this.blurred.bind(this));
    };
    this.atLoaded = function(e) {
        this.atData = e.data;
        var suggestItems = this.atData;
        this.suggests.html("");
        if (suggestItems.length>0) {
            for (var i=0; i<suggestItems.length; i++) {
                this.suggests.append('<div class="suggest">'+suggestItems[i].name+'</div>');
            }
            this.suggests.addClass("open");
            $(".suggest").click(this.suggestClicked.bind(this));
        }
    };
    this.blurred = function(e) {
        var item = $("#"+this.id+"Search").val().trim();
        if (item.indexOf("@")!=0&&item.indexOf("#")!=0&&this.isForceHash) item = "#"+item;
        if (item.length>1) {
            if (item.indexOf("@")==0) {
                for (var i=0; i<this.atData.length; i++) {
                    if (this.atData.name==item) {
                        this.addIfNotExists($(e.currentTarget), item);
                        break;
                    }
                }
            } else {
                if (item.indexOf("#")==0||!this.isForceHash) this.addIfNotExists($(e.currentTarget), item);
            }
            $(".tagButton").off("click");
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
                if (val.role) {
                    if (val.role.indexOf("#")==0) selected.append('<div class="hashtag tagButton icon-close" data-id="'+val.role+'"><span class="label">'+val.name+'</span></div>');
                    else if (val.role.indexOf("@")==0) selected.append('<div class="attag tagButton icon-close" data-id="'+val.role+'"><span class="label">'+val.name+'</span></div>');
                    else selected.append('<div class="hashtag tagButton icon-close" data-id="'+val.role+'"><span class="label">'+val.name+'</span></div>');
                } else {
                    if (val.indexOf("#")==0) selected.append('<div class="hashtag tagButton icon-close" data-id="'+val+'"><span class="label">'+val+'</span></div>');
                    else if (val.indexOf("@")==0) selected.append('<div class="attag tagButton icon-close" data-id="'+val+'"><span class="label">'+val+'</span></div>');
                    else selected.append('<div class="hashtag tagButton icon-close" data-id="'+val+'"><span class="label">'+val+'</span></div>');
                }
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
                values[values.length] = $(e).data("id");
            });
            return values;
        }
    },
    this.vals = function(vals) {
        var selected = $("#"+this.id+"Selected");
        if (vals) {
            selected.html("");
            for (var i=0; i<vals.length; i++) {
                var val = vals[i];
                if (val.name.indexOf("#")==0) selected.append('<div class="hashtag tagButton icon-close" data-id="'+val.id+'"><span class="label">'+val.name+'</span></div>');
                else if (val.name.indexOf("@")==0) selected.append('<div class="attag tagButton icon-close" data-id="'+val.id+'"><span class="label">'+val.name+'</span></div>');
                else selected.append('<div class="hashtag tagButton icon-close" data-id="'+val.id+'"><span class="label">'+val.name+'</span></div>');
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
                values[values.length] = {
                    id: $(e).data("id"),
                    name: $(e).html()
                }
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
            var found = false;
            if (this.isSingleSelect) input.parent().find(".tagArea").html("");
            if (item.indexOf("@")==0) {
                type = "at";
            }
            for (var i=0; i<this.atData.length; i++) {
                console.log(this.atData[i].name);
                if (this.atData[i].name==item.substr(1)) {
                    input.parent().find(".tagArea").append('<div class="'+type+'tag tagButton icon-close" data-id="@'+this.atData[i].id+'"><span class="label">'+item+'</span></div>');
                    found = true;
                    break;
                }
            }
            if (!found) {
                if (item.indexOf("#")==0) {
                    input.parent().find(".tagArea").append('<div class="'+type+'tag tagButton icon-close" data-id="'+item+'"><span class="label">'+item+'</span></div>');
                } else {
                    if (this.isForceHash) input.parent().find(".tagArea").append('<div class="'+type+'tag tagButton icon-close" data-id="#'+item+'"><span class="label">#'+item+'</span></div>');
                    else input.parent().find(".tagArea").append('<div class="'+type+'tag tagButton icon-close" data-id="'+item+'"><span class="label">'+item+'</span></div>');
                }
            }
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
    this.keyup = function(e) {
        if (this.isForceAt) {
            var search = $(e.currentTarget).val();
            if (search.length>0) {
               if (search.charAt(0)!='@') $(e.currentTarget).val("@"+search)
               if (this.isSingleSelect) $(e.currentTarget).parent().find(".tagArea").html("");
            }
        }
        this.suggests = $(e.currentTarget).parent().find(".suggests");
        if (e.keyCode==13) {
            if (this.suggests.find(".highlighted").length>0) {
                var selected = $(this.suggests.find(".highlighted")).html();
                var input = $(this.suggests.find(".highlighted")).parent().parent().find("input");
                this.addIfNotExists(input, "@"+selected);
                $(".tagButton").off("click");
                $(".tagButton").on("click", function(e) {
                    $(e.currentTarget).remove();
                });
                this.suggests.removeClass("open");
                this.suggests.html("");
            } else this.blurred(e);
        }
        if (e.keyCode==186||e.keyCode==188) {
            $(e.currentTarget).val($(e.currentTarget).val().slice(0, -1));
            this.blurred(e);
        }
        if (e.keyCode==38||e.keyCode==40) {
            var index = this.suggests.data("index");
            var max = this.suggests.children().length;
            if (e.keyCode==40) index++;
            else index--
            if (index>=max) index = 0;
            if (index<0) index = max-1;
            $(".suggest").removeClass("highlighted");
            $(this.suggests.children()[index]).addClass("highlighted");
            this.suggests.data("index", index);
        } else {
            this.suggests.data("index", -1);
            var searchVal = $(e.currentTarget).val();
            if (searchVal.indexOf('@')==0&&searchVal.length>2) {
                searchVal = searchVal.substr(1);
                this.suggests.html("");
                this.data.paging.filter = searchVal;
                this.data.get();
            } else {
                this.suggests.html("");
                this.suggests.removeClass("open");
            } 
        }
    };
}
