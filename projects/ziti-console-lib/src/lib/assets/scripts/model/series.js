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
function Series(core, item, readwrite, type, id) {
    this.core = core;
    this.item = item;
    this.readwrite = readwrite;
    this.type = type;
    this.id = id;
    this.get = function() {
		var params = this.getParams();
		service.call("series", params, this.getReturned);
    };
    this.getParams = function() {
        return {
            core: this.core,
            item: this.item,
            readwrite: this.readwrite,
            type: this.type,
            id: this.id,
            url: context.get("fabricUrl")
        }
    };
    this.getReturned = function(e) {
        if (e.error) growler.error("Series Error", e.error);
        else {
            context.set(e.source, e.data);
        }
    };
    this.getAverage = function() {
		var params = this.getParams();
		service.call("average", params, this.averageReturned);
    },
    this.averageReturned = function(e) {
        if (e.error) growler.error("Average Error", e.error);
        else {
            $("."+e.source.split('.').join('')+"").html(e.data.toFixed(2));
            context.set(e.id+"."+e.source, e.data);
            context.set(e.source, e.data);
        }
    };
    this.getLatency = function() {
		var params = this.getParams();
		service.call("average", params, this.latencyReturned);
    },
    this.latencyReturned = function(e) {
        if (e.error) growler.error("Latency Error", e.error);
        else {
            $("."+e.source.split('.').join('')+"").html((e.data*.0001).toFixed(0));
            context.set(e.id+"."+e.source, e.data);
            context.set(e.source, e.data);
        }
    };
    this.getSource = function() {
        let source = this.core;
        if (this.item.trim().length>0) source += "."+this.item;
        if (this.readwrite.trim().length>0) source += "."+this.readwrite;
        source += "."+this.type;
        return source;
    }
}
