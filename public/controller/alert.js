import { toastNotifications } from 'ui/notify';

var modules = require('ui/modules');

if (!modules) {
  modules = require('ui/modules').uiModules
}

modules.get('app/robocop', [])

/**
 * @class angular_module.robocop.controller.robocopAlertController
 * @description Controller for alert.html. Control the index of alert.
 * @param $scope {service}
 */
.controller("robocopAlertController", function($scope) {
  // NavBar settings
  $scope.navbarPage = "alert";
})

/**
 * @class angular_module.robocop.controller.robocopAlertEditController
 * @description Controller for editAlert.html. Control the management of an alert.
 * @param $window {service}
 * @param $location {service}
 * @param $anchorScroll {service}
 * @param $routeParams {service}
 * @param $scope {service}
 * @param $http {service}
 * @param $timeout {service}
 * @param kbnUrl {service} Kibana service to manage url
 * @param Notifier {service} Kibana service to manage Notification
 */
.controller('robocopAlertEditController', function ($window, $location, $anchorScroll, $routeParams, $scope, $http, $timeout, kbnUrl, Notifier) {
  // NavBar settings.
  $scope.navbarPage = "alert";

  // Init an empty alert.
  $scope.alert = {
    title: '',
    description: '',
    data: '',
    category: "",
    level: "",
    watcher: {
      periodicity: '1 minutes'
    },
    script:{},
    period:{
      enabled : false,
      days    : [false, true, true, true, true, true, false]
    },
    debug: {}
  };

  // Init variable for action setting.
  $scope.actionConfig = {
    mail   : {enabled:true, fields: ['to', 'from', 'priority', 'subject', 'body']},
    slack  : {enabled:true, fields: ['canal', 'name', 'body']},
    marvin : {enabled:true, fields: ['type', 'title', 'contact','detectionSource', 'alertSource', 'body']}
  }

  // Init variable for setting.
  $scope.alert.enabled = true;
  $scope.alert.multiMessage = false;
  $scope.alert.optiLogstash = false;

  // Init variable for script.
  $scope.alert.scriptChecked = false;
  $scope.alert.hasScript = false;
  $scope.scriptArgs = {};

  // GET indices list
  $http.get('../api/robocop/indices/getAll').then((response) => {
    $scope.indices = response.data;
  });
  // GET config file
  $http.get('../api/robocop/config/getAll').then((response) => {
    $scope.config = response.data;
    if (!isNew()) {
      $scope.alert.optiLogstash = $scope.config.watcher.isLogstash;
    }
  })
  // GET Adv config
  $http.get('../api/robocop/config/adv/alertLevel,alertCategory,workerDay,workerTime').then((response) => {
    // File config
    $scope.category = response.data._source.alertCategory;
    $scope.level = response.data._source.alertLevel;
    for (var indexLevel in $scope.level) {
      var level = $scope.level[indexLevel].split(':')
      $scope.level[indexLevel] = level[0]
    }


    // translate days 3 letters to full name
    var daysRef = {mon:'Monday', tue:'Tuesday', wed:'Wednesday', thu:'Thurday', fri:'Friday', sat:'Saturday', sun:'Sunday'}
    for (var idDay in response.data._source.workerDay) {
      response.data._source.workerDay[idDay] = daysRef[response.data._source.workerDay[idDay]]
    }

    $scope.workingPeriod = {
      days : response.data._source.workerDay,
      hours : response.data._source.workerTime
    }
  })

  // State for request json color (default, success or danger).
  $scope.jsonCheck = 'default';

  //ACE editor -- Remove the warning.
  $scope.aceLoaded = function(_editor) {
      _editor.$blockScrolling = Infinity;
  };

  if (!isNew()) {
      refreshAlert();
  } else {
      $scope.isNew = true;
  }

  /**
   * @function refreshAlert
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Load an alert saved in Elasticsearch. Use the id in URL.
   */
  function refreshAlert() {
    if (isNew()) {
      return
    }

    // Get the alert by its id.
    $http.get('../api/robocop/alert/get/' + $routeParams.id).then((response) => {
      var alertGet = response.data._source;
      $scope.alert.title = alertGet.title;
      $scope.alert.description = alertGet.description;
      $scope.alert.data = alertGet.data;
      $scope.alert.irp = alertGet.irp;
      $scope.alert.category = alertGet.category;
      $scope.alert.level = alertGet.level;
      $scope.alert.watcher = alertGet.watcher;
      $scope.alert.createdDate = alertGet.createdDate;

      $scope.alert.number = alertGet.number;
      $scope.alert.enabled = alertGet.enabled;
      $scope.alert.multiMessage = alertGet.multiMessage;
      $scope.alert.optiLogstash = alertGet.optiLogstash;

      // Load script information
      if (alertGet.script) {
        $scope.alert.scriptChecked = alertGet.script.enabled;
        $http.get('../api/robocop/script/' + $routeParams.id).then((response) => {
            $scope.alert.hasScript = response.data.exist;
            $scope.alert.script.name = alertGet.script.name;
        });

        // Script args
        for (var idArg in alertGet.script.arguments) {
          switch(alertGet.script.arguments[idArg]) {
            case "alert":
              $scope.scriptArgs.alert = true;
              break;
            case "idAlert":
              $scope.scriptArgs.idAlert = true;
              break;
            case "idHistory":
              $scope.scriptArgs.idHistory = true;
              break;
            case "date":
              $scope.scriptArgs.date = true;
              break;
            case "message":
              $scope.scriptArgs.message = true;
              break;
            case "result":
              $scope.scriptArgs.result = true;
              break;
          }
        }
      }

      // Fill action input
      for (var idAction in alertGet.action) {
        let action = alertGet.action[idAction];
        if (action.type === 'mail') {
          $scope.mail = action;
          $scope.mail.checked = action.enabled;
          $scope.mail.priority = $scope.mail.priority || 'normal';
        } else if (action.type === 'slack') {
          $scope.slack = action;
          $scope.slack.checked = action.enabled;
        } else if (action.type === 'marvin') {
          $scope.marvin = action;
          $scope.marvin.checked = action.enabled;
        }
      }

      // Period
      $scope.alert.period.type = alertGet.period.type || 'custom'
      if (!alertGet.period.type || alertGet.period.type == 'custom') {
        $scope.alert.period.enabled = alertGet.period.enabled;
        if (alertGet.period.enabled) {
          $scope.alert.period.start = new Date(0,0,0,alertGet.period.start / 100, alertGet.period.start % 100);
          $scope.alert.period.end = new Date(0,0,0,alertGet.period.end / 100, alertGet.period.end % 100);
        }
        $scope.alert.period.days = alertGet.period.days || [false, true, true, true, true, true, false];
      } else {
        $scope.alert.period.enabled = false;
        $scope.alert.period.start = new Date(0,0,0,0,0);
        $scope.alert.period.end = new Date(0,0,0,0,0);
        $scope.alert.period.days = [false, false, false, false, false, false, false]
      }

      //page setting
      $scope.isNew = false;
      $scope.idAlert = $routeParams.id;
    }, (error) => {
      toastNotifications.addDanger('Error when loading alert.');
    });
  }

  /**
   * @function isNew
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Check if it's a new alert
   * @return {Boolean} true if it's a new alert.
   */
  function isNew() {
    return !$routeParams.id;
  };

  /**
   * @function createAlert
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Create an object which represents the alert.
   * @param {Boolean} duplicate - True if it's for the duplication of the current alert.
   */
  function createAlert(duplicate) {
    var newAlert = {
      number : $scope.alert.number,
      title: $scope.alert.title,
      description: $scope.alert.description,
      data: $scope.alert.data,
      irp: $scope.alert.irp,
      category: $scope.alert.category,
      level: $scope.alert.level,
      createdDate: new Date(),
      modifiedDate: new Date(),
      enabled: $scope.alert.enabled,
      multiMessage: $scope.alert.multiMessage,
      optiLogstash: $scope.alert.optiLogstash,
    };

    if (!duplicate) {
      newAlert.createdDate = $scope.alert.createdDate ? $scope.alert.createdDate : newAlert.modifiedDate;
    } else {
      newAlert.createdDate = newAlert.modifiedDate;
    }

    newAlert.watcher = {
      indices     : $scope.alert.watcher.indices || $scope.config.watcher.indices,
      periodicity : $scope.alert.watcher.periodicity,
      request     : $scope.alert.watcher.request,
    }

    // Action
    newAlert.action = [];

    var action = {'type':'mail'};
    action.enabled = $scope.mail.checked;
    action.to = $scope.mail.to || $scope.config.action.mail.to;
    action.from = $scope.mail.from || $scope.config.action.mail.from;
    action.subject = $scope.mail.subject || $scope.config.action.mail.subject;
    action.body = $scope.mail.body || $scope.config.action.mail.body;
    action.priority = $scope.mail.priority;
    newAlert.action.push(action);

    var action = {'type':'slack'};
    action.enabled = $scope.slack.checked;
    action.canal = $scope.slack.canal || $scope.config.action.slack.canal;
    action.name = $scope.slack.name || $scope.config.action.slack.name;
    action.body = $scope.slack.body || $scope.config.action.slack.body;
    newAlert.action.push(action);

    var action = {'type':'marvin'};
    // Category is set when the alert is trigered to follow the change of alert category.
    action.enabled = $scope.marvin.checked;
    action.typeAlert = $scope.marvin.typeAlert || $scope.config.action.marvin.type;
    action.title = $scope.marvin.title || $scope.config.action.marvin.title;
    action.contact = $scope.marvin.contact || $scope.config.action.marvin.contact;
    action.detectionSource = $scope.marvin.detectionSource || $scope.config.action.marvin.detectionSource;
    action.alertSource = $scope.marvin.alertSource || $scope.config.action.marvin.alertSource;
    action.body = $scope.marvin.body || $scope.config.action.marvin.body;
    newAlert.action.push(action);

    // Script
    var script = {enabled: $scope.alert.scriptChecked, arguments: []};
    if ($scope.alert.scriptChecked && ( $scope.alert.hasScript || document.getElementById('file').files[0])) {
      script.name = document.getElementById('file').files[0] ? document.getElementById('file').files[0].name : $scope.alert.script.name;
    } else {
      script.name = "";
    }
    if ($scope.alert.scriptChecked) {
      for (var arg in $scope.scriptArgs) {
        if ($scope.scriptArgs[arg]) {
          script.arguments.push(arg)
        }
      }
    }
    newAlert.script = script;

    // Period
    newAlert.period = {
      type: $scope.alert.period.type
    }

    if (!$scope.alert.period.type || $scope.alert.period.type == 'custom') {
      newAlert.period.enabled = $scope.alert.period.enabled
      if ($scope.alert.period.start) {
        newAlert.period.start = $scope.alert.period.start.getHours() * 100 + $scope.alert.period.start.getMinutes();
      }
      if ($scope.alert.period.end) {
        newAlert.period.end = $scope.alert.period.end.getHours() * 100 + $scope.alert.period.end.getMinutes();
      }
      newAlert.period.days = $scope.alert.period.days;
    } else {
      newAlert.period.enabled = false;
      newAlert.period.start = 0;
      newAlert.period.end = 0;
      newAlert.period.days = [false, false, false, false, false, false, false]
    }
    return newAlert;
  };

  /**
   * @function newAlert
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Add a new alert to ElasticSearch.
   * @param {String} successText - Message to display if success.
   * @param {String} errorText - Message to display if error.
   * @param {Boolean} duplicate - True if it's for the duplication of the current alert.
   * @return {Alert}
   */
  function newAlert(successText, errorText, duplicate) {
    var id = Math.random().toString(36).substr(2,10);
    var al = createAlert(duplicate);

    if (duplicate) {
      duplicate = $routeParams.id;
    }

    if (!duplicate && $scope.alert.scriptChecked && document.getElementById('file').files[0]) {
      var f = document.getElementById('file').files[0];
      if (!f) {return}

      var r = new FileReader();
      r.onloadend = function(e){
        var data = e.target.result;
        var payload = {
          alert: al,
          script: btoa(data),
          duplicate: duplicate,
        }

        $http.post('../api/robocop/alert/new/' + id, payload).then((response) => {
          toastNotifications.addSuccess(successText)
          $scope.alert.hasScript = true;
          $timeout(function() {$window.location.href = '#/alert/edit' + id;}, 1000);
        }, (err) => {
          toastNotifications.addDanger(err.data)
        })
      }
      r.readAsBinaryString(f);
    } else {
      $http.post('../api/robocop/alert/new/' + id, {alert:al, duplicate:duplicate}).then((response) => {
        toastNotifications.addSuccess(successText)
        $timeout(function() {$window.location.href = '#/alert/edit/' + id;}, 1000);
      }, (err) => {
        toastNotifications.addDanger(err.data)
      });
    }
  }

  /**
   * @function updateAlert
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Update an existing alert in ElasticSearch.
   * @param {String} successText - Message to display if success.
   * @param {String} errorText - Message to display if error.
   */
  function updateAlert(successText, errorText) {
    if ($scope.alert.scriptChecked && document.getElementById('file').files[0]) {
      var f = document.getElementById('file').files[0];
      if (!f) {return}

      var r = new FileReader();
      r.onloadend = function(e){
        var data = e.target.result;
        var payload = {
          alert: {doc: createAlert()},
          script: btoa(data),
        }

        $http.post('../api/robocop/alert/update/' + $routeParams.id, payload).then((response) => {
          toastNotifications.addSuccess(successText)
          document.getElementById('file').value = "";
          $timeout(function() {refreshAlert();}, 1000);
        }, (err) => {
          toastNotifications.addDanger(err.data.message)
        })
      }
      r.readAsBinaryString(f);
    } else {
      $http.post('../api/robocop/alert/update/' + $routeParams.id, {alert:{doc: createAlert()}}).then((response) => {
        $timeout(function() {refreshAlert();}, 1000);
        toastNotifications.addSuccess(successText)
      }, (err) => {
        toastNotifications.addDanger(err.data.message)
      });
    }
  }

  /**
   * @function isJson
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Check if str in a JSON valid string. Empty string not allowed.
   * @return {Boolean} True if it's a valid Json
   */
  function isJson(str) {
    try {
      if (str.toString() == "true" || !str) {
        return false;
      }
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  }

  /**
   * @function concatText
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Concat text + separator + text2 if text != ''.
   * Return text2 if text == ''
   *
   * @param {String} text - First element to concat.
   * @param {String} text2 - Second element to concat.
   * @param {String} seperator - Separator.
   * @return {String} concatenation of text, text2 and seperator
   */
  function concatText(text, text2, seperator) {
    if (text == "") {
      return text2;
    } else {
      return text + seperator + text2;
    }
  }

  /**
   * @function checkAlert
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Check if the inputs are correct.
   * @return {Boolean}
   */
  function checkAlert() {
    // return : 0 => error, 1 => warning, 2 => success
    var warningText = '';
    var errorText = '';
    var separator = ' -- ';

    var alert = createAlert();

    // General field
    if (alert.title == '') {errorText = concatText(errorText,'No Title', separator);}
    if (alert.description == '') {warningText = concatText(warningText, 'No description found', separator)}
    if (!isJson(alert.data) && (alert.data != '' && alert.data != undefined)) {errorText = concatText(warningText, 'Data is not a valid JSON', separator)}

    // Watcher
    if (!alert.watcher.indices || !alert.watcher.request || !isJson(alert.watcher.request)) {errorText = concatText(errorText, 'Error in watcher', separator);}
    if ($scope.indices.indexOf(alert.watcher.indices) == -1) {warningText = concatText(warningText, 'Indices does not exist' , separator)}

    // Action
    for (let idAction in alert.action) {
      let action = alert.action[idAction];
      if (action.type == 'mail') {
        if (!action.to || !action.from || !action.body) {errorText = concatText(errorText, 'Error in mail setting', separator);}
      }
      if (action.type == 'slack') {
        if (!action.canal || !action.body) {errorText = concatText(errorText, 'Error in Slack setting', separator);}
      }
      if (action.type == 'marvin') {
        if (!action.body) {errorText = concatText(errorText, 'Error in Marvin setting', separator);}
      }
    }

    //script
    if (!checkFile()) {errorText = concatText(errorText, 'No script to send.', separator);}

    //Setting
    if (alert.multiMessage) {
      if (alert.watcher.request && alert.watcher.request.search('aggs') == -1) {errorText = concatText(errorText, 'Multi message can\'t be enabled without aggregation', separator);}
    }
    if (alert.period.enabled) {
      if (alert.period.start === undefined || alert.period.end === undefined) {errorText = concatText(errorText, 'Error time for the active period', separator);}
    }

    //format result
    if (warningText == '' && errorText == '') {
      return ['success', 'No error found'];
    } else if ( errorText == '') {
      return ['warning', warningText];
    } else {
      return ['danger', errorText];
    }
  }

  /**
   * @function checkFile
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Check if there are a file in the upload input.
   * @return {Boolean}
   */
  function checkFile() {
    if ($scope.alert.scriptChecked) {
      var file = document.getElementById('file').files[0];
      return file ? true : $scope.alert.hasScript;
    } else {
      return true;
    }
  }

  //Buttons fonctions
  /**
   * @function checkRequest
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Check if the alert is valid. Call by "check" button
   */
  $scope.checkRequest = function() {
    var requestValid = isJson($scope.alert.watcher.request);
    if (requestValid) {
      $scope.jsonCheck = 'success';
    } else {
      $scope.jsonCheck = 'danger';
    }
  };

  /**
   * @function validate
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Save the alert. Call by "validate" button
   */
  $scope.validate = function() {
    // function to create the alert in the ES. bind to "Save" button.
    var result = checkAlert();
    if (result[0] == 'danger') {
      toastNotifications.addDanger(result[1])
      return;
    }
    if (isNew()) {
      newAlert('Successfully creating.', 'failure creating.');
    } else {
      updateAlert('Successfully saving.', 'failure saving.');
    }
  };

  /**
   * @function debug
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Display the alert object. Call by "debug" button
   */
  $scope.debug = function() {
    alert(angular.toJson(createAlert(), true));
  };

  /**
   * @function preview
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Display the preview of message.
   * @param {Boolean} show - Show/hide the preview
   * @param {String} type - Type of message to display
   */
  $scope.preview = function(show, type) {
    if (show) {
      var result = checkAlert();
      if (result[0] == 'danger') {
        toastNotifications.addDanger(result[1])
        return;
      }

      var al = createAlert();
      if (type) {
        var tmp;
        for (let idAction in al.action) {
          if (al.action[idAction].type == type) {
            tmp = al.action[idAction];
          }
        }
        if (tmp) {
          al.action = [tmp];
        } else {
          al.action = [];
        }
      }
      var id = $routeParams.id || '';
      $http.post('../api/robocop/alert/preview/' + id, al).then((response) => {
        $scope.previewMsg = response.data;
        $scope.isPreview = true;
        if ( al.script.enabled && isNew()) {
          toastNotifications.addWarning('Save the alert to execute the script')
        }
      }, (err) => {
        toastNotifications.addDanger(err.data || 'Error in request')
      });
    }
    else {
      $scope.isPreview = false;
    }
  };

  /**
   * @function previewReq
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Display the preview of request.
   */
  $scope.previewReq = function() {
    var al = createAlert();
    $http.post('../api/robocop/alert/previewRequest', al.watcher).then((response) => {
      $scope.previewRequestJson = angular.toJson(response.data, true);
      $scope.previewRequest = response.data.error;
      $scope.isPreviewRequest = true;
      $location.hash('anchorPrevReq');
      $timeout(function() {$anchorScroll();}, 100);
    }, (err) => {
      toastNotifications.addWarning('Error in request')
    });
  };

  /**
   * @function delete
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Delete the alert.  Call by "Delete" button.
   */
  $scope.delete = function() {
    var result = confirm('Do you want to delete the alert ?');
    if (result) {
      $http.delete('../api/robocop/alert/delete/' + $routeParams.id).then((response) => {
        toastNotifications.addSuccess('Successfully deleted.')
        $timeout(function() {$window.location.href = '#/alert';}, 1000);
      }, (err) => {
        toastNotifications.addDanger('Failure deleted.')
      });
    }
  }

  /**
   * @function duplicate
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Duplicate the alert. Call by "duplicate" button.
   */
  $scope.duplicate = function() {
    var result = checkAlert();
    if (result[0] == 'danger') {
      toastNotifications.addDanger(result[1])
      return;
    }
    newAlert('Successfully duplicating.', 'failure duplicating.', true);
  }

  /**
   * @function checkButton
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Manage the result of checkAlert. Call by "check" button.
   */
  $scope.checkButton = function() {
    var result = checkAlert();
    if (result[0] == 'success') {
      toastNotifications.addSuccess(result[1])
    } else if (result[0] == 'warning') {
      toastNotifications.addWarning(result[1])
    } else {
      toastNotifications.addDanger(result[1])
    }
  }

  /**
   * @function selectWorkWeek
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Select/deselect Monday, Thuesday, Wednesday, Thursday and Friday.
   * Deselect only if the 5 days is select.
   */
  $scope.selectWorkWeek = function() {
    let days = $scope.alert.period.days;
    if (days[1] && days[2] && days[3] && days[4] && days[5]) {
      $scope.alert.period.days[1] = $scope.alert.period.days[2] = $scope.alert.period.days[3] = $scope.alert.period.days[4] = $scope.alert.period.days[5] = false
      $scope.alert.period.days[0] = $scope.alert.period.days[6] = false;
    } else {
      $scope.alert.period.days[1] = $scope.alert.period.days[2] = $scope.alert.period.days[3] = $scope.alert.period.days[4] = $scope.alert.period.days[5] = true;
      $scope.alert.period.days[0] = $scope.alert.period.days[6] = false;
    }
  }

  /**
   * @function selectWeek
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Select/deselect all the week.
   * Deselect only if the 7 days is select.
   */
  $scope.selectWeek = function() {
    let days = $scope.alert.period.days;
    if (days[1] && days[2] && days[3] && days[4] && days[5] && days[6] && days[0]) {
      $scope.alert.period.days[0] = $scope.alert.period.days[1] = $scope.alert.period.days[2] = $scope.alert.period.days[3] = $scope.alert.period.days[4] = $scope.alert.period.days[5] = $scope.alert.period.days[6] = false;
    } else {
      $scope.alert.period.days[0] = $scope.alert.period.days[1] = $scope.alert.period.days[2] = $scope.alert.period.days[3] = $scope.alert.period.days[4] = $scope.alert.period.days[5] = $scope.alert.period.days[6] = true;
    }
  }

  /**
   * @function openLog
   * @memberof angular_module.robocop.controller.robocopAlertEditController
   * @description Open the page log for this alert.
   */
  $scope.openLog = function() {
    if (!isNew()) {
      kbnUrl.change('/management/log/' + $routeParams.id + '?object=alert');
    }
  }

})

/**
 * @class angular_module.robocop.controller.robocopAlertTableController
 * @description Controller for alertTable.html. Control the alert's table.
 * @param $scope {service}
 * @param $http {service}
 * @param $window {service}
 */
.controller("robocopAlertTableController", function($scope, $http, $window) {
  $http.get('../api/robocop/alert/getAllSummary').then((response) => {
    response = response.data.hits.hits;
    this.alerts = [];
    var totalAlertOn = 0;
    for (var idAlert in response) {
      var el = {
        id: response[idAlert]._id,
        number: response[idAlert]._source.number,
        title: response[idAlert]._source.title,
        description: response[idAlert]._source.description,
        category: response[idAlert]._source.category,
        level: response[idAlert]._source.level,
        status: response[idAlert]._source.enabled,
        script: response[idAlert]._source.script.enabled,
        periodicity: response[idAlert]._source.watcher.periodicity,
        createdDate: new Date(response[idAlert]._source.createdDate),
        modifiedDate: new Date(response[idAlert]._source.modifiedDate),
      }

      for (var action in response[idAlert]._source.action) {
        action = response[idAlert]._source.action[action];
        if (action.enabled) {
          el[action.type] = true;
        }
      }


      el.period = {};
      el.period.type = response[idAlert]._source.period.type;
      if (response[idAlert]._source.period.enabled) {
          el.period.start = response[idAlert]._source.period.start;
          el.period.end = response[idAlert]._source.period.end;
      }
      el.period.days = response[idAlert]._source.period.days;
      this.alerts.push(el);
      if (el.status) {
        totalAlertOn += 1;
      }
    }

    if ($scope.$parent && $scope.$parent.$parent) {
      $scope.$parent.$parent.totalAlert = this.alerts.length;
      $scope.$parent.$parent.totalAlertOn = totalAlertOn;
      $scope.$parent.$parent.totalAlertOff = $scope.$parent.$parent.totalAlert - totalAlertOn;
    }

  }, error => {
  });

  $scope.filterCategories = [{'name': '_', 'filter' : true}];
  $scope.filterSeverities = [{'name': '_', 'filter' : true}];
  $scope.filterStatus = [{'name': 'enabled', 'filter' : true}, {'name': 'disabled', 'filter' : true}];


  $http.get('../api/robocop/config/adv/alertLevel,alertCategory').then((response) => {
    $scope.level = {}
    $scope.levelOrder = []
    for (var indexLevel in response.data._source.alertLevel) {
      var levelCurrent = response.data._source.alertLevel[indexLevel].split(':')
      if (levelCurrent.length == 2) {
        $scope.level[levelCurrent[0]] = levelCurrent[1]
      } else {
        $scope.level[levelCurrent[0]] = 'black'
      }
      $scope.levelOrder.push(levelCurrent[0])
      $scope.filterSeverities.push({'name' : levelCurrent[0], 'filter' : true});
    }

    $scope.categories = []
    for (var indexCategory in response.data._source.alertCategory) {
      $scope.categories.push(response.data._source.alertCategory[indexCategory]);
      $scope.filterCategories.push({'name' : response.data._source.alertCategory[indexCategory], 'filter' : true});
    }
  })

  this.alertTable = {
    len           : function() {return $scope.results ? $scope.results.length : 0},
    sortName      : 'number',
    sortReverse   : false,
    searchWord    : '',
    category      : '',
    index         : 0,
    numberDisplay : 20,
    previous      : function() {if (this.index > 0) {this.index -= 1}},
    next          : function() {if (this.index < this.len() / this.numberDisplay - 1)  {this.index += 1}},
    show          : function(indexRow) {return indexRow >= this.index * this.numberDisplay && indexRow < (this.index + 1) * this.numberDisplay},
  };
  var alertTable = this.alertTable

  /**
   * @function sortTable
   * @memberOf angular_module.robocop.controller.robocopAlertTableController
   * @description Sort the alerts. Use the alphanumeric order or level like configur in management.
   * @param value {Object} the element to sort
   * @return Return the field of the parameter "value" used to sort or its position (for sort by level).
   */
  this.sortTable = function(value) {
    if (alertTable.sortName == 'level') {
      return $scope.levelOrder.indexOf(value.level)
    } else {
      return value[alertTable.sortName]
    }
  }

  /**
   * @function filterCheck
   * @memberOf angular_module.robocop.controller.robocopAlertTableController
   * @description Check if the element search should be display depending of filter. The element must be enabled in the filter.
   * @param search {String} The element to search
   * @param filter {Object[]} The list to search. ex: [{'name': 'XXX', 'filter' : true}, ...]
   * @return Return true if search should be display
   */
  function filterCheck(search, filter) {
    if (!search) {
      return filter[0].filter;
    }
    for (let elem in filter) {
      elem = filter[elem];
      if (elem.filter && elem.name == search  ) {
        return true;
      }
    }
    return false
  }

  /**
   * @function filterFn
   * @memberOf angular_module.robocop.controller.robocopAlertTableController
   * @description Check if the element search should be display. it use the search word and filter
   * @param elem {Object} The element to analyse
   * @return Return true if search should be display
   */
  $scope.filterFn = function(elem) {
    if (elem.title.toLowerCase().indexOf(alertTable.searchWord.toLowerCase()) !== -1 || elem.number.toLowerCase().indexOf(alertTable.searchWord.toLowerCase()) !== -1) {
      if (filterCheck(elem.category, $scope.filterCategories) && filterCheck(elem.level, $scope.filterSeverities) && filterCheck(elem.status ? 'enabled' : 'disabled', $scope.filterStatus)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @name newAlert
   * @function
   * @memberOf angular_module.robocop.controller.robocopAlertTableController
   * @description Open the page to create an alert.
   */
  this.newAlert = function() {
    $window.location.href = '#/alert/edit/';
  }
})
