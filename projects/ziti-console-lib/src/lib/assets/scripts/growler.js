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

var growler = {
  disabled: false,
  isDebugging: true,
  showId: -1,
  data: [],
  init: function() {
    $("body").append('<div id="Growler" class="growler"><div class="title"></div><div class="subtitle"></div><div class="content"></div><div class="icon"></div></div>');
    growler.events();
    growler.data = context.get("growlers");
    if (!growler.data) growler.data = [];
    if (growler.data.length>0) $("#AlarmCount").show();
    else $("#AlarmCount").hide();
  },
  events: function() {
    $("#AlertButton").click(growler.openAlerts);
    $("#NotificationMenuClose").click(growler.closeAlerts);
  },
  openAlerts: function(e) {
    growler.loadLogs();
    header.openIfClosed();
    $("#NotificationsMenu").addClass("open");
  },
  closeAlerts: function(e) {
    $("#NotificationsMenu").removeClass("open");
  },
  toggle: function(e) {
    if ($("#NotificationsMenu").hasClass("open")) $("#NotificationsMenu").removeClass("open");
    else {
      growler.loadLogs();
      header.openIfClosed();
      $("#NotificationsMenu").addClass("open");
    }
  },
  clear: function() {
    context.remove("growlers");
    growler.data = [];
    $("#AlarmCount").hide();
    growler.loadLogs();
  },
  loadLogs: function() {
    $("#NotificationsList").html("");
    if (growler.data.length>0) {
      growler.data = growler.data.reverse();
      for (var i=0; i<growler.data.length; i++) {
          var element = $("#NotificationTemplate").clone();
          element.removeClass("template");
          element.attr("id","Row"+i);
          element.addClass(growler.data[i].type);
          element.html(element.html().split("{{type}}").join(app.validate(growler.data[i].type)));
          element.html(element.html().split("{{level}}").join(app.validate(growler.data[i].title)));
          element.html(element.html().split("{{subtitle}}").join(app.validate(growler.data[i].subtitle)));
          element.html(element.html().split("{{message}}").join(app.validate(growler.data[i].message)));
          element.html(element.html().split("{{time}}").join(app.validate(moment(growler.data[i].time).fromNow())));
          $("#NotificationsList").append(element);
      }
			$("#AlarmCount").show();
      $("#ClearNotificationsButton").show();
    } else {
			$("#AlarmCount").hide();
      $("#ClearNotificationsButton").hide();
      $("#NotificationsList").html("<span class='nonotify'>"+locale.get("NoNotifications")+"</span>")
    }
  },
	show: function(type, title, subtitle, message) {
    if (growler.disabled) {
      return;
    }
    if (growler.showId!=-1) clearTimeout(growler.showId);
    $("#Growler").removeClass("open");
    $("#Growler").removeClass("success");
    $("#Growler").removeClass("error");
    $("#Growler").removeClass("warning");
    $("#Growler").removeClass("info");
    $("#Growler").removeClass("bug");
    if (growler.isDebugging) console.log(type+"::"+title+" - "+message);
    if (type!="debug"||growler.isDebugging) {
      $("#Growler").addClass(type);
      $("#Growler").find(".title").html(app.validate(title));
      $("#Growler").find(".subtitle").html(app.validate(subtitle));
      $("#Growler").find(".content").html(app.validate(message));
      $("#Growler").find(".icon").css("background-image", "url(assets/images/"+app.validate(type)+".png)");
      $("#Growler").addClass("open");
      growler.showId = setTimeout(function() {
        growler.showId = -1;
        $("#Growler").removeClass("open");
      }, 5000);
      growler.data[growler.data.length] = {
        type: type,
        title: title,
        subtitle: subtitle,
        message: message,
        time: new Date()
      };
      context.set("growlers", growler.data);
      if (growler.data.length>0) $("#AlarmCount").show();
      else $("#AlarmCount").hide();
    }
	},
	error: function(subtitle, message) {
		growler.show("error", locale.get("GrowlerError"), subtitle, message);
  },
  info: function(subtitle, message) {
		growler.show("info", locale.get("GrowlerInfo"), subtitle, message);
  },
  debug: function(subtitle, message) {
		growler.show("debug", locale.get("GrowlerDebug"), subtitle, message);
  },
  warning: function(subtitle, message) {
		growler.show("warning", locale.get("GrowlerWarn"), subtitle, message);
  },
  bug: function(subtitle, message) {
		growler.show("bug", locale.get("GrowlerBug"), subtitle, message);
  },
  success: function(subtitle, message) {
		growler.show("success", locale.get("GrowlerSuccess"), subtitle, message);
  },
  form: function() {
    $('.modal.open').animate({scrollTop: "0px"}, 500);
    growler.error(locale.get("GrowlerInvalid"), locale.get("TryAgain"))
  }
}
