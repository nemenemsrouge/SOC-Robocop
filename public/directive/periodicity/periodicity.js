/**
 * @class angular_module.robocop.directive.robocopPeriodicity
 * @description Display the periodicity selector panel.
 */

/**
 * A configuration object for periodicity panel
 * @type Object
 * @property {Object} [] -
 *
 */

var modules = require('ui/modules');

if (!modules) {
  modules = require('ui/modules').uiModules;
}


import template from './periodicity.html';

modules.get('app/robocop', [])
.directive('robocopPeriodicity', function($http) {
  return {
    restrict: 'E',
    replace: true,
    transclude: false,
    scope: false,
    template: template,
    link: function(scope, element, attrs) {
      $http.get('../api/robocop/config/adv/workerDay,workerTime').then((response) => {
        // translate days 3 letters to full name
        var daysRef = {
          mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thurday', fri:'Friday', sat:'Saturday', sun:'Sunday'
        };
        for (var idDay in response.data._source.workerDay) {
          response.data._source.workerDay[idDay] = daysRef[response.data._source.workerDay[idDay]];
        }

        scope.workingPeriod = {
          days : response.data._source.workerDay,
          hours : response.data._source.workerTime
        };
      });

      scope.period = {};
      scope.period.periodicity = '1 minutes';
      scope.period.dayName = 'Monday';
      scope.period.dayNbr = 1;
      scope.period.time = new Date(0,0,0,0,0);
    }
  };
});

