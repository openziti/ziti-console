var locale = {
    keys: [],
    init: function() {
		service.call("language", {locale: navigator.language}, locale.loaded);
    },
    set: function(key) {
		service.call("language", {locale: key}, locale.loaded);
    },
    get: function(key) {
        if (!locale.keys[key]) return "";
        else return locale.keys[key];
    },
	loaded: function(e) {
		var obj = e;
		for (var item in obj) {
			locale.keys[item] = obj[item];
		}
		$("[data-i18n]").each((i, e) => {
			var key = $(e).data("i18n");
            var tag = $(e).prop("tagName").toLowerCase();
			if (!key || key.trim().length>0) {
                if (tag=="input"||tag=="textarea") $(e).prop("placeholder", locale.keys[key]);
                else $(e).html(locale.keys[key]);
			} else {
				var id = $(e).attr("id");
                if (tag=="input"||tag=="textarea") $("#"+id).prop("placeholder", locale.keys[id]);
                else $("#"+id).html(locale.keys[id]);
			}
		});
	},
}