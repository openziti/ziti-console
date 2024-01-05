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
function Flows(elementId) {
    this.elementId = elementId;
    this.clients = [];
    this.services = [];
    this.name = "";
    this.id = "";
    this.render = function() {
        var canvas = $("#FlowArea");
        var context = canvas.get(0).getContext("2d");
        context.fillStyle = "red";

        // Set rectangle and corner values
        var rectX = 50;
        var rectY = 50;
        var rectWidth = 157;
        var rectHeight = 28;
        var cornerRadius = 29;

        // Reference rectangle without rounding, for size comparison
        //context.fillRect(200, 50, rectWidth, rectHeight);

        // Set faux rounded corners
        context.lineJoin = "round";
        context.lineWidth = cornerRadius;

        // Change origin and dimensions to match true size (a stroke makes the shape a bit larger)
        context.strokeRect(rectX+(cornerRadius/2), rectY+(cornerRadius/2), rectWidth-cornerRadius, rectHeight-cornerRadius);
        //context.fillRect(rectX+(cornerRadius/2), rectY+(cornerRadius/2), rectWidth-cornerRadius, rectHeight-cornerRadius);



        context.closePath();
        context.stroke();
        context.fill();
    }
}
