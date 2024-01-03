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


var commands = {
    params: null,
    services: [],
    cli: [],
    init: function() {
        commands.params = CodeMirror.fromTextArea(document.getElementById("ApiJson"), { mode: "application/json", lineNumbers: true, extraKeys: {"Ctrl-Space": "autocomplete"}, readOnly: true });
        commands.events();
    },
    events: function(e) {
        $("#IconDownload").click(commands.download);
        $(".modal").find("input").keyup(commands.formChanged);
        $(".modal").find("input").change(commands.formChanged);
        $(".modal").find("input").blur(commands.formChanged);
        $(".modal").find("textarea").keyup(commands.formChanged);
        $(".modal").find("textarea").change(commands.formChanged);
        $(".modal").find("textarea").blur(commands.formChanged);
        $(".modal").find("select").keyup(commands.formChanged);
        $(".modal").find("select").change(commands.formChanged);
        $(".modal").find("select").blur(commands.formChanged);
        $(".modal").find(".toggle").click(commands.formChangedWait);
        $(".configBox").mouseenter(commands.formChanged);
    },
    reset: function() {
        $(".modal").find("input[data-tag]").off("keyup", commands.formChanged);
        $(".modal").find("input[data-tag]").off("change", commands.formChanged);
        $(".modal").find("input[data-tag]").off("blur", commands.formChanged);
        $(".modal").find(".jsonEntry").off("change", commands.formChanged);
        $(".modal").find(".jsonEntry").off("blur", commands.formChanged);

        $(".modal").find("input[data-tag]").keyup(commands.formChanged);
        $(".modal").find("input[data-tag]").change(commands.formChanged);
        $(".modal").find("input[data-tag]").blur(commands.formChanged);
        $(".modal").find(".jsonEntry").blur(commands.formChanged);
        $(".modal").find(".jsonEntry").change(commands.formChanged);
    },
    formChangedWait: () => {
        setTimeout(() => {
            commands.formChanged();
        }, 1000);
    },
    formChanged: function() {
        if (page.params) page.params();
    },
    set: (services, cli) => {
        $("#OperationCommands").removeClass("open");
        commands.cli = cli;
        commands.services = services;

        $("#ExecutionSteps").html("");

        if (cli.length>0) {
            let html = "";
            for (let i=1; i<=cli.length; i++) {
                html += '<div class="step step'+i+'">'+i+'</div>';
            }
            $("#ExecutionSteps").html(html);
            $(".step").click((e) => {
                let index = Number($(e.currentTarget).html());
                commands.selected(index);
            });
            commands.selected(1);
        }
    },
    selected: (index) => {
        $(".step").removeClass("selected");

        $("#OperationCommands").addClass("open");
        var currentService = commands.services[index-1];

        var currentCli = commands.cli[index-1];
        $("#CLICommands").val(currentCli);

        $("#ApiCall").val(currentService.url);
        commands.params.setValue(JSON.stringify(currentService.params));
        commands.params.autoFormatRange({line:0, ch:0}, {line:commands.params.lineCount()});

        $(".step"+index).addClass("selected");
    },
    download: function(e) {
        var element = document.createElement('a');
        let filename = $("#SServiceName").val().trim().split(' ').join('').replace(/[^a-z0-9]/gi, '').toLowerCase();
        if (window.navigator.platform.indexOf("Win")>=0) filename+=".ps1";
        else filename+=".sh";
        let text = "";
        for (let i=0; i<commands.cli.length; i++) {
            text += ((i>0)?"\n":"")+commands.cli[i];
        }
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    }
}
