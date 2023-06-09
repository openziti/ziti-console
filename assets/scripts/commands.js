
var commands = {
    params: null,
    init: function() {
        commands.params =  CodeMirror.fromTextArea(document.getElementById("ApiJson"), { mode: "application/json", lineNumbers: true, extraKeys: {"Ctrl-Space": "autocomplete"}, readOnly: true });
    },
    set: (url, cli, params) => {
        $("#ApiCall").val(url);
        $("#CLICommands").val(cli);
        $("#OperationCommands").addClass("open");
        commands.params.setValue(JSON.stringify(params));
        commands.params.autoFormatRange({line:0, ch:0}, {line:commands.params.lineCount()});
    }
}