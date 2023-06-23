import express from 'express';
import fs from 'fs';
import fse from 'fs-extra';
import path from 'path';
import session from 'express-session';
import sessionStoreFactory from 'session-file-store';
import fileUpload from 'express-fileupload';
import bodyParser from 'body-parser';
import cors from 'cors';
import external from 'request';
import moment from 'moment';
import Influx from 'influx';
import helmet from 'helmet';
import https from 'https';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import nodemailer from 'nodemailer';
import {fileURLToPath} from 'url';
import crypto from 'crypto';
import compression from 'compression';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sessionStore = sessionStoreFactory(session);

const loadModule = async (modulePath) => {
	try {
	  return await import(modulePath)
	} catch (e) {
	  throw new Error(`Unable to import module ${modulePath}`)
	}
}

var ziti;
const zitiServiceName = process.env.ZITI_SERVICE_NAME || 'zac';
const zitiIdentityFile = process.env.ZITI_IDENTITY_FILE;

try {
	ziti = await loadModule('@openziti/ziti-sdk-nodejs')
} catch (e) {
	if (typeof zitiIdentityFile !== 'undefined') {
		console.error(e);
		process.exit();
	}
}

var zitified = false;
if ((typeof zitiIdentityFile !== 'undefined') && (typeof zitiServiceName !== 'undefined')) {
	zitified = true;
}
if (zitified) {
	await ziti.init( zitiIdentityFile ).catch(( err ) => { process.exit(); }); // Authenticate ourselves onto the Ziti network using the specified identity file
}

const zacVersion = fs.readFileSync("./version.txt", 'utf8');

var serviceUrl = "";
var baseUrl = "";
var headerFile = __dirname+"/assets/templates/header.htm";
var footerFile = __dirname+"/assets/templates/footer.htm";
var header = fs.readFileSync(headerFile, 'utf8');
var footer = fs.readFileSync(footerFile, 'utf8');
var onlyDeleteSelfController = true;
var isDebugging = false;

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
var app = express();								// using raw  networking

if (zitified) {
	app = ziti.express( express, zitiServiceName );	// using Ziti networking
}
var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200
}
var helmetOptions = {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", 'www.googletagmanager.com', 'openstreetmap.org'],
        styleSrc: ["'self'", 'www.googletagmanager.com', 'www.google-analytics.com', 'openstreetmap.org', "'unsafe-inline'"],
        scriptSrc: ["'self'", 'www.googletagmanager.com', 'www.google-analytics.com', 'openstreetmap.org', "'unsafe-inline'"],
        imgSrc: ["'self'", 'www.googletagmanager.com', 'www.google-analytics.com', 'openstreetmap.org', 'b.tile.opernstreetmap.org', 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'www.googletagmanager.com', 'www.google-analytics.com', 'openstreetmap.org', 'ws:', 'wss:'],
        frameSrc: ["'self'", 'www.googletagmanager.com', 'openstreetmap.org'],
        frameAncestors: ["'self'", 'www.googletagmanager.com', 'openstreetmap.org'],
        mediaSrc: ["'self'", 'www.googletagmanager.com', 'openstreetmap.org', 'data:', 'blob:', 'https:'],
      },
    },
    frameguard: { action: 'SAMEORIGIN' },
	crossOriginEmbedderPolicy: false
};

app.use('/assets', express.static('assets', {
	maxAge: '31536000000' 
}));
app.use(cors(corsOptions));
app.use(helmet(helmetOptions));
app.use(compression());
app.use(function(req, res, next) {
    return next();
});
app.use(bodyParser.json());
app.use(fileUpload());
app.use(session({ 
	store: new sessionStore({}), 
	secret: 'NetFoundryZiti', 
	retries: 0, 
	resave: true, 
	saveUninitialized: true, 
	ttl: 60000, 
	logFn: () => {}
}));
app.use(function (req, res, next) {
	res.setHeader('X-XSS-Protection', '1; mode=block');
	next();
});

/**
 * Load configurable settings, or create the settings in place if they have never been defined
 */
var initial = JSON.parse(fs.readFileSync(path.join(__dirname,"assets","data","settings.json")));

var port = initial.port;
var portTLS = initial.portTLS;
var updateSettings = initial.update;
var settingsPath = initial.location;
var rejectUnauthorized = false;
var emailRegEx = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;

/**
 * Override Launch Settings
 */
if (process.env.SETTINGS) settingsPath = process.env.SETTINGS;
if (process.env.UPDATESETTINGS) updateSettings = process.env.UPDATESETTINGS;

for (var i=0; i<process.argv.length; i++) {
	if (process.argv[i]!=null) {
		if (process.argv[i].toLowerCase()=="debug") {
			isDebugging = true;
		} else {
			var options = process.argv[i].split('=');
			if (options.length==2) {
				if (options[0].toLowerCase()=="update"&&options[1]=="true") updateSettings=true;
				else if (options[0].toLowerCase()=="location") settingsPath=true;
			}
		}
	} 
}

if (settingsPath.indexOf("/")!=0) settingsPath = "/"+settingsPath;
if (!settingsPath.endsWith("/")) settingsPath = settingsPath+"/";
if (!fs.existsSync(__dirname+settingsPath)) {
	fs.mkdirSync(__dirname+settingsPath);
}
if (!fs.existsSync(__dirname+settingsPath+'tags.json')) {
	fs.copyFileSync(__dirname+'/assets/data/tags.json', __dirname+settingsPath+'tags.json');
}
if (!fs.existsSync(__dirname+settingsPath+'templates.json')) {
	fs.copyFileSync(__dirname+'/assets/data/templates.json', __dirname+settingsPath+'templates.json');
}
if (fs.existsSync(__dirname+settingsPath+'settings.json')&&updateSettings) {
	console.log("Updating Settings File - Backing Up Previous Settings");
	fs.renameSync(__dirname+settingsPath+'settings.json', __dirname+settingsPath+'settings.'+moment().unix());
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

console.log("Loading Settings File From: "+__dirname+settingsPath+'settings.json');
var settings = JSON.parse(fs.readFileSync(__dirname+settingsPath+'settings.json', 'utf8'));

if (settings.port && !isNaN(settings.port)) port = settings.port;
if (settings.portTLS && !isNaN(settings.portTLS)) portTLS = settings.portTLS;
if (settings.rejectUnauthorized && !isNaN(settings.rejectUnauthorized)) rejectUnauthorized = settings.rejectUnauthorized;


if (process.env.PORT) port = process.env.PORT;
if (process.env.PORTTLS) portTLS = process.env.PORTTLS;

for (var i=0; i<process.argv.length; i++) {
	var options = process.argv[i].split('=');
	if (options.length==2) {
		if (options[0].toLowerCase()=="port"&&!isNaN(options[1])) port = options[1];
		else if (options[0].toLowerCase()=="porttls"&&!isNaN(options[1])) portTLS = options[1];
		
		if (options[0].toLowerCase()=="editable") {
			if (options[1]=="true") settings.editable = true;
			else settings.editable = false;
		}
	}
}

var components = {};
var comFiles = fs.readdirSync(__dirname+"/assets/components");
for (let i=0; i<comFiles.length; i++) {
	var name = path.parse(comFiles[i]).name;
	components[name] = fs.readFileSync(__dirname+"/assets/components/"+comFiles[i], 'utf8');
}
components["canStyle"] = true;
if (settings.allowPersonal != null) components["canStyle"] = settings.allowPersonal;
components["style"] = ":root {\n";
if (settings.primary && settings.primary!="") components["style"] += "\t\t--primary: "+settings.primary+";\n";
else components["style"] += "\t\t--primary: #0027ab;\n";
if (settings.secondary && settings.secondary!="") components["style"] += "\t\t--secondary: "+settings.secondary+";\n";
else components["style"] += "\t\t--secondary: #fe0029;\n";
components["style"] += "\n\t}";
if (settings.logo && settings.logo!="") {
	components["style"] += "\n\n\t#CustomLogo {\n\t\tbackground-image: url("+settings.logo+");\n\t\tdisplay: inline-block;\n\t}";
}
console.log(settings);

for (var i=0; i<settings.edgeControllers.length; i++) {
	if (settings.edgeControllers[i].default) {
		serviceUrl = settings.edgeControllers[i].url;
		break;
	}
}

var transporter;

if (settings.mail && settings.mail.host && settings.mail.host.trim().length>0) {
	console.log("Setting up Mailer from "+settings.mail.host);
	transporter = nodemailer.createTransport(settings.mail);
}

/**
 * Setup static pages from configuration files defined in /data/site.json
 */
for (var i=0; i<pages.length; i++) {
	app.get(pages[i].url, function(request, response) {
		if (!baseUrl||baseUrl.trim().length==0&&request.session.baseUrl) baseUrl = request.session.baseUrl;
		if (!serviceUrl||serviceUrl.trim().length==0&&request.session.serviceUrl) serviceUrl = request.session.serviceUrl;
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
				var html = headerNow+data+footer;
				for (let prop in components) html = html.split('{{html.'+prop+'}}').join(components[prop]);
				response.send(html);
			});
		} else {
			if (request.session.user==null||request.session.user=="") response.redirect("/login");
			else {
				if (Number(page.access)<=Number(request.session.authorization)) {
					var headerNow = header.split("{{title}}").join(page.title);
					headerNow = headerNow.split("{{auth}}").join(" loggedIn");
					fs.readFile(__dirname+"/html"+page.page, 'utf8', function(err, data) {
						var html = headerNow+data+footer;
						for (let prop in components) html = html.split('{{html.'+prop+'}}').join(components[prop]);
						response.send(html);
					});
				} else response.redirect('/login');
			}
		}
	});
}



/**------------- Authentication Section -------------**/

app.get("/sso", (request, response) => {
	var controller = request.query.controller;
	var session = request.query.session;
	baseUrl = controller;
	request.session.baseUrl = baseUrl;
	GetPath().then((prefix) => {
		serviceUrl = baseUrl+prefix;
		request.session.serviceUrl = serviceUrl;
		request.session.user = session
		request.session.authorization = 100;
		console.log(baseUrl, request.session.user);
		response.redirect("/");
	}).catch((error) => {
		console.log(error);
		response.redirect("/login");
	});
});

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
	var urlToSet = request.body.url;
	if (!IsServerDefined(urlToSet)) response.json({error: errors.invalidServer });
	else {
		baseUrl = urlToSet;
		request.session.baseUrl = baseUrl;
		GetPath().then((prefix) => {
			serviceUrl = urlToSet+prefix;
			request.session.serviceUrl = serviceUrl;
			request.session.creds = {
				username: request.body.username,
				password: request.body.password
			};
			Authenticate(request).then((results) => {
				response.json(results);
			});
		}).catch((error) => {
			response.json({error: error});
		});
	}
});

function Authenticate(request) {
	return new Promise(function(resolve, reject) {
		if (!baseUrl||baseUrl.trim().length==0&&request.session.baseUrl) baseUrl = request.session.baseUrl;
		if (!serviceUrl||serviceUrl.trim().length==0&&request.session.serviceUrl) serviceUrl = request.session.serviceUrl;
		log("Connecting to: "+serviceUrl+"/authenticate?method=password");
		if (request.session.creds != null) {
			external.post(serviceUrl+"/authenticate?method=password", {json: request.session.creds , rejectUnauthorized: rejectUnauthorized }, function(err, res, body) {
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
		external.get(baseUrl+"/edge/management/v1/version", {rejectUnauthorized: rejectUnauthorized}, function(err, res, body) {
			try {
				var data = JSON.parse(body);
				resolve(data.data.apiVersions["edge-management"].v1.path);
			} catch (e) {
				log("Invalid Json Result on Version: "+e);
				reject("Invalid Management Api<br/><span style='font-size:12px; font-weight: normal;'>Please confirm the provided Edge Controller host:port is accurate.</span>");
			}
		});
	});
}

/**
 * Returned the version of the edge-controller server
 */
app.post('/api/version', function(request, response) {
	log("Checking Version: "+baseUrl+"/version");
	if (baseUrl) {
		external.get(baseUrl+"/version", {rejectUnauthorized: rejectUnauthorized}, function(err, res, body) {
			if (err) log(err);
			else {
				try {
					var data = JSON.parse(body);
					log("Version: "+body);
					if (data&&data.data) response.json( {data: data.data, zac: zacVersion, requireAuth: onlyDeleteSelfController, baseUrl: baseUrl} );
					else response.json({});
				} catch (e) {
					log("Invalid Json Result on Version: "+e);
					response.json({});
				}
			}
		});
	} else response.json({zac: zacVersion});
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
			external.get(serviceUrl+"/current-identity/authenticators?filter=method=\"updb\"", {rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user }}, function(err, res, body) {
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
							external.put(serviceUrl+"/current-identity/authenticators/"+id, {json: params, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user }}, function(err, res, body) {
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
 * Get Language File
 */
app.post("/api/language", (request, response) => {
	var locale = request.body.locale;
	if (fs.existsSync('assets/languages/'+locale+'.json')) {
		response.sendFile(path.resolve(__dirname+'/assets/languages/'+locale+'.json'));
	} else {
		response.sendFile(path.resolve(__dirname+'/assets/languages/en-us.json'));
	}
});

/**
 * Returns the current system settings
 */
app.post("/api/settings", function(rewwquest, response) {
	var toReturn = settings;
	delete toReturn.mail;
	delete toReturn.to;
	delete toReturn.from;
	delete toReturn.location;
	delete toReturn.editable;
	delete toReturn.update;
	delete toReturn.rejectUnauthorized;
	delete toReturn.port;
	delete toReturn.portTLS;
	response.json(toReturn);
});

/**
 * Save controller information to the settings file if the server exists
 */
app.post("/api/controllerSave", function(request, response) {
	var name = request.body.name.trim().replace(/[^a-zA-Z0-9 \-]/g, '');
	var url = request.body.url.trim();
	url = url.split('#').join('').split('?').join('');
	if (url.endsWith('/')) url = url.substr(0, url.length-1);
	var errors = [];
	if (name.length==0) errors[errors.length] = "name";
	if (url.length==0) errors[errors.length] = "url";
	if (errors.length>0) {
		response.json({ errors: errors });
	} else {
		var callUrl = url+"/edge/management/v1/version";
		log("Calling Controller: "+callUrl);
		external.get(callUrl, {rejectUnauthorized: rejectUnauthorized, timeout: 5000}, function(err, res, body) {
			if (err) {
				log("Add Controller Error");
				log(err);
				response.json( {error: "Edge Controller not Online", errorObj: err} );
			} else {
				try {
					var results = JSON.parse(body);
					if (body.error) {
						log("Add Controller Error");
						log(JSON.stringify(body.error));
						response.json( {error: "Invalid Edge Controller", errorObj: err} );
					} else {
						if (results.data.apiVersions.edge.v1 != null) {
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
							response.json({edgeControllers: settings.edgeControllers});
						} else {
							log("Controller: "+url+" Returned: "+JSON.stringify(results));
							response.json( {error: "Invalid Edge Controller", errorObj: results} );
						}
					}
				} catch (e) {
					log("Controller: "+url+" Returned "+(typeof body)+": "+body);
					response.json( {error: "Invalid Edge Controller", errorObj: body} );
				}
			}
		});		
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
		log(url+" "+baseUrl);
		if (baseUrl==url || !onlyDeleteSelfController) {
			for (var i=0; i<settings.edgeControllers.length; i++) {
				log(settings.edgeControllers[i].url);
				if (settings.edgeControllers[i].url!=url) {
					edges[edges.length] = settings.edgeControllers[i];
				}
			}
			settings.edgeControllers = edges;
			// fs.writeFileSync(__dirname+settingsPath+'/settings.json', JSON.stringify(settings));

			response.json(settings);
		} else response.json({error: "You must be logged into the controller to remove it"});
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
			external.delete(serviceUrl+"/identities/"+id.trim()+"/mfa", {rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {
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
		external.get(serviceUrl+"/"+request.body.url, {json: {}, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {
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

/**
 * Call a service if expired, try to reauthenticate and try again.
 * 
 * @param {The url of the service to call} url 
 * @param {The Json object to send} json 
 * @param {The Server Request Object} request 
 * @param {True if this is the first callattempt} isFirst 
 * @returns 
 */
function DoCall(url, json, request, isFirst=true) {
	return new Promise(function(resolve, reject) {
		log("Calling: "+url+" "+isFirst+" "+request.session.user);
		external.get(url, {json: json, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {
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
					log("Items Returned: "+body.data.length);
					resolve(body);
				} else {
					log("No Items");
					if (typeof body === 'string' || body instanceof String) {
						let toReturn = {
							error: body,
							data: []
						}
						resolve(toReturn);
					} else {
						body.data = [];
						resolve(body);
					}
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
		var noSearch = false;
		if (paging && paging.sort!=null) {
			if (paging.searchOn) toSearchOn = paging.searchOn;
			if (paging.noSearch) noSearch = true;
			if (!paging.filter) paging.filter = "";
			paging.filter = paging.filter.split('#').join('');
			if (noSearch) {
				if (paging.page!=-1) urlFilter = "?limit="+paging.total+"&offset="+((paging.page-1)*paging.total);
			} else {
				if (paging.page!=-1) urlFilter = "?filter=("+toSearchOn+" contains \""+paging.filter+"\")&limit="+paging.total+"&offset="+((paging.page-1)*paging.total)+"&sort="+paging.sort+" "+paging.order;
				if (paging.params) {
					for (var key in paging.params) {
						urlFilter += ((urlFilter.length==0)?"?":"&")+key+"="+paging.params[key];
					}
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
		external.get(serviceUrl+"/"+url, {json: {}, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {
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

app.post("/api/jwt", function(request, response) {
	var id = request.body.id;
	var type = request.body.type;
	Authenticate(request).then((results) => {
		var url = serviceUrl+"/"+type+"/"+id+"/jwt";
		log("Calling: "+url);
		external.get(url, {json: {}, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {
			response.json({id: id, jwt: body});
		});
	});
});



/**------------- Data Save Section -------------**/

function HandleError(response, error) {
	log(error);
	if (error.cause&&error.causeMessage&&error.causeMessage.length>0) response.json({ error: error.causeMessage, errorObj: error });
	else if (error.cause&&error.cause.message&&error.cause.message.length>0) response.json({ error: error.cause.message, errorObj: error });
	else if (error.cause&&error.cause.reason&&error.cause.reason.length>0) response.json({ error: error.cause.reason, errorObj: error });
	else if (error.message&&error.message.length>0) response.json({ error: error.message, errorObj: error });
	else response.json({ error: error, errorObj: error });
}

/**
 * Quick create a simple service and return what occurred
 */
app.post("/api/service", async function(request, response) {
	if (serviceUrl==null||serviceUrl.length==0) response.json({error:"loggedout"});
	else {
		var name = request.body.name;
		var protocol = request.body.protocol;
		var host = request.body.host;
		var port = Number(request.body.port);
		var encrypt = request.body.encrypt;
		var zitiHost = request.body.zitiHost;
		var zitiPort = Number(request.body.zitiPort);
		var hosted = request.body.hosted;
		var access = request.body.access;

		var user = request.session.user;

		var rootName = name.trim().replace(/[^a-z0-9 ]/gi, '').split(' ').join('-');
		var clientName = rootName+"-Client";
		var serverName = rootName+"-Server";
		var dialPolicyName = rootName+"-DialPolicy";
		var bindPolicyName = rootName+"-BindPolicy";

		var serverConfig = {
			hostname: host,
			port: port,
			protocol: protocol
		};
		var clientConfig = {
			hostname: zitiHost,
			port: zitiPort
		};

		var clientConfigId = await GetConfigId(request, response, serviceUrl, user, "ziti-tunneler-client.v1");
		var serverConfigId = await GetConfigId(request, response, serviceUrl, user, "ziti-tunneler-server.v1");
		
		var serverData = await CreateConfig(request, response, user, serviceUrl, serverConfigId, serverName, serverConfig);
		var clientData = await CreateConfig(request, response, user, serviceUrl, clientConfigId, clientName, clientConfig);
		var serverId = serverData.id;
		var clientId = clientData.id;

		var serviceData = await CreateService(request, response, serviceUrl, user, name, encrypt, serverId, clientId);		
		var serviceId = serviceData.id;
		
		var bindData = await CreateServerPolicy(request, response, serviceUrl, user, bindPolicyName, "@"+serviceId, hosted);
		var dialData = await CreateClientPolicy(request, response, serviceUrl, user, dialPolicyName, "@"+serviceId, access);
		
		var bindId = bindData.id;
		var dialId = dialData.id;

		var toReturn = {
			data: [],
			cli: [],
			services: []
		};
		console.log(clientId+" "+serverId+" "+serverConfigId+" "+clientConfigId+" "+bindId+" "+dialId);
	
		var logs = [];
		logs.push({name: serverName, id: serverId, type: "Config"});
		logs.push({name: clientName, id: clientId, type: "Config"});
		logs.push({name: name, id: serviceId, type: "Service"});
		logs.push({name: bindPolicyName, id: bindId, type: "Policy"});
		logs.push({name: dialPolicyName, id: dialId, type: "Policy"});
		toReturn.data = logs;
		toReturn.cli.push(serverData.cli);
		toReturn.cli.push(clientData.cli);
		toReturn.cli.push(serviceData.cli);
		toReturn.cli.push(bindData.cli);
		toReturn.cli.push(dialData.cli);

		toReturn.services.push(serverData.service);
		toReturn.services.push(clientData.service);
		toReturn.services.push(serviceData.service);
		toReturn.services.push(bindData.service);
		toReturn.services.push(dialData.service);
		response.json(toReturn);
	}
});

async function CreateClientPolicy(request, respone, url, user, name, serviceId, access) {
	return new Promise(function(resolve, reject) {
		if (hasAccess(user)) {
			Authenticate(request).then((results) => {
				if (hasAccess(user)) {
					var params = {
						name: name,
						type: "Dial",
						semantic: "AnyOf",
						serviceRoles: [serviceId],
						identityRoles: access
					};
					log("Saving As: POST "+JSON.stringify(params));
					external(url+"/service-policies", {method: "POST", json: params, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {
						log(JSON.stringify(body));
						let cli = "ziti edge create service-policy '"+name+"' Dial --service-roles '"+serviceId+"' --identity-roles '"+access.toString()+"'";
						let serviceCall = {
							url: url+"/service-policies",
							params: params
						};
						var item = {
							id: "",
							cli: cli,
							service: serviceCall
						}
						if (body.data) item.id = body.data.id;
						resolve(item);
					});
				}
			});
		}
	});
}

async function CreateServerPolicy(request, respone, url, user, name, serviceId, hosted) {
	return new Promise(function(resolve, reject) {
		if (hasAccess(user)) {
			Authenticate(request).then((results) => {
				if (hasAccess(user)) {
					var params = {
						name: name,
						type: "Bind",
						semantic: "AnyOf",
						serviceRoles: [serviceId],
						identityRoles: hosted
					};
					log("Saving As: POST "+JSON.stringify(params));
					external(url+"/service-policies", {method: "POST", json: params, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {
						log(JSON.stringify(body));
						let cli = "ziti edge create service-policy '"+name+"' Bind --semantic AnyOf --service-roles '"+serviceId+"' --identity-roles '"+hosted.toString()+"'";
						let serviceCall = {
							url: url+"/service-policies",
							params: params
						};
						var item = {
							id: "",
							cli: cli,
							service: serviceCall
						}
						if (body.data) item.id = body.data.id;
						resolve(item);
					});
				}
			});
		}
	});
}

async function CreateService(request, respone, url, user, name, encrypt, serverId, clientId) {
	return new Promise(function(resolve, reject) {
		Authenticate(request).then((results) => {
			if (hasAccess(user)) {
				var params = {
					name: name,
					configs: [serverId, clientId],
					encryptionRequired: encrypt
				};
				log("Saving As: POST "+JSON.stringify(params));
				external(url+"/services", {method: "POST", json: params, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {
					log(JSON.stringify(body));
					let cli = "ziti edge create service '"+name+"' --configs '"+serverId+","+clientId+"'";
					let serviceCall = {
						url: url+"/services",
						params: params
					};
					var item = {
						id: "",
						cli: cli,
						service: serviceCall
					}
					if (body.data) item.id = body.data.id;
					resolve(item);
				});
			}
		});
	});
}

async function GetConfigId(request, response, url, user, type) {
	return new Promise(function(resolve, reject) {
		Authenticate(request).then((results) => {
			if (hasAccess(user)) {
				DoCall(url+"/config-types?filter=(name = \""+type+"\")&limit=1", {}, request, true).then((results) => {
					console.log("Config Returned");
					console.log(JSON.stringify(results));
					resolve(results.data[0].id);
				});
			}
		});
	});
}

async function CreateConfig(request, response, user, url, configId, name, data, index) {
	return new Promise(function(resolve, reject) {
		if (!index) index = 0;
		Authenticate(request).then((results) => {
			if (hasAccess(user)) {
				var params = {
					name: name+((index>0)?"-"+index:""),
					configTypeId: configId,
					data: data
				};
				log("Saving As: POST "+JSON.stringify(params));
				external(url+"/configs", {method: "POST", json: params, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {
					log(JSON.stringify(body));
					index++;
					if (body.error) resolve(CreateConfig(request, response, user, url, configId, name, data, index));
					else if (body.data) {
						let cli = "ziti edge create config '"+params.name+"' '"+configId+"' '"+JSON.stringify(data).split('"').join('\\"')+"'";
						let serviceCall = {
							url: url+"/configs",
							params: params
						};
						var item = {
							id: "",
							cli: cli,
							service: serviceCall
						}
						if (body.data) item.id = body.data.id;
						resolve(item);						
					} else resolve(CreateConfig(request, response, user, url, configId, name, data, index));
				});
			}
		});
	});
}

/**
 * Quick create a simple identity and return the new identity
 */
app.post("/api/identity", function(request, response) {
	if (serviceUrl==null||serviceUrl.length==0) response.json({error:"loggedout"});
	else {
		log("Simple Identity Creation");
		var name = request.body.name;
		var user = request.session.user;
		var url = serviceUrl+"/identities";
		var params = {
			enrollment: {
				ott: true
			},
			isAdmin: false,
			name: name,
			type: "Device"
		}
		if (request.body.roles) params.roleAttributes = request.body.roles
		Authenticate(request).then((results) => {
			if (hasAccess(user)) {
				log("Saving As: POST "+JSON.stringify(params));
				external(url, {method: "POST", json: params, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {
					log(JSON.stringify(body));
					if (body.error) HandleError(response, body.error);
					else if (body.data) {
						var id = body.data.id;
						DoCall(serviceUrl+"/identities/"+id, {}, request, true).then((results) => {
							if (results.error) HandleError(response, results.error);
							else {
								results.cli = [];
								results.services = [];
								
								let cli = "ziti edge create identity device \'"+name+"\'";
								if (request.body.roles) cli += " -a \'"+request.body.roles.toString()+"\'";
								results.cli.push(cli);

								let serviceCall = {
									url: url,
									params: params
								};
								results.services.push(serviceCall);

								response.json(results);
							}
						});
					} else response.json( {error: "Unable to save data"} );
				});
			}
		});
	}
});


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
								external.delete(serviceUrl+"/"+type+"/"+id.trim()+"/"+objects[i][0], {json: params, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {});
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
				external(url, {method: method, json: saveParams, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {
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
										external.put(serviceUrl+"/"+type+"/"+id+"/"+objects[i][0], {json: { ids: objects[i][1] }, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": user } }, function(err, res, body) {
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
				external(url, {method: doing, json: saveParams, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user } }, function(err, res, body) {
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
			external(url, {method: "POST", body: cert, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user, "Content-Type": "text/plain" } }, function(err, res, body) {
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

	log("Deleting: "+type+" "+ids.join(','));
	DoDelete(type, ids, user, request, 0).then((results) => {
		GetItems(type, paging, request, response);
	}).catch((error) => {
		log("Error: "+JSON.stringify(error));
		HandleError(response, error);
	});

	/*
	var promises = [];

	ids.forEach(function(id) {
		promises.push(ProcessDelete(type, id, user, request));
	});
	
	Promise.all(promises).catch((error) => { 
		log("Catch: "+JSON.stringify(error));
		response.json({error: error.causeMessage});
	}).then(function(e) {
		GetItems(type, paging, request, response);
	});
	*/
});

function DoDelete(type, ids, user, request, index) {
	return new Promise(function(resolve, reject) {
		if (index>=ids.length) resolve(true);
		else {
			var id = ids[index];
			index++;
			ProcessDelete(type, id, user, request, true, index).then((result) => {
				resolve(DoDelete(type, ids, user, request, index));
			}).catch((error) => {
				log("Reject: "+JSON.stringify(error));
				reject(error);
			});
		}
	});
}

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
		external.delete(serviceUrl+"/"+type+"/"+id, {json: {}, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": user } }, function(err, res, body) {
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
								}).catch((error) => {
									log("Reject After Auth: "+JSON.stringify(error));
									reject(error);
								});
							});
						} else reject(body.error);
					} else resolve(body.data);
				} else {
					log("Reject: No Controller");
					reject({ message: "Controller Unavailable" });
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
		external.put(url, { json: params, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user }}, (err, results, body) => {
			resolve(body);
		});
	});
}

function DoPost(url, params, request) {
	return new Promise(function(resolve, reject) {
		external.post(url, { json: params, rejectUnauthorized: rejectUnauthorized, headers: { "zt-session": request.session.user }}, (err, results, body) => {
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
	
	if (transporter) {
		var body = params.body;
		var subject = params.subject;
		var from = 'ziggy@zac.openziti.org';
		var to = 'ziggy@zac.openziti.org';
		if (settings.from && settings.from.match(emailRegEx)) from = settings.from;
		if (settings.to && settings.to.match(emailRegEx)) to = settings.to;
		var mailOptions = {
			from: 'Ziggy <'+from+'>',
			to: "jeremy.tellier@netfoundry.io",
			subject: subject,
			html: body
		};
		log(JSON.stringify(mailOptions));
		transporter.sendMail(mailOptions, function(error, info){
			if (error) {
				log("Error: "+error);
				response.json({ error: error });
			} else {
				if (info) {
					log("Info: "+JSON.stringify(info));
					response.json({ complete: info });
				}
			}
		});
	} else {
		external.post("https://sendmail.netfoundry.io/message", {json: params, rejectUnauthorized: rejectUnauthorized }, function(err, res, body) {
			if (err) response.json({ errors: err });
			else {
				if (body.error) response.json({ errors: body.error });
				else response.json({ success: "Mail Sent" });
			}
		});
	}
});


/***
 * Send a message to NetFoundry to report errors or request features
 */
app.post("/api/send", function(request, response) {
	if (transporter) {
		var codes = request.body.codes;
		var attachements = request.body.attachments;

		if (attachements.length!=codes.length) response.json({ complete: "Message Sent" });
		else {
			var html = '';
			for (var i=0; i<codes.length; i++) {
				if (codes[i].indexOf("data:image/png;base64")==0) {
					var name = attachements[i].filename.split('.jwt').join('');
					html += '<h3>'+name+'</h3>';
					html += '<img alt="QR '+name+'" src="'+codes[i]+'" style="display: block;"/>';
				}
			}
			var body = '<html><body><center><h2>The Following Open Ziti Identities have been created for you</h2><div style="position:relative; display: inline-block">'+html+'</div></center></body></html>';
			var subject = request.body.subject;
			var to = request.body.to;
			var from = 'ziggy@zac.openziti.org';
			if (settings.from && settings.from.match(emailRegEx)) from = settings.from;
			var mailOptions = {
				from: 'Ziggy <'+from+'>',
				to: [to],
				subject: subject,
				text: "Open Ziti Identities Attached",
				html: body,
				list: {
					help: from+'?subject=help',
					unsubscribe: {
						comment: 'Account'
					}
				}
			};
			if (request.body.attachments) {
				mailOptions.attachments = request.body.attachments;
			}
			log(JSON.stringify(mailOptions));
			transporter.sendMail(mailOptions, function(error, info){
				if (error) {
					log("Error: "+error);
					response.json({ error: error });
				} else {
					if (info) {
						log("Info: "+JSON.stringify(info));
						response.json({ complete: "Message Sent"  });
					}
				}
			});
		}
	} else {
		external.post("https://sendmail.netfoundry.io/send", {json: request.body, rejectUnauthorized: rejectUnauthorized }, function(err, res, body) {
			if (err) response.json({ errors: err });
			else {
				if (body.error) response.json({ errors: body.error });
				else response.json({ success: "Message Sent" });
			}
		});
	}
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
StartServer(port);
let maxAttempts = 100;
app.use((err, request, response, next) => {
	if (err) {
		if (err.toString().indexOf("Error: EPERM: operation not permitted, rename")==0) {
			// Ignoring chatty session-file warnings
		} else console.log(err);
		next();
	} else {  
		next();
	} 
});

function StartServer(startupPort) {
	if (zitified) {
		app.listen(undefined, function() {
			console.log("Ziti Admin Console is now listening for incoming Ziti Connections");
		});
	} else {
		app.listen(startupPort, function() {
			console.log("Ziti Admin Console is now listening on port "+startupPort);
		}).on('error', function(err) {
			if (err.code=="EADDRINUSE") {
				maxAttempts--;
				console.log("Port "+startupPort+" In Use, Attempting new port "+(startupPort+1));
				startupPort++;
				if (maxAttempts>0) StartServer(startupPort);
			} else {
				console.log("All Ports in use "+port+" to "+startupPort);
			}
		});
	}
}

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
		console.log("TLS initialized on port: " + portTLS);
		https.createServer(options, app).listen(portTLS);
	} catch(err) {
		log("ERROR: Could not initialize TLS!");
		throw err;
	}
}
