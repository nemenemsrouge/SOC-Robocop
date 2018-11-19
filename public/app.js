/* Styles css, less */
import 'ui/autoload/styles';
import './less/main.less';

import 'ui/autoload/modules';
import 'ui/autoload/directives';

/* JSON editor */
import ace from 'ace';
import './themeAce/xcode.js';


/* templates*/
import indexTemplate from './templates/index.html';

import alertTemplate from './templates/alert/alert.html';
import alertEditTemplate from './templates/alert/editAlert.html';

import historyTemplate from './templates/history/history.html';
import historyEditTemplate from './templates/history/editHistory.html';

import cronTemplate from './templates/cron/cron.html';
import cronEditemplate from './templates/cron/editCron.html';

import managementTemplate from './templates/management/management.html';
import managementLogTemplate from './templates/management/log.html';

/* Controllers */
import './controller/alert.js';
import './controller/history.js';
import './controller/cron.js';
import './controller/management.js';
import './controller/index.js';
import './controller/kibana.js';
import './controller/scriptHelp.js';

/* Filters */
import './filter/date.js';
import './config/config.js';

/* Directive */
import './directive/action/index.js';
import './directive/periodicity/index.js';

/* Routing */
import uiRoutes from 'ui/routes';
uiRoutes.enable();
uiRoutes
.when('/', {
  template: indexTemplate,
  controller: 'robocopController',
  controllerAs: 'ctrl',
})
.when('/alert', {
  template: alertTemplate,
  controller: 'robocopAlertController',
  controllerAs: 'ctrl',
})
.when('/alert/edit/', {
  template: alertEditTemplate,
  controller: 'robocopAlertEditController',
  controllerAs: 'ctrl',
})
.when('/alert/edit/:id', {
  template: alertEditTemplate,
  controller: 'robocopAlertEditController',
  controllerAs: 'ctrl',
})
.when('/history/', {
  template: historyTemplate,
  controller: 'robocopHistoryController',
  controllerAs: 'ctrl',
})
.when('/history/edit/:id', {
  template: historyEditTemplate,
  controller: 'robocopHistoryEditController',
  controllerAs: 'ctrl',
})
.when('/cron', {
  template: cronTemplate,
  controller: 'robocopCronController',
  controllerAs: 'ctrl',
})
.when('/cron/edit', {
  template: cronEditemplate,
  controller: 'robocopCronEditController',
  controllerAs: 'ctrl',
})
.when('/cron/edit/:id', {
  template: cronEditemplate,
  controller: 'robocopCronEditController',
  controllerAs: 'ctrl',
})
.when('/management', {
  template: managementTemplate,
  controller: 'robocopManagementController',
  controllerAs: 'ctrl',
})
.when('/management/log', {
  template: managementLogTemplate,
  controller: 'robocopManagementLogController',
  controllerAs: 'ctrl',
})
.when('/management/log/:id', {
  template: managementLogTemplate,
  controller: 'robocopManagementLogController',
  controllerAs: 'ctrl',
})
.when('', {
    redirectTo: '/',
})
.otherwise({
    redirectTo: '/'
});

 /**
  * @namespace angular_module
  */

 /**
  * @class angular_module.robocop
  * @memberOf angular_module
  */

  /**
  * @namespace angular_module.robocop.controller
  */

  /**
  * @namespace angular_module.robocop.filter
  */
  /**
  * @namespace angular_module.robocop.directive
  */
