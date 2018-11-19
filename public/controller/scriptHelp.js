var modules = require('ui/modules');

if (!modules) {
  modules = require('ui/modules').uiModules
}

modules.get('app/robocop')

/**
 * @class angular_module.robocop.controller.robocopHelpScriptController
 * @description Controller for scriptHelp.html. Control the modal of script instruction.
 * @param $scope {service}
 */
.controller("robocopHelpScriptController", function() {
    this.helpScript = false;
    this.showScriptHelp = function() {this.helpScript = true;}
    this.hideScriptHelp = function() {this.helpScript = false;}
})

