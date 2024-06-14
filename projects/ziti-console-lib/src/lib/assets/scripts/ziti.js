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
var page;

$(document).ready(function(e) {
	if (window.isSPA) {
		return;
	}
	app.init();
});

var app = {
	keys: [],
	isDirty: false,
	identityRoles: null,
	hostedRoles: null,
	idRoles: null,
	typedIn: false,
	init: function() {
		app.events();
		app.setupLock();
		app.binding();
		if (locale) locale.init();
		if (page) page.init();
		if (header) header.init();
		if (user) user.init();
		if (modal) modal.init();
		if (growler) growler.init();
		if (dragging) dragging.init();
		if (tags) tags.init();
		if (settings) settings.init();
		if (restrictions) restrictions.init();
		if (commands) commands.init();
		$('*[data-go="'+window.location.pathname+'"]').addClass("selected");

		if (window.location.pathname!="/login") {
			app.identityRoles = new MultiSelect("IdRoles", 10, true);
			app.identityRoles.addSource(new SelectSource("identity-role-attributes", "", "id")); 
			app.identityRoles.init();
	
			app.hostedRoles = new MultiSelect("WhereHosted", 10, true);
			app.hostedRoles.appendHash = true;
			app.hostedRoles.addSource(new SelectSource("identities", "@", "name", "role")); 
			app.hostedRoles.addSource(new SelectSource("identity-role-attributes", "#", "id")); 
			app.hostedRoles.init();
	
			app.idRoles = new MultiSelect("WhoAccesses", 10, true);
			app.idRoles.appendHash = true;
			app.idRoles.addSource(new SelectSource("identities", "@", "name", "role")); 
			app.idRoles.addSource(new SelectSource("identity-role-attributes", "#", "id")); 
			app.idRoles.init();
		}
 	},
	events: function() {
		if (localStorage.getItem("hideTags")=="yes") $("#TagArea").addClass("hidden");
		$("input").on("keyup", app.enter);
		$("select").on("keyup", app.enter);
		$(".lock").click(app.lock);
		$(".toggle").click(app.toggle);
		$("main").mouseover(app.hideNav);
		$("body").keyup(app.keypress);
		$("input").blur(app.trim);
		$("#ClearNotificationsButton").click(app.clearNotifications);
		$(".modal").find("input").change((e) => { app.isDirty = true; });
		$(".copy").click(app.copy);
		context.addListener(settings.name, app.settingsReturned);
		context.addListener("version", app.versionReturned);
		$("#SServiceName").keyup(app.name);
		$("#SServiceHost").keyup(app.typed);
		$("#CreateButton").click(app.createSService);
		$("#CreateIdButton").click(app.createId);
		$("#IdentityDownload").click(app.download);
		$("#DoneIdButton").click(app.idReset);
		$("#DoneServiceButton").click(app.idReset);
		$("#InlineAddIdentityButton").click(app.showInlineId);
		$("#InlineAddServiceButton").click(app.showInlineService);
	},
	copy: function(e) {
		var copyField = $("#"+$(e.currentTarget).data("copy"));
		if (copyField.is("input")) {
			var copied = copyField.val();
			navigator.clipboard.writeText(copied);
			growler.info(copied+" - copied to clipboard")
		} else {
			if (copyField.attr("id")=="ApiJson") {
				var copied = commands.params.getValue();
				navigator.clipboard.writeText(copied);
				growler.info("JSON copied to clipboard");
			} else if (copyField.attr("id")=="ApiParams") {
				var copied = page.apiParams.getValue();
				navigator.clipboard.writeText(copied);
				growler.info("JSON copied to clipboard");
			}

		}
	},
	showInlineService: function() {
		if (!$("#SimpleEncryptionRequired").hasClass("on")) $("#SimpleEncryptionRequired").addClass("on");
		$("#Select1").hide();
		$("#InlineServiceArea").show();
	},
	showInlineId: function() {
		app.identityRoles.val([]);
		$("#IdName").val("");
		$("#Identity2").hide();
		$("#Identity1").show();
		$("#Select1").hide();
		$("#InlineIdentityArea").show();
	},
	idReset: function(e) {
		app.identityRoles.val([]);
		$("#IdName").val("");
		$("#Identity2").hide();
		$("#Identity1").hide();
		$("#Select1").show();
		modal.close();
	},
	createSService: function(e) {
		$("#Service1").hide();
		$("#SServiceLoader").show();
		var params = {
			name: $("#SServiceName").val(),
			protocol: $("#HostedProtocol").val(),
			host: $("#HostedHost").val(),
			port: $("#HostedPort").val(),
			encrypt: $("#SimpleEncryptionRequired").hasClass("on"),
			zitiHost: $("#HowTo").val(),
			zitiPort: $("#HowToPort").val(),
			hosted: app.hostedRoles.val(),
			access: app.idRoles.val(),
		};
		service.call("service", params, (e) => {
			$("#SServiceLoader").hide();
			if (e.error) {
				growler.error(e.error);
				$("#Service1").show();
			} else {
				let html = "";
				let lastTitle = "";
				for (let i=0; i<e.data.length; i++) {
					let log = e.data[i];
					if (log.type!=lastTitle) {
						html += '<label>'+app.validate(log.type)+'</label>';
						lastTitle = log.type;
					}
					html += '<div class="grid split"><div>'+app.validate(log.name)+'</div><div>'+app.validate(log.id)+'</div></div>';
				}
				$("#ServiceHappen").html(html);
				$("#Service2").show();
				commands.set(e.services, e.cli);
			}
		});

	},
	createId: function(e) {
		$("#IdentityLoader").show();
		$("#Identity1").hide();
		var params = {
			name: $("#IdName").val(),
			roles: app.identityRoles.val()
		}
		service.call("identity", params, (e) => {
			$("#IdentityLoader").hide();
			if (e.error) {
				growler.error(e.error);
				$("#Identity1").show();
			} else {
				app.lastId = e.data;
				$("#Identity2").show();
				app.genQR();
				commands.set(e.services, e.cli);
			}
		});
	},
	download: function(e) {
		var identity = app.lastId;
		var jwt = "";
		if (identity&&identity.enrollment&&identity.enrollment.ott&&identity.enrollment.ott.jwt) jwt = identity.enrollment.ott.jwt;
		else jwt = identity.enrollment.updb.jwt;
		var name = identity.name.split(" ").join("");
		var element = document.createElement('a');
		element.setAttribute('href', 'data:application/ziti-jwt;charset=utf-8,' + encodeURIComponent(jwt));
		element.setAttribute('download', name+".jwt");
		element.style.display = 'none';
		document.body.appendChild(element);
		element.click();
		document.body.removeChild(element);
	},
	genQR: function(e) {
		var identity = app.lastId;
		var jwt = "";
		if (identity&&identity.enrollment&&identity.enrollment.ott&&identity.enrollment.ott.jwt) jwt = identity.enrollment.ott.jwt;
		else jwt = identity.enrollment.updb.jwt;
		$("#QRCode").html("");
		new QRCode("IdentityQrCode", {
			text: encodeURIComponent(jwt),
			width: 300,
			height: 300,
			colorDark : "#000000",
			colorLight : "#ffffff",
			correctLevel : QRCode.CorrectLevel.M
		});
	},
	typed: function(e) {
		app.typedIn = true;
	},
	name: function(e) {
		if (!app.typedIn) {
			var currentUrl = $("#SServiceName").val().trim().split(' ').join('').replace(/[^a-z0-9]/gi, '').toLowerCase();
			$("#HowTo").val(currentUrl+".ziti");
		}
	},
	keypress: function(e) {
		if (e.keyCode === 27) {
			if (!$(':focus').is("select")) {
				if (app.isDirty) {
					if (confirm(locale.get("ConfirmClose"))) modal.close();
				} else modal.close();
			}
		}
		if (e.keyCode == 13) {
			if ($("#ConfirmModal").hasClass("open")) {
				$("#YesButton").click();
			}
		} else app.isDirty = true;
	},
	trim: function(e) {
		$(e.currentTarget).val($(e.currentTarget).val().trim());
	},
	validate: function(val) {
		return sanitizeHtml(val);
	},
	postLoad: function() {
		$(".selector").off("click");
		$(".selector").click(app.select);
		$(".dots").click(app.dots);
		if (window.location.href.endsWith("#a")) page.add();
		$(".col").each(function(i, obj) {
			var value = $(obj).text().split('\n').join(' ').split('  ').join(' ').split('"').join('');
			if (!$(obj).hasClass("notitle")&&!$(obj).hasClass("allowOver")&&!$(obj).parent().hasClass("template")) $(obj).attr("title", value);
		});
	},
	settingsReturned: function() {
		var edges = settings.data.edgeControllers;
	},
	versionReturned: function(e) {
		if (settings.versionData&&settings.versionData.data&&settings.versionData.data.version) {
			$("#Version").html("Controller: "+settings.versionData.data.version+" ZAC: "+settings.versionData.zac);
		}
	},
	clearNotifications: function(e) {
		modal.confirm("Are you sure you want to clear the notification history?", () => {
			growler.clear();
		});
	},
	dots: function(e) {
		var menu = $(e.currentTarget).children(".gridMenu");
		if (menu.hasClass("open")) menu.removeClass("open");
		else {
			$(".gridMenu.open").removeClass("open");
			menu.addClass("open");
		}
	},
	enter: function(e) {
		if (e.keyCode == 13) {
			var id = $(e.currentTarget).data("enter");
			if ($("#"+id).length>0) $("#"+id).click();
		}
	},
	binding: function() {
		if (page&&page.binding) {
			var props = Object.entries(page.binding);
			props.forEach(entry => {
				var key = entry[0];
				var value = entry[1];
				$('*[data-bind="'+key+'"]').html(value);
			});
		}
	},
	hideNav: function(e) {
		var isLocked = context.get("locked");
		if (!isLocked) header.close();
	},
	setupLock: function() {
		var isLocked = context.get("locked");
		if (isLocked==null||isLocked==undefined||isLocked.toString().trim().length==0) {
			isLocked = "true";
			context.set("locked","true");
		}
		if (isLocked=="true") $(".lock").addClass("locked");
		else $(".lock").removeClass("locked");
	},
	lock: function() {
		var isLocked = $(".lock").hasClass("locked");
		if (isLocked) {
			$(".lock").removeClass("locked");
			context.set("locked", "false");
		} else {
			$(".lock").addClass("locked");
			context.set("locked", "true");
		}
	},
	toggle: function(e) {
		// Normally in extended UI controls
		if ($(e.currentTarget).hasClass("on")) {
			$(e.currentTarget).removeClass("on");
		} else {
			$(e.currentTarget).addClass("on");
		}
		if (page.toggled) page.toggled();
	},
	check: function(e) {
		if ($(e.currentTarget).hasClass("checked")) {
			$(e.currentTarget).removeClass("checked");
		} else {
			$(e.currentTarget).addClass("checked");
		}
	},
	select: function(e) {
		var selector = $(e.currentTarget);
		if (selector.hasClass("selected")) {
			selector.removeClass("selected");
			if (selector.hasClass("all")) $(".selector").removeClass("selected");
			else {
				if ($(".rows").find(".selector.selected").length==0) {
					if ($(".head").find(".selector.selected").hasClass("all")) $(".head").find(".selector.selected").removeClass("selected");
				}
			}
		} else {
			selector.addClass("selected");
			if (selector.hasClass("all")) $(".selector").addClass("selected");
			if ($(".rows").find(".selector.selected").length==page.data.length) $(".head").find(".selector").addClass("selected");
		}
		app.setAction();
	},
	setAction() {
		if ($(".rows").find(".selector.selected").length>0) {
			$(".action").removeClass("icon-add");
			$(".action").addClass("icon-minus");
			$(".action").addClass("remove");
			$(".action").data("action", "remove");
		} else {
			$(".action").addClass("icon-add");
			$(".action").removeClass("icon-minus");
			$(".action").removeClass("remove");
			$(".action").data("action", "add");
		}
	},
	reset: function() {
		$(".action").addClass("icon-add");
		$(".action").removeClass("icon-minus");
		$(".action").removeClass("remove");
		$(".action").data("action", "add");
	},
	areas: [{
		name: "Ziti Policies",
		sections: [
			{name:"Edge Router Policies", url: "/router-polocies", singular: "Router Policy", plural: "Router Policies", data: "edge-router-policies" },
			{name:"Service Policies", url: "/service-polocies", singular: "Service Policy", plural: "Service Policies", data: "service-policies" }
		]
	}]
}
