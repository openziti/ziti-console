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
var fabricSessions = {
	name: "fabricSessions",
	data: [],
	init: function() {
		this.events();
		this.get();
	},
	events: function() {
	},
	getParams: function() {
		return {
			type: "sessions",
			url: context.get("fabricUrl")
		};
	},
	get: function() {
		var params = this.getParams();
		service.call("dataFabric", params, this.getReturned);
	},
	getReturned: function(e) {
		if (e.error) growler.info("No Session", "No Sessions Available");
		if (e.data) {
			fabricSessions.data = e.data;
			context.set(fabricSessions.name, fabricSessions.data);
		}
	},
	details: function(id) {
		for (var i=0; i<this.data.length; i++) {
			if (this.data[i].id==id) return this.data[i];
		}
		return null;
    },
    getServiceSessions: function(id) {
        var sessions = [];
        for (var i=0; i<fabricSessions.data.length; i++) {
            if (fabricSessions.data[i].serviceId==id) sessions[sessions.length] = fabricSessions.data[i]
        }
        return sessions;
    },
    getClients: function(id) {
        var clients = [];
        for (var i=0; i<fabricSessions.data.length; i++) {
            if (fabricSessions.data[i].serviceId==id) {
                if (!clients.includes(fabricSessions.data[i].clientId)) clients[clients.length] = fabricSessions.data[i].clientId;
            }
        }
        return clients;
    }
}
