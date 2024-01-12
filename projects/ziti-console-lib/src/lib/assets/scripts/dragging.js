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
var dragging = {
	dragColumn: -1,
	dragStyle: "",
	dragWidth: 0,
	startX: 0,
	currentX: 0,
	dragItem: null,
	dragClass: "",
    init: function() {
		$(".dragger").mousedown(dragging.dragWhat);
		$(document).mouseup(dragging.dragOff);
		$(document).mousemove(dragging.dragging);
    },
	dragging: function(e) {
		if (dragging.dragColumn>0) {
			dragging.currentX = e.clientX;
			var difference = dragging.startX - dragging.currentX;
			var size = dragging.dragWidth+(difference*-1);
			if (size>40) {
				var items = dragging.dragStyle.split(' ');
				var newStyle = "";
				for (var i=0; i<items.length; i++) {
					if (i==dragging.dragColumn) newStyle += size+"px ";
					else if (i==dragging.dragColumn+1) newStyle += "auto ";
					else newStyle += items[i]+" ";
				}
				var classes = dragging.dragClass.split(" ");
				$("."+classes[1]+"."+classes[2]).css("grid-template-columns",newStyle);
			}
		}
	},
	dragWhat: function(e) {
		var dragger = $(e.currentTarget);
		var pos = dragger.parent().index();
		dragging.dragStyle = dragger.parent().parent().css("grid-template-columns");
		dragging.dragClass = dragger.parent().parent().attr('class');
		dragging.dragColumn = pos;
		dragging.dragItem = dragger.parent();
		dragging.dragWidth = dragger.parent().width();
		dragging.startX = e.clientX;
		dragging.currentX = e.clientX;
	},
	dragOff: function() {
		dragging.dragColumn = -1;
	}
}
