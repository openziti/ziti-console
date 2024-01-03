/*
    Copyright NetFoundry Inc.

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


var cookies = {
	get: function(id) {
		var cname = id+"=";
		var ca = document.cookie.split(';');
		for (var i=0; i < ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0)==' ') c = c.substring(1,c.length);
			if (c.indexOf(cname) == 0) {
				return c.substring(cname.length, c.length);
			}
		}
		return null;
	},
	remove: function(id) {
  		document.cookie = id+'=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	},
	set: function(id, val) {
    	document.cookie = id+"="+val+"; path=/";
	},
	setObject: function(id, obj) {
		cookies.set(id, JSON.stringify(obj));
	},
	getObject: function(id) {
		try {
			return JSON.parse(cookies.get(id));
		} catch (e) {
			return "";
		}
	}
}

var context = {
	ns: "ziti",
	items: [],
	watchers: [],
	eventWatchers: [],
	init: function(ns) {
		if (ns) context.ns = ns;
		context.poll();
		setInterval(context.poll, 1000);
	},
	remove: function(id) {
		var keys = "";
		var index = 0;
		for (var key in context.items) {
			if (key!=id) {
				keys += ((index>0)?",":"")+key;
				index++;
			}
		}
		context.items[id] = null;
		localStorage.setItem(context.ns+"-context", keys);
		localStorage.removeItem(context.ns+"-"+id+"-value");
		localStorage.removeItem(context.ns+"-"+id+"-updated");
	},
	set: function(id, obj) {
		context.items[id] = {
			time: (new Date()).getTime(),
			data: obj
		}
		var keys = "";
		var index = 0;
		for (var key in context.items) {
			keys += ((index>0)?",":"")+key;
			index++;
		}
		localStorage.setItem(context.ns+"-context", keys);
		localStorage.setItem(context.ns+"-"+id+"-value", JSON.stringify(context.items[id]));
		context.update(id, obj);
	},
	get: function(id) {
		context.poll();
		var val = "";
		if (context.items[id]&&context.items[id].data) val = context.items[id].data;
		return val;
	},
	update: function(id, obj) {
		if (context.watchers[id]&&obj!=null) {
			var calls = context.watchers[id];
			for (var i=0; i<calls.length; i++) {
				try {
					calls[i]({ id: id, data: obj });
				} catch (e) {
				}
			}
		}
		$("*[data-context^='"+id+"']").each(function(index, element) {
            var propName = $(element).attr("data-context");
            var propTo = $(element).attr("data-contextSet");
			var val = "";
			var propTree = propName.split('.');
			var obj = context.items[propTree[0]].data;
			var index = 1;
			while (index<propTree.length) obj = obj[propTree[index++]];
           });
		$("*[data-context='"+id+"']").each(function(index, element) {
            var propName = $(element).attr("data-context");
			val = context.items[id].data;
			context.assign($(element), val);
        });
	},
	addListener: function(id, func) {
		if (!context.watchers[id]) context.watchers[id] = [];
		context.watchers[id].push(func);
	},
	addEventListener: function(id, func) {
		if (!context.eventWatchers[id]) context.eventWatchers[id] = [];
		context.eventWatchers[id].push(func);
	},
	removeListener: function(id) {
		context.watchers[id] = [];
	},
	fire: function(id, obj) {
		if (context.eventWatchers[id]) {
			var events = context.eventWatchers[id];
			for (var i=0; i<events.length; i++) {
				events[i].call(obj);
			}
		}
	},
	poll: function() {
		var contextData = localStorage.getItem(context.ns+"-context");
		if (contextData) {
			var keys = contextData.split(',');
			for (var i=0; i<keys.length; i++) {
				var key = keys[i];
				var val = {};
				var obj = JSON.parse(localStorage.getItem(context.ns+"-"+key+"-value"));
				if (obj) {
					var lastUpdates = obj.time;
					val = obj.data;
					if (!context.items[key]) {
						context.items[key] = obj;
						context.update(key, context.items[key].data);
					} else {
						if (!isNaN(lastUpdates)) {
							if (Number(lastUpdates)>context.items[key].time) {
								context.items[key].time = Number(lastUpdates);
								context.items[key].data = val;
								context.update(key, context.items[key].data);
							}
						}
					}
				}
			}
		}
	},
	assign: function(element, val, what) {
		if (what) {
			if (what.toLowerCase()=="background-image") $(element).css(what, "url("+val+")");
			else $(element).css(what, val);
		} else {
			if (element.is("input")) element.val(val);
			else if (element.is("div")) element.html(val);
			else if (element.is("span")) element.html(val);
			else if (element.is("video")) element.attr("src", val);
			else element.html(val);
		}
	}
}
