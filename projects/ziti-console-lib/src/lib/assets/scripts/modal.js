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

var modal = {
	id: "",
	init: function() {
		if (!window.isSPA || !window.modalInit) {
			$("body").append('<div class="modal background"></div>');
			$("body").append('<div id="ConfirmModal" class="modal box"><div class="close icon-close"></div><div class="title">Are you Sure</div><div id="ConfirmWhat" class="subtitle"></div><div class="buttons"><div class="linkButton closer">Oops, No get me out of here</div><div id="YesButton" class="button">Yes</div></div></div>');
		}
		$("#ConfirmCancel").click(modal.close);
		modal.events();
		window.modalInit = true;
	},
	events: function() {
		$(".modal .close").click(modal.close);
		$(".modal .closer").click(modal.close);
	},
	show: function(id) {
		$(".modal.background").addClass("open");
		modal.id = id;
		$("#"+id).addClass("open");
		$("body").addClass("noscroll");
		$("#"+id).find("input").first().focus();
	},
	showing: function(id) {
		return id.trim().length>0&&modal.id==id;
	},
	close: function(e) {
		modal.id = "";
		$("body").removeClass("noscroll");
		$(".modal.open").removeClass("open");
        $(".commands").removeClass("open");
	},
	confirm: function(message, onConfirmed) {
		modal.show("ConfirmModal");
		$("#ConfirmWhat").html(message);
		$("#YesButton").click(function(e) {
			onConfirmed();
			modal.close();
		});
	}
}
