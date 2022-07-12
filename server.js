const express = require('express');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const session = require('express-session');
const sessionStore = require('session-file-store')(session);
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const cors = require('cors');
const external = require('request');
const moment = require("moment");
const Influx = require('influx');
const helmet = require('helmet');
const https = require("https");
const crypto = require('crypto');
const $RefParser = require("@apidevtools/json-schema-ref-parser");

/*
const loadModule = async (modulePath) => {
	try {
	  return await import(modulePath)
	} catch (e) {
	  throw new Error(`Unable to import module ${modulePath}`)
	}
}
*/
//var ziti;
//const zitiServiceName = process.env.ZITI_SERVICE_NAME || 'zac';
//const zitiIdentityFile = process.env.ZITI_IDENTITY_FILE;

//try {
//	ziti = await loadModule('@openziti/ziti-sdk-nodejs')
//} catch (e) {
//	if (typeof zitiIdentityFile !== 'undefined') {
//		console.error(e);
//		process.exit();
//	}
//}


/**
 * Command line Launch Settings
 */
const port = process.env.PORT||1408;
const portTLS = process.env.PORTTLS||8443;
const settingsPath = process.env.SETTINGS || '/../ziti/';

/*
if ((typeof zitiIdentityFile !== 'undefined') && (typeof zitiServiceName !== 'undefined')) {
	await ziti.init( zitiIdentityFile ).catch(( err ) => { process.exit(); }); // Authenticate ourselves onto the Ziti network using the specified identity file
}
*/

const zacVersion = "2.3.8";

var serviceUrl = "";
var baseUrl = "";
var fabricUrl = "";
var headerFile = __dirname+"/assets/templates/header.htm";
var footerFile = __dirname+"/assets/templates/footer.htm";
var header = fs.readFileSync(headerFile, 'utf8');
var footer = fs.readFileSync(footerFile, 'utf8');
var isDebugging = false;

for (var i=0; i<process.argv.length; i++) {
	if (process.argv[i]!=null && process.argv[i].toLowerCase()=="debug") {
		isDebugging = true;
	}
}

/**
 * Watch for header and footer file changes and load them
 */
fs.watchFile(headerFile, (curr, prev) => {
	log(headerFile+" file Changed");
	header = fs.readFileSync(headerFile, 'utf8');
});
fs.watchFile(footerFile, (curr, prev) => {
	log(footerFile+" file Changed");
	footer = fs.readFileSync(footerFile, 'utf8');
});

var errors = {
	access: "You Do Not Have Access To Perform This Operations",
	invalidServer: "Invalid Edge Controller"
}

/**
 * Define Express Settings
 */
var app = express();
/*
if ((typeof zitiIdentityFile !== 'undefined') && (typeof zitiServiceName !== 'undefined')) {
	app = ziti.express( express, zitiServiceName );	// using Ziti networking
} else {
	app = express();								// using raw  networking
}
*/
app.use('/assets', express.static('assets'));
app.use(cors());
app.use(helmet());
app.use(function(req, res, next) {
    res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-eval' 'unsafe-inline' http://cdn.jsdelivr.net http://maxcdn.bootstrapcdn.com https://cdn.jsdelivr.net http://cdnjs.cloudflare.com https://cdnjs.cloudflare.com https://cdnjs.com https://apis.google.com https://ajax.googleapis.com https://fonts.googleapis.com https://www.google-analytics.com https://www.googletagmanager.com; object-src 'none'; form-action 'none'; frame-ancestors 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://maxcdn.bootstrapcdn.com http://maxcdn.bootstrapcdn.com http://cdn.jsdelivr.net https://cdnjs.com https://fonts.googleapis.com");
    return next();
});
app.use(bodyParser.json());
app.use(fileUpload());
app.use(session({ 
	store: new sessionStore, 
	secret: 'NetFoundryZiti', 
	retries: 0, 
	resave: true, 
	saveUninitialized: true, 
	ttl: 60000, 
	logFn: () => {}
}));

/**
 * Load configurable settings, or create the settings in place if they have never been defined
 */
if (!fs.existsSync(__dirname+settingsPath)) {
	fs.mkdirSync(__dirname+settingsPath);
}
if (!fs.existsSync(__dirname+settingsPath+'tags.json')) {
	fs.copyFileSync(__dirname+'/assets/data/tags.json', __dirname+settingsPath+'tags.json');
}
if (!fs.existsSync(__dirname+settingsPath+'templates.json')) {
	fs.copyFileSync(__dirname+'/assets/data/templates.json', __dirname+settingsPath+'templates.json');
}
if (!fs.existsSync(__dirname+settingsPath+'settings.json')) {
	fs.copyFileSync(__dirname+'/assets/data/settings.json', __dirname+settingsPath+'settings.json');
}
if (!fs.existsSync(__dirname+settingsPath+'/resources')) {
	fs.mkdirSync(__dirname+settingsPath+'/resources');
	fse.copySync(__dirname+'/assets/resources/',__dirname+settingsPath+'/resources/');
}
var pages = JSON.parse(fs.readFileSync(__dirname+'/assets/data/site.json', 'utf8'));
var tags = JSON.parse(fs.readFileSync(__dirname+settingsPath+'tags.json', 'utf8'));
var templates = JSON.parse(fs.readFileSync(__dirname+settingsPath+'templates.json', 'utf8'));
var settings = JSON.parse(fs.readFileSync(__dirname+settingsPath+'settings.json', 'utf8'));

for (var i=0; i<settings.edgeControllers.length; i++) {
	if (settings.edgeControllers[i].default) {
		serviceUrl = settings.edgeControllers[i].url;
		break;
	}
}

for (var i=0; i<settings.fabricControllers.length; i++) {
	if (settings.fabricControllers[i].default) {
		fabricUrl = settings.fabricControllers[i].url;
		break;
	}
}

/**
 * Setup static pages from configuration files defined in /data/site.json
 */
for (var i=0; i<pages.length; i++) {
	app.get(pages[i].url, function(request, response) {
		var page = pages[0];
		for (var i=0; i<pages.length; i++) {
			if (pages[i].url==request.url) {
				page = pages[i];
				break;
			}
		}
		if (page.access=="") {
			if (page.url=="/login") request.session.user = null;
			var headerNow = header.split("{{title}}").join(page.title);
			headerNow = headerNow.split("{{auth}}").join("");
			fs.readFile(__dirname+"/html"+page.page, 'utf8', function(err, data) {
				response.send(headerNow+data+footer);
			});
		} else {
			if (request.session.user==null||request.session.user=="") response.redirect("/login");
			else {
				if (Number(page.access)<=Number(request.session.authorization)) {
					var headerNow = header.split("{{title}}").join(page.title);
					headerNow = headerNow.split("{{auth}}").join(" loggedIn");
					fs.readFile(__dirname+"/html"+page.page, 'utf8', function(err, data) {
						response.send(headerNow+data+footer);
					});
				} else response.redirect('/login');
			}
		}
	});
}



/**------------- Authentication Section -------------**/



/**
 * Just tests if the user exists as a session or not, would add on to validate roles, etc if the system is expanded to 
 * include more well defined authentication structures
 * @param {The current user session} user 
 */
function hasAccess(user) {
	return (user!=null);
}

/**
 * Authentication method, authenticates the user to the provided edge controller defined by url
 */
app.post("/api/login", function(request, response) {
	var urlToSet = request.body.url+"/edge/management/v1";
	if (!IsServerDefined(urlToSet)) response.json({error: errors.invalidServer });
	else {
		baseUrl = urlToSet;
		GetPath().then((prefix) => {
			serviceUrl = urlToSet+prefix;
			request.session.creds = {
				username: request.body.username,
				password: request.body.password
			};
			Authenticate(request).then((results) => {
				response.json(results);
			});
		});
	}
});

function Authenticate(request) {
	return new Promise(function(resolve, reject) {
		log("Connecting to: "+serviceUrl+"/authenticate?method=password");
		if (request.session.creds != null) {
			external.post(serviceUrl+"/authenticate?method=password", {json: request.session.creds , rejectUnauthorized: false }, function(err, res, body) {
				if (err) {
					log(err);
					var error = "Server Not Accessible";
					if (err.code!="ECONNREFUSED") resolve( {error: err.code} );
					resolve( {error: error} );
				} else {
					if (body.error) resolve( {error: body.error.message} );
					else {
						if (body.data&&body.data.token) {
							request.session.user = body.data.token;
							request.session.authorization = 100;
							resolve( {success: "Logged In"} );
						} else resolve( {error: "Invalid Account"} );
					}
				}				
			});
		}
	});
}

/**
 * Return the server path to the services
 * 
 * @returns The path to the services
 */
function GetPath() {
	return new Promise(function(resolve, reject) {
		external.get(baseUrl+"/version", {rejectUnauthorized: false}, function(err, res, body) {
			try {
				var data = JSON.parse(body);
				resolve(data.data.apiVersions["edge-management"].v1.path);
			} catch (e) {
				log("Invalid Json Result on Version: "+e);
				resolve("");
			}
		});
	});
}

/**
 * Returned the version of the edge-controller server
 */
app.post('/api/version', function(request, response) {
	if (baseUrl) {
		log("Checking Version: "+baseUrl+"/version");
		external.get(baseUrl+"/version", {rejectUnauthorized: false}, function(err, res, body) {
			if (err) log(err);
			else {
				try {
					var data = JSON.parse(body);
					log("Version: "+body);
					if (data&&data.data) response.json( {data: data.data, zac: zacVersion} );
					else response.json({});
				} catch (e) {
					log("Invalid Json Result on Version: "+e);
					response.json({});
				}
			}
		});
	} else response.json({});
});

/**
 * Reset the current users password
 */
app.post("/api/reset", function(request, response) {
	if (serviceUrl==null||serviceUrl.length==0) response.json({error:"loggedout"});
	else {
		if (request.body.newpassword!=request.body.confirm) response.json({error: "Password does not match confirmation"});
		else {
			log("Connecting to: "+serviceUrl+"/current-identity/authenticators?filter=method=\"updb\"");
			external.get(serviceUrl+"/current-identity/authenticators?filter=method=\"updb\"", {rejectUnauthorized: false, headers: { "zt-session": request.session.user }}, function(err, res, body) {
				if (err) {
					log(err);
					var error = "Server Not Accessible";
					if (err.code!="ECONNREFUSED") response.json( {error: err.code} );
					response.json( {error: error} );
				} else {
					var data = JSON.parse(body);
					if (data.error) {
						log(JSON.stringify(data.error));
						response.json( {error: data.error.message} );
					} else {
						if (data.data.length>0) {
							var id = data.data[0].id;
							var params = {
								currentPassword: request.body.password,
								password: request.body.newpassword,
								username: data.data[0].username
							}
							log("Connecting to: "+serviceUrl+"/current-identity/authenticators/"+id);
							external.put(serviceUrl+"/current-identity/authenticators/"+id, {json: params, rejectUnauthorized: false, headers: { "zt-session": request.session.user }}, function(err, res, body) {
								if (err) {
									log(err);
									var error = "Server Not Accessible";
									if (err.code!="ECONNREFUSED") response.json( {error: err.code} );
									response.json( {error: error} );
								} else {
									if (body.error) {
										log(JSON.stringify(body.error));
										response.json( {error: body.error.message} );
									} else response.json( {success: "Password Updated"} );
								}
							});
						} else {
							response.json({ error: "Unknown User" });
						}
					}
				}
			});
		}
	}
});



/**------------- Server Settings Section -------------**/



/**
 * Tests whether the service url exists in the system to prevent hitting unknown server sources
 * 
 * @param {The Url to check if it exists in the configuration} url 
 */
function IsServerDefined(url) {
	for (var i=0; i<settings.edgeControllers.length; i++) {
		if (settings.edgeControllers[i].url==url) return true;
	}
	return false;
}

/**
 * Returns the current system settings
 */
app.post("/api/settings", function(request, response) {
	response.json(settings);
});

/**
 * Save controller information to the settings file if the server exists
 */
app.post("/api/controllerSave", function(request, response) {
	var name = request.body.name.trim();
	var url = request.body.url.trim();
	if (url.endsWith('/')) url = url.substr(0, url.length-1);
	var errors = [];
	if (name.length==0) errors[errors.length] = "name";
	if (url.length==0) errors[errors.length] = "url";
	if (errors.length>0) {
		response.json({ errors: errors });
	} else {
		log("Calling Controller: "+url);
		external.get(url+"/edge/management/v1/version", {rejectUnauthorized: false}, function(err, res, body) {
			if (err) response.json( {error: "Edge Controller not Online"} );
			else {
				try {
					var results = JSON.parse(body);
					if (body.error) response.json( {error: "Invalid Edge Controller"} );
					else {
						log("Controller: "+url+" Returned: "+body);
						var found = false;
						for (var i=0; i<settings.edgeControllers.length; i++) {
							if (settings.edgeControllers[i].url==url) {
								found = true;
								settings.edgeControllers[i].name = name;
								settings.edgeControllers[i].url = url;
								break;
							}
						}
						if (!found) {
							var isDefault = false;
							if (settings.edgeControllers.length==0) isDefault = true;
							settings.edgeControllers[settings.edgeControllers.length] = {
								name: name,
								url: url,
								default: isDefault
							};
						}
						fs.writeFileSync(__dirname+settingsPath+'/settings.json', JSON.stringify(settings));
						response.json(settings);
					}
				} catch (e) {
					log("Controller: "+url+" Returned "+(typeof body)+": "+body);
					response.json( {error: body} );
				}
			}
		});		
	}
});

/**
 * Save fabric controller information to the settings file if the server exists
 */
app.post("/api/fabricSave", function(request, response) {
	var name = request.body.name.trim();
	var url = request.body.url.trim();
	if (url.endsWith('/')) url = url.substr(0, url.length-1);
	var errors = [];
	if (name.length==0) errors[errors.length] = "name";
	if (url.length==0) errors[errors.length] = "url";
	if (errors.length>0) response.json({ errors: errors });
	else {
		var found = false;
		for (var i=0; i<settings.fabricControllers.length; i++) {
			if (settings.fabricControllers[i].url==url) {
				found = true;
				settings.fabricControllers[i] = {
					name: name,
					url: url
				};
				break;
			}
		}
		if (!found) {
			settings.fabricControllers[settings.fabricControllers.length] = {
				name: name,
				url: url
			};
		}
		fs.writeFileSync(__dirname+settingsPath+'/settings.json', JSON.stringify(settings));
		response.json(settings);
	}
});

/**
 * Remove the server definition (fabric or edge controller) from the settings
 * based on the passed in url parameter
 */
app.delete("/api/server", function(request, response) {
	var user = request.session.user;
	if (hasAccess(user)) {
		var url = request.body.url;
		var edges = [];
		var fabrics = [];
		log(url);
		for (var i=0; i<settings.edgeControllers.length; i++) {
			log(settings.edgeControllers[i].url);
			if (settings.edgeControllers[i].url!=url) {
				edges[edges.length] = settings.edgeControllers[i];
			}
		}
		for (var i=0; i<settings.fabricControllers.length; i++) {
			log(settings.fabricControllers[i].url);
			if (settings.fabricControllers[i].url!=url) {
				fabrics[fabrics.length] = settings.fabricControllers[i];
			}
		}
		settings.fabricControllers = fabrics;
		settings.edgeControllers = edges;
		fs.writeFileSync(__dirname+settingsPath+'/settings.json', JSON.stringify(settings));

		response.json(settings);
	}
});

/**
 * Set the current controller to use
 */
app.post("/api/controller", function(request, response) {
	var urlToSet = request.body.url;
	if (!IsServerDefined(urlToSet)) response.json({error: errors.invalidServer });
	else serviceUrl = urlToSet;
});



/**------------- Server One Off Functions -------------**/

/**
 * Remove MFA from an identity
 */
app.delete("/api/mfa", function(request, response) {
	var user = request.session.user;
	if (hasAccess(user)) {
		var id = request.body.id;
		Authenticate(request).then((result) => {
			external.delete(serviceUrl+"/identities/"+id.trim()+"/mfa", {rejectUnauthorized: false, headers: { "zt-session": request.session.user } }, function(err, res, body) {
				if (err) {
					log("Error: "+JSON.stringify(body.err));
					response.json({error: err});
				} else {
					log("Success: "+JSON.stringify(body.data));
					response.json({success: "MFA Removed"});
				}
			});
		});
	}
});



/**------------- Server Search Section -------------**/


/**
 * Staight call for uncommon calls to the edge controller
 */
app.post("/api/call", function(request, response) {
	log("Calling: "+serviceUrl+"/"+request.body.url);
	Authenticate(request).then((results) => {
		external.get(serviceUrl+"/"+request.body.url, {json: {}, rejectUnauthorized: false, headers: { "zt-session": request.session.user } }, function(err, res, body) {
			if (err) {
				log("Error: "+JSON.stringify(err));
				response.json({ error: err });
			} else {
				if (body.error) HandleError(response, body.error);
				else if (body.data) {
					response.json( body );
				} else {
					body.data = [];
					response.json( body );
				}
			}
		});
	});
});

/**
 * Get the data from the edge controller based on the type of object and the 
 * defined search parameters
 */
app.post("/api/data", function(request, response) {
	var type = request.body.type;
	var paging = request.body.paging;
	GetItems(type, paging, request, response);
});

function DoCall(url, json, request, isFirst=true) {
	return new Promise(function(resolve, reject) {
		log("Calling: "+url+" "+isFirst+" "+request.session.user);
		external.get(url, {json: json, rejectUnauthorized: false, headers: { "zt-session": request.session.user } }, function(err, res, body) {
			if (err) {
				log("Server Error: "+JSON.stringify(err));
				resolve({ error: err });
			} else {
				if (body.error) {
					if (isFirst) {
						log("Re-authenticate User");
						Authenticate(request).then((results) => {
							DoCall(url, json, request, false).then((results) => {
								resolve(results);
							});
						});
					} else resolve(body);
				} else if (body.data) {
					log("Items: "+body.data.length);
					resolve(body);
				} else {
					log("No Items");
					body.data = [];
					resolve(body);
				}
			}
		});
	});
}

/**
 * Get the data from the edge controller
 * 
 * @param {The type of object to search for (identity, router, gateway, etc)} type 
 * @param {Paging request parameters (see edge controller API docs)} paging 
 * @param {The server request object} request 
 * @param {The server response object} response 
 */
function GetItems(type, paging, request, response) {
	if (request.body.url) {
		GetSubs(request.body.url.split("./").join(""), request.body.type, "", "", request, response);
	} else {
		var urlFilter = "";
		var toSearchOn = "name";
		if (paging.sort!=null) {
			if (paging.searchOn) toSearchOn = paging.searchOn;
			if (!paging.filter) paging.filter = "";
			if (paging.page!=-1) urlFilter = "?filter=("+toSearchOn+" contains \""+paging.filter+"\")&limit="+paging.total+"&offset="+((paging.page-1)*paging.total)+"&sort="+paging.sort+" "+paging.order;
			if (paging.params) {
				for (var key in paging.params) {
					urlFilter += ((urlFilter.length==0)?"?":"&")+key+"="+paging.params[key];
				}
			}
		}
		if (serviceUrl==null||serviceUrl.trim().length==0) response.json({error:"loggedout"});
		else {
			DoCall(serviceUrl+"/"+type+urlFilter, {}, request, true).then((results) => {
				if (results.error) HandleError(response, results.error);
				else response.json(results);
			});
		}
	}
}

/**
 * Get all of the sub objects associated with a parent objects, like all of the services defined in an AppWAN
 */
app.post("/api/dataSubs", function(request, response) {
	var id = request.body.id;
	var type = request.body.type;
	if (request.body.url) {
		var url = request.body.url.href.split("./").join("");
		DoCall(serviceUrl+"/"+url+"?limit=99999999&offset=0&sort=name ASC", {}, request, true).then((results) => {
			if (results.error) HandleError(response, results.error);
			else response.json({
				id: id,
				type: type,
				data: results.data
			});
		});
	} else response.json( {error: "Invalid Sub Data Url"});
});

/**
 * Get the data directly from a provided link from the json _links returned from
 * the edge controller parent data call.
 */
app.post("/api/subdata", function(request, response) {
	var url = request.body.url.split("./").join("");
	var id = request.body.id;
	var type = request.body.type;
	var parentType = request.body.name;
	GetSubs(url, type, id, parentType, request, response);
});

function GetSubs(url, type, id, parentType, request, response) {
	log("Calling: "+serviceUrl+"/"+url);
	Authenticate(request).then((results) => {
		external.get(serviceUrl+"/"+url, {json: {}, rejectUnauthorized: false, headers: { "zt-session": request.session.user } }, function(err, res, body) {
			if (err) response.json({ error: err });
			else {
				log("Returned: "+JSON.stringify(body));
				response.json({ 
					id: id,
					parent: parentType,
					type: type,
					data: body.data
				});
			}
		});
	});
}

/**
 * Get the data from a fabric controller based on the type of object
 */
app.post("/api/dataFabric", function(request, response) {
	var type = request.body.type;
	fabricUrl = request.body.url;
	GetFabricItems(type, response);
});

/**
 * Get the data from the fabric controller
 * 
 * @param {The type of data to get from the controller (e.g. links, routers, etc)} type 
 * @param {The server response object} response 
 */
function GetFabricItems(type, response) {
	var canCall = false; 
	for (var i=0; i<settings.fabricControllers.length; i++) {
		if (settings.fabricControllers[i].url==fabricUrl) {
			canCall = true;
			break;
		}
	}
	if (canCall) {
		log("Calling Fabric: "+type+" "+fabricUrl+"/ctrl/"+type);
		external.get(fabricUrl+"/ctrl/"+type, { json: {}, rejectUnauthorized: false }, function(err, res, body) {
			if (err) response.json({ error: "Unable to connect to fabric" });
			else {
				if (body.error) response.json( {error: body.error.message} );
				else if (body.data) response.json( body );
				else response.json( {error: "Unable to retrieve data"} );
			}
		});
	} else {
		fabricUrl = "";
		response.json({ data: [] });
	}
}




/**------------- Data Save Section -------------**/

function HandleError(response, error) {
	if (error.cause&&error.cause.code&&error.cause.code=="UNHANDLED") response.json({error:"loggedout"});
	else {
		if (error.cause&&error.causeMessage&&error.causeMessage.length>0) response.json({ error: error.causeMessage });
		else if (error.cause&&error.cause.message&&error.cause.message.length>0) response.json({ error: error.cause.message });
		else if (error.cause&&error.cause.reason&&error.cause.reason.length>0) response.json({ error: error.cause.reason });
		else if (error.message&&error.message.length>0) response.json({ error: error.message });
		else response.json({ error: error });
	}
}


/**
 * Save the object to the edge controller based on the provided type and passed in JSON 
 * parameters. If it exists, do an update, if not do a create operation.
 */
app.post("/api/dataSave", function(request, response) {
	if (serviceUrl==null||serviceUrl.length==0) response.json({error:"loggedout"});
	else {
		var saveParams = request.body.save;
		var additional = request.body.additional;
		var removal = request.body.removal;
		var type = request.body.type;
		var paging = request.body.paging;
		var method = "POST";
		var id = request.body.id;
		var url = serviceUrl+"/"+type;
		var user = request.session.user;
		var chained = false;
		if (request.body.chained) chained = request.body.chained;
		Authenticate(request).then((results) => {
			if (hasAccess(user)) {
				if (id&&id.trim().length>0) {
					method = "PATCH";
					url += "/"+id.trim();
					if (removal) {
						var objects = Object.entries(removal);
						if (objects.length>0) {
							for (var i=0; i<objects.length; i++) {
								var params = {};
								params.ids = objects[i][1];
								log("Delete:"+serviceUrl+"/"+type+"/"+id.trim()+"/"+objects[i][0]);
								log(JSON.stringify(params));
								external.delete(serviceUrl+"/"+type+"/"+id.trim()+"/"+objects[i][0], {json: params, rejectUnauthorized: false, headers: { "zt-session": request.session.user } }, function(err, res, body) {});
							}
						}
					}
				}
				log("Calling: "+url);
				log("Saving As: "+method+" "+JSON.stringify(saveParams));
				for (let prop in saveParams.data) {
					if (Array.isArray(saveParams.data[prop]) && saveParams.data[prop].length==0) {
						delete saveParams.data[prop];
					} else {
						//console.log("Not Array: "+prop+" "+saveParams.data[prop].length);
					}
				}
				console.log("Session: "+request.session.user);
				external(url, {method: method, json: saveParams, rejectUnauthorized: false, headers: { "zt-session": request.session.user } }, function(err, res, body) {
					if (err) HandleError(response, err);
					else {
						log(JSON.stringify(body));
						if (body.error) HandleError(response, body.error);
						else if (body.data) {
							if (additional) {
								var objects = Object.entries(additional);
								var index = 0;
								if (objects.length>0) {
									if (method=="POST") id = body.data.id;
									for (var i=0; i<objects.length; i++) {
										log("Body: "+JSON.stringify(body.data));
										log("Url: "+serviceUrl+"/"+type+"/"+id+"/"+objects[i][0]);
										log("Objects: "+JSON.stringify({ ids: objects[i][1] }));
										external.put(serviceUrl+"/"+type+"/"+id+"/"+objects[i][0], {json: { ids: objects[i][1] }, rejectUnauthorized: false, headers: { "zt-session": user } }, function(err, res, body) {
											index++;
											if (index==objects.length) {
												if (chained) response.json(body.data);
												else GetItems(type, paging, request, response);
											}
										});
									}
								} else {
									if (chained) response.json(body.data);
									else GetItems(type, paging, request, response);
								}
							} else {
								if (chained) response.json(body.data);
								else GetItems(type, paging, request, response);
							}
						} else response.json( {error: "Unable to save data"} );
					}	
				});
			}
		});
	}
});

/**
 * Save the data associated to one object to the parent object
 */
app.post("/api/subSave", function(request, response) {
	if (serviceUrl==null||serviceUrl.length==0) response.json({error:"loggedout"});
	else {
		var id = request.body.id;
		var type = request.body.type;
		var doing = request.body.doing;
		var parentType = request.body.parentType;
		var fullType = parentType+"/"+id+"/"+type;
		var url = serviceUrl+"/"+fullType;
		var saveParams = request.body.save;
		var user = request.session.user;
		Authenticate(request).then((results) => {
			if (hasAccess(user)) {
				log(url);
				log("Sub Saving As: "+doing+" "+JSON.stringify(saveParams));
				external(url, {method: doing, json: saveParams, rejectUnauthorized: false, headers: { "zt-session": request.session.user } }, function(err, res, body) {
					if (err) {
						log(err);
						response.json({ error: err });
					} else {
						log(JSON.stringify(body));
						GetItems(fullType, null, request, response);
					}
				});
			} else response.json({error:"loggedout"});
		});
	}
});

app.post("/api/verify", function(request, response) {
	if (serviceUrl==null||serviceUrl.length==0) response.json({error:"loggedout"});
	else {
		var id = request.body.id;
		var cert = request.body.cert;
		var url = serviceUrl+"/cas/"+id+"/verify";
		var user = request.session.user;
		if (hasAccess(user)) {
			external(url, {method: "POST", body: cert, rejectUnauthorized: false, headers: { "zt-session": request.session.user, "Content-Type": "text/plain" } }, function(err, res, body) {
				var result = JSON.parse(body);
				if (err) {
					log(err);
					response.json({ error: err });
				} else {
					if (result.error) response.json( {error: result.error.message} );
					else {
						log(JSON.stringify(body));
						response.json({ success: "Certificate Verified"});
					}
				}
			});
		} else response.json({error:"loggedout"});

	}
});

/*
 * Schema Dereference Tool
 */ 
app.post("/api/schema", function(request, response) {
	var data = request.body.schema;
	$RefParser.dereference(data, (err, schema) => {
		if (err) response.json({error:err});
		else response.json({data:schema});
	})	
});


/**------------- Data Deletion Section -------------**/




/**
 * Delete the specified list of objects from edge controller, and return the remaining 
 * list while retaining the last search filter properties.
 */
app.post("/api/delete", function(request, response) {
	var ids = request.body.ids;
	var type = request.body.type;
	var paging = request.body.paging;
	var user = request.session.user;

	var promises = [];

	ids.forEach(function(id) {
		promises.push(ProcessDelete(type, id, user, request));
	});
	
	Promise.all(promises).then(function(e) {
		GetItems(type, paging, request, response);
	}).catch(error => { 
		log("Catch: "+error.message);
		response.json({error: error.causeMessage});
	});
});

/**
 * Create the promise required to delete a specific object from the edge controller
 * 
 * @param {The type of object being deleted} type 
 * @param {The id of the object to delete} id 
 * @param {The specified user token deleting the object} user 
 */
function ProcessDelete(type, id, user, request, isFirst=true) {
	return new Promise(function(resolve, reject) {
		log("Delete: "+serviceUrl+"/"+type+"/"+id)
		external.delete(serviceUrl+"/"+type+"/"+id, {json: {}, rejectUnauthorized: false, headers: { "zt-session": user } }, function(err, res, body) {
			if (err) {
				log("Err: "+err);
				reject(err);
			} else {
				if (body) {
					log(JSON.stringify(body));
					if (body.error) {
						if (isFirst) {
							log("Re-authenticate User");
							Authenticate(request).then((results) => {
								ProcessDelete(type, id, user, request, false).then((results) => {
									resolve(results);
								});
							});
						} else reject(body.error);
					} else resolve(body.data);
				} else {
					reject("Controller Unavailable");
				}
			}
		});
	});
}



/**------------- Customized ZAC only resources Section -------------**/




/**
 * Get the specified resource and send it back to the client. Generally icons and custom images
 */
app.get('/resource/:resource/:name', function(request, response) {
    var name = request.params.name;
	var resource = request.params.resource;
	response.sendFile(path.resolve(__dirname+settingsPath+'/resources/'+resource+'/'+name));
});

/**
 * Save the customized resource to the system in their specific folder defined by the type of
 * resource being sent. Profile Images, Identity Images, Icons, etc
 */
app.post('/api/upload', function(request, response) {
	if (Object.keys(request.files).length == 0) return response.status(400).send("No Files Sent");

	var image = request.files.image;
	var resource = request.body.resource;
	var saveTo = __dirname+settingsPath+'/resources/'+resource+'/'+image.name;
	var fullUrl = '/resource/'+resource+'/'+image.name;
	
	image.mv(saveTo, function(error) {
		if (error) return response.status(500).send(error);
		else return response.send(fullUrl);
	});
});

/**
 * Get the list of all resources defined for a specific type
 */
app.post("/api/resources", function(request, response) {
	var type = request.body.type;
	GetResources(type, response);
});

/**
 * Returns the list of all resources defined for a specific type
 * 
 * @param {The Type of Resource (e.g. image, icon, etc)} type 
 * @param {*} response 
 */
function GetResources(type, response) {
	var toReturn = [];
	fs.readdir(__dirname+settingsPath+'/resources/'+type+'/', (err, files) => {
		if (err) response.json({ type: type, data: toReturn });
		else {
			files.forEach(file => {
				toReturn[toReturn.length] = "/resource/"+type+"/"+file;
			});
			response.json({ type: type, data: toReturn });
		}
	});	
}



/**------------- ZAC only specified tag Section -------------**/



/**
 * Get the current well defined list of tags that ZAC uses to display
 * UI defined tag definitions.
 */
app.post("/api/tags", function(request, response) {
	response.json(tags);
});

/**
 * Save the current tag data to the system.
 */
app.post("/api/tagSave", function(request, response) {
	var user = request.session.user;
	tags = request.body.tags;
	if (hasAccess(user)) {
		let data = JSON.stringify(tags);  
		fs.writeFileSync(__dirname+settingsPath+'/tags.json', data);
	}
	response.json(tags);
});



/**------------- ZAC only specified template Section -------------**/



/**
 * Get the current well defined list of templates that ZAC has defined
 */
app.post("/api/templates", function(request, response) {
	response.json(templates);
});

/**
 * Get the current well defined list of templates that ZAC has defined
 */
app.delete("/api/templates", function(request, response) {
	var ids = request.body.ids;

	var user = request.session.user;
	Authenticate(request).then((results) => {
		if (hasAccess(user)) {

			var newTemplates = [];

			for (var i=0; i<templates.length; i++) {
				if (!ids.includes(templates[i].id)) newTemplates.push(templates[i]);
			}

			templates = newTemplates;
			
			let data = JSON.stringify(templates);  
			fs.writeFileSync(__dirname+settingsPath+'/templates.json', data);

			response.json(templates);
		} else response.json(templates);
	});
});

/**
 * Save the current template data to the system.
 */
app.post("/api/template", function(request, response) {
	var user = request.session.user;
	Authenticate(request).then((results) => {
		if (hasAccess(user)) {
			if (serviceUrl==null||serviceUrl.length==0) response.json({error:"loggedout"});
			else {
				if (crypto.randomUUID) {
					var template = request.body.template;
					if (template.id == null) template.id = crypto.randomUUID();
					var found = false;
					for (var i=0; i<templates.length; i++) {
						if (template.id==templates[i].id) {
							templates[i] = template;
							found = true;
							break;
						}
					}
					if (!found) templates.push(template);
					let data = JSON.stringify(templates);  
					fs.writeFileSync(__dirname+settingsPath+'/templates.json', data);
				} else {
					growler.error("Please update your version of Node JS.")
				}
			}
			response.json(templates);
		}
	});
});

function GetTemplate(id) {
	for (var i=0; i<templates.length; i++) {
		if (templates[i].id==id) {
			return templates[i];
		}
	}
	return null;
}

app.post("/api/execute", function(request, response) {
	Authenticate(request).then((results) => {
		var template = GetTemplate(request.body.id);
		if (template) {
			var name = request.body.name.trim();
			var idNames = [];
			for (var i=0; i<template.profiles.length; i++) idNames.push(name+"-"+template.profiles[i]);
			CreateProfile(template, name, 0, request).then((result) => {
				var promises = [];
				for (var i=0; i<idNames.length; i++) promises.push(GetIdentity(idNames[i], request));
				Promise.all(promises).then((identities) => {
					var promises = [];
					var ids = [];
					for (var i=0; i<identities.length; i++) ids.push(identities[i].id);

					if (template.services.length>0) {
						var param = {
							name: name+"-Policy",
							type: "Dial",
							serviceRoles: [],
							identityRoles: [],
							postureCheckRoles: [],
							semantic: "AnyOf",
							tags: {}
						};
	
						for (var i=0; i<identities.length; i++) param.identityRoles.push("@"+identities[i].id);
						for (var i=0; i<template.services.length; i++) param.serviceRoles.push(template.services[i].id);

						promises.push(DoPost(serviceUrl+"/service-policies", param, request));
					}

					if (template.policies.length>0) {
						for (var i=0; i<template.policies.length; i++) promises.push(AppendServicePolicy(template.policies[i].id, ids, request));
					}

					Promise.all(promises).then((results) => {
						response.json({data: identities});
					});
				});
			});
		} else response.json({ error: "Template Not Found" });
	});
});

function DoPatch(url, params, request) {
	return new Promise(function(resolve, reject) {
		external.put(url, { json: params, rejectUnauthorized: false, headers: { "zt-session": request.session.user }}, (err, results, body) => {
			resolve(body);
		});
	});
}

function DoPost(url, params, request) {
	return new Promise(function(resolve, reject) {
		external.post(url, { json: params, rejectUnauthorized: false, headers: { "zt-session": request.session.user }}, (err, results, body) => {
			resolve(body);
		});
	});
}

function AppendServicePolicy(id, ids, request) {
	return new Promise(function(resolve, reject) {
		DoCall(serviceUrl+"/service-policies?filter=(id=\""+id.substr(1)+"\")&limit=1&offset=0&sort=createdAt desc", {}, request, true).then((result) => {
			if (result.data!=null&&result.data.length>0) {
				var policy = result.data[0];
				var patchPolicy = {
					name: policy.name,
					serviceRoles: policy.serviceRoles,
					identityRoles: policy.identityRoles,
					postureCheckRoles: policy.postureCheckRoles,
					semantic: policy.semantic,
					tags: policy.tags,
					type: policy.type
				};
				for (var i=0; i<ids.length; i++) patchPolicy.identityRoles.push("@"+ids[i]);
				DoPatch(serviceUrl+"/service-policies/"+id.substr(1), patchPolicy, request).then((results) => {
					resolve(true);
				});
			} else resolve(null);
		});
	});
}

function GetIdentity(name, request) {
	return new Promise(function(resolve, reject) {
		DoCall(serviceUrl+"/identities?filter=(name=\""+name+"\")&limit=1&offset=0&sort=createdAt desc", {}, request, true).then((results) => {
			if (results.data!=null&&results.data.length>0) resolve(results.data[0]);
			else resolve(null);
		});
	});
}

function CreateProfile(template, name, index, request) {
	return new Promise(function(resolve, reject) {
		if (index<template.profiles.length) {
			var profile = template.profiles[index];
			index++;
			var identity = {
				name: name+"-"+profile,
				type: "Device",
				isAdmin: false,
				enrollment: { 
					"ott": true
				}
			};
			if (template.roles != null && template.roles.length>0) identity.roleAttributes = template.roles;
			DoPost(serviceUrl+"/identities", identity, request).then((result) => {
				resolve(CreateProfile(template, name, index, request));

			});
			
		} else resolve(true);
	});
}


/**------------- Fabric Series Data Funcations -------------**/


/**
 * Get the averages from the series data in the system influx DB
 */
app.post("/api/average", function(request, response) {
	var core = request.body.core;
	var item = request.body.item;
	var readwrite = request.body.readwrite;
	var type = request.body.type;
	var id = request.body.id;
	var source = core;
	if (item.trim().length>0) source +="."+item;
	if (readwrite.trim().length>0) source +="."+readwrite;
	source +="."+type;
	var url = new URL(request.body.url);
	domain = url.hostname;
	
	const influx = new Influx.InfluxDB({
		host: domain,
		port: 8086,
		database: 'ziti'
	});

	var query = "select MEAN(mean) from \""+source+"\" WHERE source='"+id+"'";
	log(query);
	influx.query(query).then(result => {
		var avg = 0;
		if (result.length>0) avg = result[0].mean;
		response.json({ id: id, source: source+".average", data: avg });
	}).catch(error => {
		log(error);
		response.json({ error: error });
	});
});



/**
 * Get the mean value from the series data in the system influx DB
 */
app.post("/api/series", function(request, response) {
	var core = request.body.core;
	var item = request.body.item;
	var readwrite = request.body.readwrite;
	var type = request.body.type;
	var id = request.body.id;
	var source = core;
	if (item.trim().length>0) source +="."+item;
	if (readwrite.trim().length>0) source +="."+readwrite;
	source +="."+type;
	var url = new URL(request.body.url);
	domain = url.hostname;
	
	const influx = new Influx.InfluxDB({
		host: domain,
		port: 8086,
		database: 'ziti'
	});

	var query = "select MEAN(mean) from \""+source+"\" WHERE source='"+id+"' AND time > now() - 6d GROUP BY time(1d)";
	log(query);
	influx.query(query).then(result => {
		for (var i=0; i<result.length; i++) {
			log(moment(result[i].time).fromNow()+" "+result[i].mean);
		}
		response.json({ source: source, data: result });
	}).catch(error => {
		log(error);
		response.json({ error: error });
	});
});




/**------------- System Application Funcations -------------**/



/***
 * Send a message to NetFoundry to report errors or request features
 */
app.post("/api/message", function(request, response) {
	var type = request.body.type;
	var from = request.body.from;
	var message = request.body.message;
	var email = request.body.email;

	var params = {
		body: "A "+type+" message was set to you by "+from+" at "+(new Date())+" with email "+email+": "+message,
		subject: "NetFoundry Ziti - Message"
	};

	external.post("https://sendmail.netfoundry.io/message", {json: params, rejectUnauthorized: false }, function(err, res, body) {
		if (err) response.json({ errors: err });
		else {
			if (body.error) response.json({ errors: body.error });
			else response.json({ success: "Mail Sent" });
		}
	});
});


/***
 * Send a message to NetFoundry to report errors or request features
 */
app.post("/api/send", function(request, response) {
	external.post("https://sendmail.netfoundry.io/send", {json: request.body, rejectUnauthorized: false }, function(err, res, body) {
		if (err) response.json({ errors: err });
		else {
			if (body.error) response.json({ errors: body.error });
			else response.json({ success: "Mail Sent" });
		}
	});
});

/**
 * If debugging is turned on show the log on the console.
 * @param {The text of the message} message 
 */
function log(message) {
	if (isDebugging) console.log(message);
}




/**------------- Serve the Express Application -------------**/



/**
 * Serve the current app on the defined port
 * 
 * NOTE: if running Zitified, the 'port' is ignored. Instead, we
 * 		 we will be listening on the Ziti service name specified 
 * 		 by the ZITI_SERVICE_NAME env var.
 */
app.listen(port, function() {
	console.log("Ziti Server running on port "+port);
});

/**
 * If certificates are defined, setup an https redirection service
 */
if (fs.existsSync("./server.key")&&fs.existsSync("./server.chain.pem")) {
    log("Initializing TLS");
	try {
		const options = {
			key: fs.readFileSync("./server.key"),
			cert: fs.readFileSync("./server.chain.pem")
		};
		log("TLS initialized on port: " + portTLS);
		https.createServer(options, app).listen(portTLS);
	} catch(err) {
		log("ERROR: Could not initialize TLS!");
		throw err;
	}
}