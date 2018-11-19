var modules = require('ui/modules');

if (!modules) {
  modules = require('ui/modules').uiModules
}

modules.get('app/robocop')
/**
 * @class angular_module.robocop.controller.robocopController
 * @description Controller for index.html. Control the index of overview
 * @param $scope {service}
 */
.controller('robocopController', function ($scope) {
    // NavBar settings
    $scope.navbarPage = "overview";
})
