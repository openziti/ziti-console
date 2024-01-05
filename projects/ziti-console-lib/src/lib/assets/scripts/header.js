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
var header = {
    openArea: '',
    subMenu: '',
    init: function() {
        var isOpen = context.get("menu");
        header.openArea = context.get("area");
        if (header.openArea.length==0) header.openArea = "AreaNavigation";
		if (isOpen==null||isOpen==undefined||isOpen.toString().trim().length==0) {
			isOpen = "open";
			context.set("menu","open");
		}
        if (isOpen=="open") header.doOpen();
        else header.close();
        header.events();
        setTimeout(header.setupAnimations,500);
    },
    events: function() {
		$("*[data-open]").click(header.open);
		$("*[data-modal]").click(header.openModal);
		$("*[data-show]").click(header.show);
		$("*[data-go]").click(header.goto);
		$("*[data-add]").click(header.add);
		$("*[data-hover]").mouseover(header.hover);
        $("*[data-hover]").mouseout(header.dehover);
        $("main").click(header.closeSubs);
        $(".option").click(header.checkOption);
        $("#AddButton").click(header.showAdd);
        $("#SendMessageButton").click(header.send);
    },
    setupAnimations: function() {
        $("nav").css("transition", "var(--transition)");
        $("main").css("transition", "var(--transition)");
    },
    showAdd: function() {
		app.typedIn = false;
        $(".anyadd").hide();
        $("#Select1").show();
        $("#HostedHost").val("localhost");
        $("#HostedPort").val("80");
        $("#HowToPort").val("80");
		$("#Service1").show();
		$("#Service2").hide();
        $("#ServiceHappen").html("");
        $("#SServiceName").val("");
        app.hostedRoles.val([]);
        app.idRoles.val([]);
        modal.show("AddAnyModal");
    },
    checkOption: function(e) {
        $(".loved").removeClass("love");
        $(".option").removeClass("checked");
        $(e.currentTarget).addClass("checked");
        if ($(e.currentTarget).data("type")=="love") {
            $(".loved").addClass("love");
        }
    },
    openModal: function(e) {
        modal.show($(e.currentTarget).data("modal"));
    },
    add: function(e) {
        modal.close();
		var url = $(e.currentTarget).data("add");
        if (window.location.href.indexOf(url)>=0&&page) page.add();
        else window.location.href = url+"#a";
    },
    goto: function(e) {
		var url = $(e.currentTarget).data("go");
		window.location = url;
    },
    open: function(e) {
        $(".navArea").removeClass("open");
        var area = $(e.currentTarget).data("open");
        if (area==header.openArea) {
            header.close();
        } else {
            context.set("area", area);
            header.openArea = area;
            header.doOpen();
        }
    },
    show: function(e) {
        var subMenu = $(e.currentTarget).data("show");
        if (subMenu==header.subMenu) {
            header.subMenu = '';
            $("#"+subMenu).removeClass("open");
        } else {
            header.subMenu = subMenu;
            $("#"+subMenu).addClass("open");
        }
    },
    openIfClosed: function() {
        if ($("nav").find("open").length==0) {
            header.openArea = "AreaNavigation";
            header.doOpen();
        }
    },
    closeSubs: function() {
        $("#menu.open").removeClass("open");
    },
    doOpen: function() {
        $(".clickable.selected").removeClass("selected");
        context.set("menu", "open");
        $("nav").find("open").removeClass("open");
        $("#"+header.openArea).addClass("open");
        $("."+header.openArea).addClass("selected");
        $("nav").addClass("open");
        $("main").addClass("open");
    },
    close: function() {
        context.set("menu", "closed");
        header.openArea = "";
        $("nav").removeClass("open");
        $("main").removeClass("open");
        $("nav").find("open").removeClass("open");
    },
    hover: function(e) {
        var hoverArea = $(e.currentTarget).data("hover");
        $("#"+hoverArea).addClass("open");
    },
    dehover: function(e) {
        $(".hover").removeClass("open");
    },
    send: function() {
        $(".errors").removeClass("errors");
        var type = $(".card.checked").data("type");
        if (!type) $("#MessageType").addClass("errors");
        if ($("#SendName").val().trim()) $("#SendName").addClass("error");
        if ($(".errors").length==0) {
            var params = {
                type: type,
                from: $("#SendName").val().trim(),
                email: $("#SendEMail").val().trim(),
                message: $("#SendMessage").val().trim()
            };
            service.call("message", params, header.sendComplete);
        } else growler.error("Check the form and try again");
    },
    sendComplete: function(e) {
        var loved = $(".loved").hasClass("love");
        $(".errors").removeClass("errors");
        $(".loved").removeClass("love");
        $(".option").removeClass("checked");
        $("#SendName").val("");
        $("#SendEMail").val("");
        $("#SendMessage").val("");
        modal.close();
        var message = "Message Has Been Sent!";
        if (loved) message += " ... we love you too.";
        growler.success(message);
    }
}
