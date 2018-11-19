/**
 * @class angular_module.robocop.directive.robocopAction
 * @description Manage a panel to select action (mail, slack...).
 * It use the current scope to store data.
 * List of variable use by the directive: $scope.mail, $scope.slack, $scope.marvin, $scope.actionConfig, $scope.config
 * $scope.[actionConfig]{@link angular_module.robocop.directive.robocopAction.actionConfig} is the config for the directive.
 * $scope.config is the config return by "/api/robocop/config/getAll" API.
 * @example
 * <robocop-action></robocop-action>
 */

 /**
 * A configuration object for a action panel.
 * @typedef {Object} actionConfig
 * @type Object
 * @memberof angular_module.robocop.directive.robocopAction
 * @property {Object} [mail] - Config for mail
 * @property {boolean} [mail.enabled] - true if mail configuration should be display
 * @property {string[]} mail.fields - Configurable field list for mail (to, from, priority, subject, body).
 * @property {Object} [slack] - Config for slack
 * @property {boolean} [slack.enabled] - true if mail configuration should be display
 * @property {string[]} slack.fields - Configurable field list for Slack (canal, name, body).
 * @property {Object} [marvin] - Config for marvin
 * @property {boolean} [marvin.enabled] - true if mail configuration should be displayl
 * @property {string[]} marvin.fields - Configurable field list for Marvin (type, contact, detectionSource, alertSource, body).
 * @example <caption>For enabled any action with all fields.</caption>
 * {
 *   mail   : {enabled:true, fields: ['to', 'from', 'priority', 'subject', 'body']},
 *   slack  : {enabled:true, fields: ['canal', 'name', 'body']},
 *   marvin : {enabled:true, fields: ['type', 'contact','detectionSource', 'alertSource', 'body']}
 * }
 */

var modules = require('ui/modules');

if (!modules) {
  modules = require('ui/modules').uiModules;
}

import template from './action.html';

modules.get('app/robocop', [])
.directive('robocopAction', function () {
  return {
    restrict: 'E',
    replace: true,
    transclude: false,
    scope: false,
    template: template,
    link: function (scope, element, attrs) {

      // Complete actionConfig for action not found
      if (scope.actionConfig.mail == null) {
        scope.actionConfig.mail = {enabled : false};
      }
      if (scope.actionConfig.slack == null) {
        scope.actionConfig.slack = {enabled : false};
      }
      if (scope.actionConfig.marvin == null) {
        scope.actionConfig.marvin = {enabled : false};
      }

      // Set the default tab selected
      if (scope.actionConfig.tabAction == null) {
        if (scope.actionConfig.mail.enabled) {
          scope.actionConfig.tabAction = 'Mail';
        } else if (scope.actionConfig.slack.enabled) {
          scope.actionConfig.tabAction = 'Slack';
        } else if (scope.actionConfig.marvin.enabled) {
          scope.actionConfig.tabAction = 'Marvin';
        }
      }

      // Set fields to None for the action config if not set
      if (scope.actionConfig.mail.fields == null) {
        scope.actionConfig.mail.fields = [];
      }
      if (scope.actionConfig.slack.fields == null) {
        scope.actionConfig.slack.fields = [];
      }
      if (scope.actionConfig.marvin.fields == null) {
        scope.actionConfig.marvin.fields = [];
      }

      if (!scope.mail) {
        scope.mail = {
          priority: 'normal',
        };
      }
      if (!scope.slack) {
        scope.slack = {};
      }
      if (!scope.marvin) {
        scope.marvin = {
          typeAlert : 'Alert'
        };
        if (scope.navbarPage === 'alert') {
          scope.marvin.title = '@[alert.title]';
        } else if (scope.navbarPage === 'cron') {
          scope.marvin.title = '@[cron.title]';
        } else {
          scope.marvin.title = '';
        }
      }
    }
  };
});
