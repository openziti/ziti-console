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



var service = {
	host: location.protocol+"//"+window.location.hostname+((window.location.port)?":"+window.location.port:""),
	base: "/api",
	call: function(name, params, returnTo, type) {
		if (!type) type = "POST";
		var paramString = JSON.stringify(params);
		$.ajax({
			type: type,
			contentType: "application/json",
			dataType: "json",
			url: service.host+service.base+"/"+name,
			data: paramString,
			async: true,
			beforeSend: function(e) {
				// Set indication of operation
			},
			error: function(e) {
				// Process Error
				if (console) console.log(e);
			},
			complete: function(e) {
				// Set indication of operation Complete
				if (e.responseJSON&&e.responseJSON.errorObj) {
					console.log("Error", e.responseJSON.errorObj);
				}
				
				if (e.responseJSON&&e.responseJSON.error&&((e.responseJSON.error.code&&e.responseJSON.error.code=="ECONNREFUSED")||(e.responseJSON.errorObj&&e.responseJSON.errorObj.code=="NOT_FOUND"))) {
					window.location = "/login?logout=true";
				} else {
					if (e.responseJSON&&e.responseJSON.error&&e.responseJSON.error=="loggedout") {
						window.location = "/login?logout=true";
					} else {
						try {
							if (e.responseJSON.errorObj && e.responseJSON.errorObj.code && e.responseJSON.errorObj.code=="SELF_SIGNED_CERT_IN_CHAIN") {
								growler.error("Self Signed Certificate not allowed");
								setTimeout(() => {
									window.location = "/login";
								}, 3000);
							} else {
								if (e.responseJSON&&e.responseJSON.error!=null&&(e.responseJSON.error.indexOf("credentials are invalid")>0 || e.responseJSON.errorObj.code==='UNAUTHORIZED')) {
									console.log("ERROR");
									console.log(e.responseJSON);
									window.location = "/login?logout=true";
								}
							}
						} catch (exc) {
							console.log("ERROR CAUGHT");
							console.log(exc);
							// window.location = "/login?logout=true";
						}
					}
				}
				
			},
			success: returnTo
		});
	}
}
