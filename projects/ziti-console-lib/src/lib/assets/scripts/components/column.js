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
function Column(elementId) {
    this.elementId = elementId;
    this.clients = [];
    this.services = [];
    this.name = "";
    this.id = "";
    this.render = function() {
        for (var i=0; i<this.clients.length; i++) {
            this.clients[i].metrics = {
                dataSent: this.getRandom(10000, 1000000000),
                dataRecieved: this.getRandom(10000, 1000000000)
            }
            this.clients[i].metrics.total = this.clients[i].metrics.dataSent+this.clients[i].metrics.dataRecieved;
            if (i==3) this.clients[i].status = "error";
            else this.clients[i].status = "client";
        }
        for (var i=0; i<this.services.length; i++) {
            this.services[i].metrics = {
                dataSent: this.getRandom(10000, 1000000000),
                dataRecieved: this.getRandom(10000, 1000000000)
            }
            this.services[i].metrics.total = this.services[i].metrics.dataSent+this.services[i].metrics.dataRecieved;
        }
        this.services = this.sort("metrics.total", this.services);
        this.clients = this.sort("metrics.total", this.clients);
        var element = $("#"+elementId);
        element.addClass("nfchart");
        var z = this.services.length+this.clients.length;
        var position = 0;
        element.html("");
        if (element.length>0) {
            for (var i=0; i<this.services.length; i++) {
                var percent = this.getPercentage(this.services[i], this.services);
                var height = this.getHeight(percent);
                z--;
                element.append(this.getColumn("service", this.services[i].name, percent, z, position, height, "Service", i, this.services[i]));
                position = position+(height-50);
            }
            for (var i=0; i<this.clients.length; i++) {
                try {
                    var percent = this.getPercentage(this.clients[i], this.clients);
                    var height = this.getHeight(percent);
                    z--;
                    element.append(this.getColumn(this.clients[i].status, this.clients[i].name, percent, z, position, height, "Client", i, this.clients[i]));
                    position = position+(height-50);
                } catch (e) {
                    console.log(e);
                }
            }
            $(".nfcolumn").click(this.clickItem);
        }
    };
    this.clickItem = function(e) {
        $(".notselected").removeClass("notselected");
        $(".selected").removeClass("selected");
        $(".nfopaque").removeClass("nfopaque");
        $(".nfcategory").addClass("nfopaque");
        $(".nfcolumn").addClass("notselected");
        $(e.currentTarget).addClass("selected");
        $(e.currentTarget).removeClass("notselected");
        var found = false;
        var ind = 0;
        var totalElements = $(".nfcolumn").length;
        var padTo = ((totalElements>20)?5:20);
        $(".nfcolumn").each(function(index, element) {
            $(element).css("top", $(element).data("home")+"px");
        });
        $(".nfcolumn").each(function(index, element) {
            if ($(element).data("index")==$(e.currentTarget).data("index")) {
                found = true;
                if (totalElements>2) {
                    var midpoint = Math.ceil(totalElements/2);
                    if (index<midpoint) {
                        var distance = midpoint-index;
                        var moveto = Number($(element).data("home"))+(distance*padTo);
                        $(element).css("top", moveto);
                    } else if (index>midpoint) {
                        var distance = index-midpoint;
                        var moveto = Number($(element).data("home"))-(distance*padTo);
                        $(element).css("top", moveto);
                    }
                }
            } else {
                if (index>0&&index<($(".nfcolumn").length)) {
                    if (found) {
                        var divider = totalElements-index;
                        var moveto = Number($(element).data("home"))+(divider*padTo);
                        $(element).css("top", moveto);
                    } else {
                        var moveto = Number($(element).data("home"))-(index*padTo);
                        $(element).css("top", moveto);
                    }
                }
            }
        });
    };
    this.getHeight = function(percentage) {
        var min = 94;
        var max = 200;
        return (max-min)*(percentage/100)+min;
    };
    this.getPercentage = function(obj, objects) {
        var total = 0;
        if (objects.length==1) return 100;
        for (var i=0; i<objects.length; i++) {
            if (objects[i].id!=obj.id) {
                total += objects[i].metrics.dataSent+objects[i].metrics.dataRecieved;
            }
        }
        return Math.ceil(((obj.metrics.dataSent+obj.metrics.dataRecieved)/total)*100);
    };
    this.getColumn = function(type, name, percent, index, position, height, category, i, obj) {
        var html = '';
        var metrics = obj.metrics;
        if (i==0) html += '<div class="nfcategory" style="top: '+(position-70)+'px"><span class="nfsuper">'+category+'</span><span class="nfsub">Usage</span></div>';
        html += '<div class="nfcolumn '+type+'" data-index="'+index+'" data-home="'+position+'" style="z-index: '+index+'; top: '+position+'px"><div class="nfcontents" style="height: '+height+'px">';
        html += '<div class="nftop"></div>';
        html += '<div class="nfmiddle"><div class="ngleftlabel" style="line-height: '+(height/2)+'px">'+percent+'%</div>';
        html += '<div class="nfside right"><div class="sub">Created '+moment(obj.createdAt).fromNow()+'</div>';
        html += '<div class="label">Last Updated</div><div class="value">'+moment(obj.updatedAt).fromNow()+'</div>';
        html += '<div class="label">Most Data</div><div class="value">N/A</div></div>';
        html += '<div class="nfside left"><div class="sub">Total Data '+metrics.total.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")+' MB</div>';
        html += '<div class="label">Data Sent</div><div class="value">'+metrics.dataSent.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")+' MB</div>';
        html += '<div class="label">Data Recv</div><div class="value">'+metrics.dataRecieved.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")+' MB</div>';
        html += '</div><div class="ngrightlabel" style="line-height: '+(height/2)+'px">'+app.validate(name)+'</div></div>';
        html += '<div class="nfbottom"></div></div>';
        return html;
    };
    this.getRandom = function(max, min) {
        return Math.ceil(Math.random()*(max-min)+min);
    };
    this.sort = function(prop, arr) {
        prop = prop.split('.');
        var len = prop.length;

        arr.sort(function (a, b) {
            var i = 0;
            while( i < len ) {
                a = a[prop[i]];
                b = b[prop[i]];
                i++;
            }
            if (a < b) {
                return -1;
            } else if (a > b) {
                return 1;
            } else {
                return 0;
            }
        });
        return arr;
    };
}
