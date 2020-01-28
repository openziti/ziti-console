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

/**
 * Command line Launch Settings
 */
const port = process.env.PORT||1408;
const portTLS = process.env.PORTTLS||8443;
const settingsPath = process.env.SETTINGS || '/../ziti/';

var serviceUrl = "";
var fabricUrl = "";
var headerFile = __dirname+"/assets/templates/header.htm";
var footerFile = __dirname+"/assets/templates/footer.htm";
var header = fs.readFileSync(headerFile, 'utf8');
var footer = fs.readFileSync(footerFile, 'utf8');
var isDebugging = true;

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
	access: "You Do Not Have Access To Perform This Operations"
}

/**
 * Define Express Settings
 */
const app = express();
app.use(cors());
app.use(helmet());
app.use(function(req, res, next) {
    res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdnjs.com https://apis.google.com https://ajax.googleapis.com https://fonts.googleapis.com https://www.google-analytics.com https://www.googletagmanager.com; object-src 'none'; form-action 'none'; frame-ancestors 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdnjs.com https://fonts.googleapis.com");
    return next();
});
app.use(bodyParser.json());
app.use(fileUpload());
app.use('/assets', express.static('assets'));
app.use(session({store: new sessionStore, secret: 'NetFoundryZiti', retries: 10, resave: true, saveUninitialized:true, ttl: 60000 }));

/**
 * Load configurable settings, or create the settings in place if they have never been defined
 */
if (!fs.existsSync(__dirname+settingsPath)) {
	fs.mkdirSync(__dirname+settingsPath);
}
if (!fs.existsSync(__dirname+settingsPath+'tags.json')) {
	fs.copyFileSync(__dirname+'/assets/data/tags.json', __dirname+settingsPath+'tags.json');
}
if (!fs.existsSync(__dirname+settingsPath+'settings.json')) {
	log("Settings not found");
	fs.copyFileSync(__dirname+'/assets/data/settings.json', __dirname+settingsPath+'settings.json');
}
if (!fs.existsSync(__dirname+settingsPath+'/resources')) {
	fs.mkdirSync(__dirname+settingsPath+'/resources');
	fse.copySync(__dirname+'/assets/resources/',__dirname+settingsPath+'/resources/');
}
var pages = JSON.parse(fs.readFileSync(__dirname+'/assets/data/site.json', 'utf8'));
var tags = JSON.parse(fs.readFileSync(__dirname+settingsPath+'tags.json', 'utf8'));
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
			fs.readFile(__dirname+page.page, 'utf8', function(err, data) {
				response.send(headerNow+data+footer);
			});
		} else {
			if (request.session.user==null||request.session.user=="") response.redirect("/login");
			else {
				if (Number(page.access)<=Number(request.session.authorization)) {
					var headerNow = header.split("{{title}}").join(page.title);
					headerNow = headerNow.split("{{auth}}").join(" loggedIn");
					fs.readFile(__dirname+page.page, 'utf8', function(err, data) {
						response.send(headerNow+data+footer);
					});
				} else response.redirect('/login');
			}
		}
	});
}

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
	serviceUrl = request.body.url;
	var params = {
		username: request.body.username,
		password: request.body.password
	}
	log("Connecting to: "+serviceUrl+"/authenticate?method=password");
	log("Posting: "+JSON.stringify(params));
	external.post(serviceUrl+"/authenticate?method=password", {json: params, rejectUnauthorized: false }, function(err, res, body) {
		if (err) {
			log(err);
			var error = "Server Not Accessible";
			if (err.code!="ECONNREFUSED") response.json( {error: err.code} );
			response.json( {error: error} );
		} else {
			if (body.error) {
				response.json( {error:body.error.message} );
			} else {
				if (body.data.session&&body.data.session.token) request.session.user = body.data.session.token;
				else request.session.user = body.data.token;
				log("Session: "+request.session.user);
				request.session.authorization = 100;
				response.json( {success: "Logged In"} );
			}
		}
	});
});




app.post('/api/version', function(request, response) {
	if (serviceUrl) {
		external.get(serviceUrl+"/version", {rejectUnauthorized: false}, function(err, res, body) {
			if (err) {
				log(err);
			} else {
				 var data = JSON.parse(body);
				 if (data&&data.data) response.json( {data: data.data} );
				 else response.json({});
			}
		});
	} else response.json({});
});

app.post("/api/settings", function(request, response) {
	response.json(settings);
});

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
		external.get(url+"/version", {rejectUnauthorized: false}, function(err, res, body) {
			if (err) {
				response.json( {error: "Edge Controller not Online"} );
			} else {
				if (body.error) {
					response.json( {error: "Invalid Edge Controller"} );
				} else {
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
			}
		});		
	}
});

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

app.post("/api/fabricSave", function(request, response) {
	var name = request.body.name.trim();
	var url = request.body.url.trim();
	if (url.endsWith('/')) url = url.substr(0, url.length-1);
	var errors = [];
	if (name.length==0) errors[errors.length] = "name";
	if (url.length==0) errors[errors.length] = "url";
	if (errors.length>0) {
		response.json({ errors: errors });
	} else {
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

app.post("/api/controller", function(request, response) {
	serviceUrl = request.body.url;
});

app.post("/api/reset", function(request, response) {
	if (serviceUrl==null||serviceUrl.length==0) response.json({error:"loggedout"});
	else {
		if (request.body.newpassword!=request.body.confirm) response.json({error: "Password does not match confirmation"});
		else {
			var params = {
				current: request.body.password,
				new: request.body.newpassword
			}
			log("Connecting to: "+serviceUrl+"/current-identity/updb/password");
			log("Posting: "+JSON.stringify(params));
			external.put(serviceUrl+"/current-identity/updb/password", {json: params, rejectUnauthorized: false, headers: { "zt-session": request.session.user }}, function(err, res, body) {
				if (err) {
					log(err);
					var error = "Server Not Accessible";
					if (err.code!="ECONNREFUSED") response.json( {error: err.code} );
					response.json( {error: error} );
				} else {
					if (body.error) {
						log(JSON.stringify(body.error));
						response.json( {error: body.error.message} );
					} else {
						response.json( {success: "Password Updated"} );
					}
				}
			});
		}
	}
});

app.post("/api/tags", function(request, response) {
	response.json(tags);
});

app.post("/api/tagSave", function(request, response) {
	var user = request.session.user;
	tags = request.body.tags;
	if (hasAccess(user)) {
		let data = JSON.stringify(tags);  
		fs.writeFileSync(__dirname+settingsPath+'/tags.json', data);
	}
	response.json(tags);
});

function extractHostname(url) {
    var hostname;
    if (url.indexOf("//") > -1) hostname = url.split('/')[2];
    else hostname = url.split('/')[0];
    hostname = hostname.split(':')[0];
    hostname = hostname.split('?')[0];
    return hostname;
}

app.get('/resource/:resource/:name', function(request, response) {
    var name = request.params.name;
	var resource = request.params.resource;
	response.sendFile(path.resolve(__dirname+settingsPath+'/resources/'+resource+'/'+name));
});

app.post('/api/upload', function(request, response) {
	if (Object.keys(request.files).length == 0) { 
		return response.status(400).send("No Files Sent");
	}
	var image = request.files.image;
	var resource = request.body.resource;

	var saveTo = __dirname+settingsPath+'/resources/'+resource+'/'+image.name;
	var fullUrl = '/resource/'+resource+'/'+image.name;
	
	image.mv(saveTo, function(error) {
		if (error) return response.status(500).send(error);
		else {
			return response.send(fullUrl);
		}
	});
});

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

app.post("/api/resources", function(request, response) {
	var type = request.body.type;
	GetResources(type, response);
});

app.post("/api/delete", function(request, response) {
	var ids = request.body.ids;
	var type = request.body.type;
	var paging = request.body.paging;
	var user = request.session.user;

	var promises = [];

	ids.forEach(function(id) {
		promises.push(ProcessDelete(type, id, user));
	});
	
	Promise.all(promises).then(function(e) {
		log("Then: "+e);
		GetItems(type, paging, request, response);
	}).catch(error => { 
		log("Catch: "+error.message);
		response.json({error: error.causeMessage});
	});
});

app.post("/api/dataSave", function(request, response) {
	if (serviceUrl==null||serviceUrl.length==0) response.json({error:"loggedout"});
	else {
		var saveParams = request.body.save;
		log("Saving: "+JSON.stringify(saveParams));
		var additional = request.body.additional;
		var removal = request.body.removal;
		var type = request.body.type;
		var paging = request.body.paging;
		var method = "POST";
		var id = request.body.id;
		var url = serviceUrl+"/"+type;
		var user = request.session.user;
		if (hasAccess(user)) {
			if (id&&id.trim().length>0) {
				method = "PUT";
				url += "/"+id.trim();
				//saveParams.tags = {};
				saveParams.permissions = [];
				log("removing");
				if (removal) {
					log("removing Now");
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
			log(url);
			log("Saving As: "+JSON.stringify(saveParams));
			external(url, {method: method, json: saveParams, rejectUnauthorized: false, headers: { "zt-session": request.session.user } }, function(err, res, body) {
				if (err) response.json({ error: err });
				else {
					log(JSON.stringify(body));
					if (body.error) {
						if (body.error.cause&&body.error.cause.message) response.json( {error: body.error.cause.message} );
						else response.json( {error: body.error} );
					} else if (body.data) {
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
										if (index==objects.length) GetItems(type, paging, request, response);
									});
								}
							} else GetItems(type, paging, request, response);
						} else {
							GetItems(type, paging, request, response);
						}
					} else {
						response.json( {error: "Unable to save data"} );
					}
				}	
			});
		}
	}
});

function ProcessAdditonal(type, id, index, objects, user) {
	return new Promise(function(res, reject) {
		var props = Object.entries(objects);
		var key = props[index][0];
		var values = props[index][1];
		index++;
		if (values.length>0) {
			var promise = ProcessSub(type, id, key, values, user);
			promise.then(function(results) {}, function(error) {}).finally(function(e) {
				if (index==props.length) {
					res("Complete");
				} else ProcessAdditonal(type, id, index, objects, user);
			});
		} else {
			if (index==props.length) res("Complete");
			else ProcessAdditonal(type, id, index, objects, user);
		}
	});
}

function ProcessDelete(type, id, user) {
	return new Promise(function(resolve, reject) {
		log("Delete: "+serviceUrl+"/"+type+"/"+id)
		external.delete(serviceUrl+"/"+type+"/"+id, {json: {}, rejectUnauthorized: false, headers: { "zt-session": user } }, function(err, res, body) {
			if (err) {
				log("Err: "+err);
				reject(err);
			} else {
				log(JSON.stringify(body));
				if (body.error) reject(body.error);
				else resolve(body.data);
			}
		});
	});
}

function ProcessSub(type, id, key, values, user) {
	return new Promise(function(resolve, reject) {
		log(serviceUrl+"/"+type+"/"+id+"/"+key);
		external.put(serviceUrl+"/"+type+"/"+id+"/"+key, {json: { ids: values }, rejectUnauthorized: false, headers: { "zt-session": user } }, function(err, res, body) {
			if (err) {
				log("It Errored:");
				log(JSON.stringify(err));
				reject(err);
			} else {
				log("It Errored:");
				log(JSON.stringify(body));
				resolve(body);
			}
		});
	});
}

app.post("/api/dataFabric", function(request, response) {
	var type = request.body.type;
	fabricUrl = request.body.url;
	GetFabricItems(type, response);
});

function GetFabricItems(type, response) {
	log("Calling Fabric: "+type+" "+fabricUrl+"/ctrl/"+type);
	external.get(fabricUrl+"/ctrl/"+type, { json: {}, rejectUnauthorized: false }, function(err, res, body) {
		if (err) {
			response.json({ error: "Unable to connect to fabric" });
		} else {
			if (body.error) {
				response.json( {error: body.error.message} );
			} else if (body.data) {
				response.json( body );
			} else {
				response.json( {error: "Unable to retrieve data"} );
			}
		}
	});
}

function GetItems(type, paging, request, response) {
	if (!paging.filter) paging.filter = "";
	if(serviceUrl==null||serviceUrl.trim().length==0) response.json({error:"loggedout"});
	else {
		log(serviceUrl+"/"+type+"?filter=(name contains \""+paging.filter+"\")&limit="+paging.total+"&offset="+((paging.page-1)*paging.total)+"&sort="+paging.sort+" "+paging.order);
		external.get(serviceUrl+"/"+type+"?filter=(name contains \""+paging.filter+"\")&limit="+paging.total+"&offset="+((paging.page-1)*paging.total)+"&sort="+paging.sort+" "+paging.order, {json: {}, rejectUnauthorized: false, headers: { "zt-session": request.session.user } }, function(err, res, body) {
			if (err) {
				log("Error: "+JSON.stringify(err));
				response.json({ error: err });
			} else {
				if (body.error) {
					response.json( {error: body.error.message} );
				} else if (body.data) {
					log("Items: "+body.data.length);
					response.json( body );
				} else {
					response.json( {error: "Unable to retrieve data"} );
				}
			}
		});
	}
}

app.post("/api/dataSubs", function(request, response) {
	var id = request.body.id;
	var type = request.body.type;
	if (request.body.url) {
		var url = request.body.url.href.split("./").join("");
		log("Calling: "+serviceUrl+"/"+url);
		external.get(serviceUrl+"/"+url+"?limit=99999999&offset=0&sort=name ASC", {json: {}, rejectUnauthorized: false, headers: { "zt-session": request.session.user } }, function(err, res, body) {
			if (err) response.json({ error: err });
			else {
				if (body.error) {
					if (body.error.cause&&body.error.cause.message) response.json( {error: body.error.cause.message} );
					else response.json( {error: body.error} );
				} else if (body.data) {
					log(body.data.length);
					response.json({
						id: id,
						type: type,
						data: body.data
					});
				} else {
					console.log(JSON.stringify(body));
					response.json( {error: "Unable to retrieve data"} );
				}
			}
		});
	} else response.json( {error: "Invalid Sub Data Url"});
});

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
	log(source);
	log(request.body.url)
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
	log(source);
	log(request.body.url)
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

app.post("/api/data", function(request, response) {
	var type = request.body.type;
	var paging = request.body.paging;
	GetItems(type, paging, request, response);
});

function AppendObject(obj, request, index) {
	if (obj.length==index) return obj;
	else {
		var total = 0;
		delete obj[index]._links.self;
		var props = Object.entries(obj[index]._links);
		props.forEach(entry => {
			var key = entry[0];
			var url = entry[1].href;
			var promise = GetSubData(url.split("./").join(""), request);
			promise.then(function(result) {
				obj[index][key] = result;
			}, function(error) {
				obj[index][key] = [];
			}).finally(function() {
				total++;
				if (total==props.length) {
					index++;
					if (index==obj.length) {
						return obj;
					} else {
						obj = AppendObject(obj, request, index);
					}
				}
			});
		});
	}
}

app.post("/api/subdata", function(request, response) {
	var url = request.body.url.split("./").join("");
	var id = request.body.id;
	var type = request.body.type;
	var parentType = request.body.name;
	external.get(url, {json: {}, rejectUnauthorized: false, headers: { "zt-session": request.session.user } }, function(err, res, body) {
		if (err) response.json({ error: err });
		else {
			response.json({ 
				id: id,
				parent: parentType,
				type: type,
				data: body.data
			});
		}
	});
});

function GetSubData(url, request) {
    return new Promise(function(resolve, reject) {
		external.get(serviceUrl+"/"+url, {json: {}, rejectUnauthorized: false, headers: { "zt-session": request.session.user } }, function(err, res, body) {
			if (err) reject(err);
			else resolve(body.data);
		});
	});
}

/***
 * Send a message to NetFoundry to report errors or requst features
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

	external.post("https://sendmail.netfoundry.io/send", {json: params, rejectUnauthorized: false }, function(err, res, body) {
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

/***
 ** Serve App
***/

app.listen(port, function() {
	log("Ziti Server running on port "+port);
});

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
		log("");
		throw err;
	}
}