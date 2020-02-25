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
var uploader = {
	id: "",
    bar: "",
    init: function() {
        uploader.events();
    },
    events: function() {
        $(".upload").click(uploader.select);
		$(".uploadSelector").change(uploader.selected);
    },
    select: function(e) {
        var id = $(e.currentTarget).data("id");
        $("#Tag_"+id+"_SelectFile").click();
    },
    selected: function(e) {
        var fileField = $(e.currentTarget);
        if (fileField.val().trim().length>0) {
            uploader.upload(fileField.prop("id"), fileField.data("id"));
        }
    },
	upload: function(id, resource) {
		uploader.id = id;
		uploader.bar = resource;
		$("#Progress_"+resource+".progress").css("width", "1px");
		$("#Progress_"+resource).addClass("uploading");
		var fd = new FormData();
		var files = document.getElementById(id).files;
		if (files.length>0) {
            fd.append("image", files[0]);
            fd.append("resource", resource);
			var xhr = new XMLHttpRequest();
			xhr.upload.addEventListener("progress", this.progress, false);
			xhr.addEventListener("load", this.complete, false);
			xhr.addEventListener("error", this.error, false);
			xhr.addEventListener("abort", this.cancel, false);
			xhr.open("POST", "/api/upload");
			xhr.send(fd);
		}
	},
	progress: function(evt) {
		if (evt.lengthComputable) {
			var percentComplete = Math.round(evt.loaded*100/evt.total);
			$("#Progress_"+uploader.bar+".progress").css("width",percentComplete+"%");
		}
	},
	complete: function(evt) {
        uploader.close();
        resources.get(uploader.bar);
        tags.doSelect(uploader.bar, evt.currentTarget.responseText);
	},
	error: function(evt) {
		growler.error("Problem Uploading Image");
		uploader.close();
	},
	cancel: function(evt) {
		uploader.close();
	},
	close: function() {
		$("#Progress_"+uploader.bar+".progress").css("width", "0px");
		$("#Progress_"+uploader.bar).removeClass("uploading");
	}
}
