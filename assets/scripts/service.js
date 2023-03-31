

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
								if (e.responseJSON&&e.responseJSON.error!=null&&e.responseJSON.error.indexOf("credentials are invalid")>0) {
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