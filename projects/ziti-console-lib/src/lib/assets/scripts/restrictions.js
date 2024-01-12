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
var restrictions = {
    init: function() {
        restrictions.events();
    },
    events: function() {
        $("[data-restrict]").blur(restrictions.test);
    },
    test: function(e) {
        var element = $(e.currentTarget);
        element.removeClass("errors");
        var totest = element.data("restrict");
        if (totest=="empty") {
            if (element.val().trim().length==0) element.addClass("errors");
        } else if (totest=="port") {
            if (isNaN(element.val().trim())) element.addClass("errors");
            else {
                var port = Number(element.val().trim());
                if (port<=0||port>65535) element.addClass("errors");
            }
        }
    }
}
