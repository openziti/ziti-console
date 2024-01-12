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
var user = {
	init: function() {
		user.events();
	},
	events: function() {

	},
	login: function(url, username, password) {
		service.call("login", { url: url, username: username, password: password }, user.loginComplete);
	},
	loginComplete: function(e) {
		if (e.error) {
			growler.error(e.error);
		} else {
			window.location = "/";
		}
	},
	reset: function(oldPass, newPass, confirmPass) {
		service.call("reset", { password: oldPass, newpassword: newPass, confirm: confirmPass }, user.resetComplete);
	},
	resetComplete: function(e) {
		if (e.error) growler.error("Not Reset", e.error);
		else {
			growler.success("Password Reset", "Your password has been changed.")
			$("input:password").val("");
		}
	}
}
