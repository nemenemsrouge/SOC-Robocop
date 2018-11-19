import { toastNotifications } from 'ui/notify';

var modules = require('ui/modules');

if (!modules) {
  modules = require('ui/modules').uiModules;
}

modules.get('app/robocop')

/**
 * @class angular_module.robocop.controller.robocopCronController
 * @description Controller for cron.html. Control the index of cron.
 * @param $scope {service}
 */
.controller('robocopCronController', function ($scope) {
  // NavBar settings
  $scope.navbarPage = 'cron';
})

/**
 * @class angular_module.robocop.controller.robocopCronEditController
 * @description Controller for editCron.html. Control the management of a cron.
 * @param $window {service}
 * @param $routeParams {service}
 * @param $scope {service}
 * @param $http {service}
 * @param $timeout {service}
 * @param kbnUrl {service} Kibana service to manage url
 * @param Notifier {service} Kibana service to manage Notification
 */
.controller('robocopCronEditController', function ($window, $routeParams, $scope, $http, $timeout, kbnUrl, Notifier) {
  //NavBar settings
  $scope.navbarPage = 'cron';


  //New cron
  $scope.cron = {
    title :'',
    description:'',
    data:'',
    request:{},
    script:{},
    enabled: true,
    period:{
      enabled : false,
      days    : [false, true, true, true, true, true, false]
    },
    debug: {}
  };
  $scope.cron.request = {method: 'GET', path: '', data: ''};

  // Script
  $scope.script = {
    enabled: false,
    hasScript: false
  };
  $scope.scriptArgs = {};

  //settings for check the json of data.
  $scope.jsonCheck = 'default';

  // Init variable for action setting.
  $scope.actionConfig = {
    mail   : {enabled:true, fields: ['to', 'from', 'priority', 'subject']},
    slack  : {enabled:true, fields: ['canal', 'name']},
    marvin : {enabled:true, fields: ['type', 'title', 'contact','detectionSource', 'alertSource', 'category', 'criticity']}
  };

  //ACE editor
  $scope.aceLoaded = function (_editor) {
    _editor.$blockScrolling = Infinity;
  };

  // GET config from API
  $http.get('../api/robocop/config/getAll').then((response) => {
    $scope.config = response.data;
  });

  // GET Adv config
  $http.get('../api/robocop/config/adv/cronCategory').then((response) => {
    $scope.category = response.data._source.cronCategory;
  });

  if (!isNew()) {
    refreshCron();
    $scope.isNew = false;
  } else {
    $scope.isNew = true;
  }

  /**
   * @function refreshCron
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Load an cron saved in Elasticsearch. Use the id in $routeParams.
   */
  function refreshCron() {
    // Load cron from ES.
    $http.get('../api/robocop/cron/get/' + $routeParams.id).then((response) => {
      var cronGet = response.data._source;
      $scope.cron.title = cronGet.title;
      $scope.cron.category = cronGet.category;
      $scope.cron.description = cronGet.description;
      $scope.cron.data = cronGet.data;
      $scope.cron.createdDate = cronGet.createdDate;
      $scope.period.periodicity = cronGet.periodicity;
      $scope.cron.enabled = cronGet.enabled;
      $scope.cron.request = {
        method:cronGet.request.method,
        path:cronGet.request.path,
        data:cronGet.request.data
      };

      // Script
      if (cronGet.script) {
        $scope.script.enabled = cronGet.script.enabled;
        $http.get('../api/robocop/script/' + $routeParams.id).then((response) => {
          $scope.script.hasScript = response.data.exist;
          $scope.script.name = cronGet.script.name;
        });

        // Script args
        for (var idArg in cronGet.script.arguments) {
          switch (cronGet.script.arguments[idArg]) {
            case 'cron':
              $scope.scriptArgs.cron = true;
              break;
            case 'idCron':
              $scope.scriptArgs.idCron = true;
              break;
            case 'status':
              $scope.scriptArgs.status = true;
              break;
            case 'date':
              $scope.scriptArgs.date = true;
              break;
            case 'result':
              $scope.scriptArgs.result = true;
              break;
          }
        }
      }

      // Fill action input
      for (var idAction in cronGet.action) {
        let action = cronGet.action[idAction];
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
      $scope.period.type = cronGet.period.type || 'custom';
      $scope.period.dayName = cronGet.period.dayWeek;
      $scope.period.dayNbr = cronGet.period.dayMonth;
      $scope.period.time = new Date(0,0,0,cronGet.period.time / 100, cronGet.period.time % 100);

      if (!cronGet.period.type || cronGet.period.type === 'custom') {
        $scope.cron.period.enabled = cronGet.period.enabled;
        if (cronGet.period.enabled) {
          $scope.period.start = new Date(0,0,0,cronGet.period.start / 100, cronGet.period.start % 100);
          $scope.period.end = new Date(0,0,0,cronGet.period.end / 100, cronGet.period.end % 100);
        }
        $scope.period.days = cronGet.period.days || [false, true, true, true, true, true, false];
      } else {
        $scope.period.enabled = false;
        $scope.period.start = new Date(0,0,0,0,0);
        $scope.period.end = new Date(0,0,0,0,0);
        $scope.period.days = [false, false, false, false, false, false, false];
      }

      // Debug
      $scope.cron.debug =  cronGet.debug || {};

    }, (error) => {
      toastNotifications.addDanger('Error when loading cron.');
    });
  }

  /**
   * @function isNew
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Check if it's a new cron. Use the url.
   * @return {Boolean} true if it's a new cron.
   */
  function isNew() {
    return !$routeParams.id;
  };

  /**
   * @function createCron
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Create an object which represents the cron.
   * @param {Boolean} duplicate - True if it's a copy of the current cron.
   */
  function createCron(duplicate) {
    var newCron = {
      title: $scope.cron.title,
      category: $scope.cron.category,
      description: $scope.cron.description,
      data: $scope.cron.data,
      enabled: $scope.cron.enabled,
      createdDate: new Date(),
      modifiedDate: new Date(),
      periodicity : $scope.period.periodicity,
    };

    if (!duplicate) {
      newCron.createdDate = $scope.cron.createdDate ? $scope.cron.createdDate : newCron.modifiedDate;
    } else {
      newCron.createdDate = newCron.modifiedDate;
    }

    newCron.request = {
      method : $scope.cron.request.method,
      path   : $scope.cron.request.path,
      data   : $scope.cron.request.data,
    };

    // Action
    newCron.action = [];
    var action = {'type':'mail'};
    action.enabled = $scope.mail.checked;
    action.to = $scope.mail.to || $scope.config.action.mail.to;
    action.from = $scope.mail.from || $scope.config.action.mail.from;
    action.subject = $scope.mail.subject || $scope.config.action.mail.subject;
    //action.body = $scope.mail.body || '';
    action.priority = $scope.mail.priority || 'normal';
    newCron.action.push(action);

    action = {'type':'slack'};
    action.enabled = $scope.slack.checked;
    action.canal = $scope.slack.canal || $scope.config.action.slack.canal;
    action.name = $scope.slack.name || $scope.config.action.slack.name;
    //action.body = $scope.slack.body; // || $scope.config.action.slack.body;
    newCron.action.push(action);

    action = {'type':'marvin'};
    action.enabled = $scope.marvin.checked;
    action.typeAlert = $scope.marvin.typeAlert || $scope.config.action.marvin.type;
    action.title = $scope.marvin.title || $scope.config.action.marvin.title;
    action.contact = $scope.marvin.contact || $scope.config.action.marvin.contact;
    action.detectionSource = $scope.marvin.detectionSource || $scope.config.action.marvin.detectionSource;
    action.alertSource = $scope.marvin.alertSource || $scope.config.action.marvin.alertSource;
    action.body = $scope.marvin.body || $scope.config.action.marvin.body;
    action.criticity = $scope.marvin.criticity || $scope.config.action.marvin.criticity;
    action.category = $scope.marvin.category || $scope.config.action.marvin.category;
    newCron.action.push(action);

    // Script
    var script = {enabled: $scope.script.enabled, arguments: []};
    if ($scope.script.enabled && ($scope.script.hasScript || document.getElementById('file').files[0])) {
      script.name = document.getElementById('file').files[0] ? document.getElementById('file').files[0].name : $scope.script.name;
    } else {
      script.name = '';
    }
    if ($scope.script.enabled) {
      for (var arg in $scope.scriptArgs) {
        if ($scope.scriptArgs[arg]) {
          script.arguments.push(arg);
        }
      }
    }
    newCron.script = script;

    // Period
    newCron.period = {
      enabled: $scope.period.enabled,
      type: $scope.period.type
    };
    if ($scope.cron.period.start) {
      newCron.period.start = $scope.cron.period.start.getHours() * 100 + $scope.cron.period.start.getMinutes();
    }
    if ($scope.cron.period.end) {
      newCron.period.end = $scope.cron.period.end.getHours() * 100 + $scope.cron.period.end.getMinutes();
    }
    newCron.period.days = $scope.period.days;

    if ($scope.period.periodicity === '1 days') {
      newCron.period.dayWeek = '';
      newCron.period.dayMonth = '';
      newCron.period.time = $scope.period.time.getHours() * 100 + $scope.period.time.getMinutes();
    } else if ($scope.period.periodicity === '7 days' && $scope.period.dayName) {
      newCron.period.dayWeek = $scope.period.dayName;
      newCron.period.dayMonth = '';
      newCron.period.time = $scope.period.time.getHours() * 100 + $scope.period.time.getMinutes();
    } else if ($scope.period.periodicity === '1 months' && $scope.period.dayNbr) {
      newCron.period.dayWeek = '';
      newCron.period.dayMonth = $scope.period.dayNbr;
      newCron.period.time = $scope.period.time.getHours() * 100 + $scope.period.time.getMinutes();
    }

    if (!$scope.period.type || $scope.period.type === 'custom') {
      newCron.period.enabled = $scope.period.enabled;
      if ($scope.period.start) {
        newCron.period.start = $scope.period.start.getHours() * 100 + $scope.period.start.getMinutes();
      }
      if ($scope.period.end) {
        newCron.period.end = $scope.period.end.getHours() * 100 + $scope.period.end.getMinutes();
      }
      newCron.period.days = $scope.period.days;
    } else {
      newCron.period.enabled = false;
      newCron.period.start = 0;
      newCron.period.end = 0;
      newCron.period.days = [false, false, false, false, false, false, false];
    }

    //Debug
    newCron.debug = $scope.cron.debug;

    return newCron;
  };

  /**
   * @function newCron
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Add a new cron to ElasticSearch.
   * @param {String} successText - Message to display if success.
   * @param {String} errorText - Message to display if error.
   * @param {Boolean} duplicate - True if it's a copy of the current cron.
   * @return {Cron}
   */
  function newCron(successText, errorText, duplicate) {
    var id = Math.random().toString(36).substr(2,10);
    var cron = createCron(duplicate);

    if (duplicate) {
      duplicate = $routeParams.id;
    }


    if ($scope.script.enabled && document.getElementById('file').files[0]) {
      var f = document.getElementById('file').files[0];
      if (!f) {return;}

      var r = new FileReader();
      r.onloadend = function (e) {
        var data = e.target.result;
        var payload = {
          cron: cron,
          script: btoa(data),
          duplicate: duplicate,
        };

        $http.post('../api/robocop/cron/new/' + id, payload).then((response) => {
          toastNotifications.addSuccess(successText);
          $scope.script.hasScript = true;
          $timeout(function () {$window.location.href = '#/cron/edit/' + id;}, 1000);
        }, (err) => {
          toastNotifications.addDanger(errorText);
        });
      };
      r.readAsBinaryString(f);
    } else {
      $http.post('../api/robocop/cron/new/' + id, {cron:cron, duplicate:duplicate}).then((response) => {
        toastNotifications.addSuccess(successText);
        $timeout(function () {$window.location.href = '#/cron/edit/' + id;}, 1000);
      }, (err) => {
        toastNotifications.addDanger(errorText);
      });
    }
  }

  /**
   * @function updateCron
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Update an existing cron in ElasticSearch.
   * @param {String} successText - Message to display if success.
   * @param {String} errorText - Message to display if error.
   */
  function updateCron(successText, errorText) {
    if ($scope.script.enabled && document.getElementById('file').files[0]) {
      var f = document.getElementById('file').files[0];
      if (!f) {return;}

      var r = new FileReader();
      r.onloadend = function (e) {
        var data = e.target.result;
        var payload = {
          cron: {doc: createCron()},
          script: btoa(data),
        };

        $http.post('../api/robocop/cron/update/' + $routeParams.id, payload).then((response) => {
          toastNotifications.addSuccess(successText);
          document.getElementById('file').value = '';
          $timeout(function () {refreshCron();}, 1000);

        }, (err) => {
          toastNotifications.addDanger(errorText);
        });
      };
      r.readAsBinaryString(f);
    } else {
      $http.post('../api/robocop/cron/update/' + $routeParams.id, {cron:{doc: createCron()}}).then((response) => {
        $timeout(function () {refreshCron();}, 1000);
        toastNotifications.addSuccess(successText);
      }, (err) => {
        toastNotifications.addDanger(errorText);
      });
    }
  }

  /**
   * @function isJson
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Check if str in a JSON valid string. Empty string is allowed.
   * @return {Boolean} True if it's a valid Json
   */
  function isJson(str) {
    if (str == '') {
      return true;
    }
    try {
      if (str.toString() == 'true' || !str) {
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
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Concat text + separator + text2 if text != ''.
   * Return text2 if text == ''

   * @param {String} text - First element to concat.
   * @param {String} text2 - Second element to concat.
   * @param {String} seperator - Separator.
   * @return {String} concatenation of text, text2 and seperator
   */
  function concatText(text, text2, seperator) {
    if (text == '') {
      return text2;
    } else {
      return text + seperator + text2;
    }
  }

  /**
   * @function checkCron
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Check if the inputs are correct.
   * @return {Boolean}
   */
  function checkCron() {
    // return : 0 => error, 1 => warning, 2 => success
    var warningText = '';
    var errorText = '';
    var separator = ' --';
    var cron = createCron();

    // General field
    if (cron.title == '') {errorText = concatText(errorText,'No Title', separator);}
    if (cron.description == '') {warningText = concatText(warningText, 'No description found', separator);}
    if (!isJson(cron.data) && (cron.data !== '' && cron.data !== undefined)) {
      errorText = concatText(warningText, 'Data is not a valid JSON', separator);
    }

    // Request
    if (!cron.request.path && !isJson(cron.request.data)) {
      warningText = concatText(warningText, 'No request', separator);
    }
    if ((cron.request.data && !cron.request.path) || !isJson(cron.request.data)) {errorText = concatText(errorText, 'Error in request', separator);}

    //script
    if (!checkFile()) {errorText = concatText(errorText, 'No script to send.', separator);}

    // Period
    if (cron.period.enabled) {
      if (cron.period.start === undefined || cron.period.end === undefined) {
        errorText = concatText(errorText, 'Error time for the active period', separator);
      }
    }

    // Action
    for (let idAction in cron.action) {
      let action = cron.action[idAction];
      if (action.enabled) {
        if (action.type === 'mail') {
          if (!action.to || !action.from) {errorText = concatText(errorText, 'Error in mail setting', separator);}
        }
        if (action.type === 'slack') {
          if (!action.canal) {errorText = concatText(errorText, 'Error in Slack setting', separator);}
        }
        //if (action.type === 'marvin') {
      //    if (!action.body) {errorText = concatText(errorText, 'Error in Marvin setting', separator);}
      //  }
      }
    }

    //format result
    if (warningText == '' && errorText == '') {
      return ['success', 'No error found'];
    } else if (errorText == '') {
      return ['warning', warningText];
    } else {
      return ['danger', errorText];
    }
  }

  /**
   * @function checkFile
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Check if there are a file in the upload input.
   * @return {Boolean}
   */
  function checkFile() {
    if ($scope.script.enabled) {
      var file = document.getElementById('file').files[0];
      return file ? true : $scope.script.hasScript;
    } else {
      return true;
    }
  }

  //Buttons fonctions
  /**
   * @function validate
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Save the cron. Call by "validate" button
   */
  $scope.validate = function () {
    // function to create the cron in the ES. bind to "Save" button.
    var result = checkCron();
    if (result[0] === 'danger') {
      toastNotifications.addDanger(result[1]);
      return;
    }
    if (isNew()) {
      newCron('Successfully creating.', 'Failure during the creation of the cron.');
    } else {
      updateCron('Successfully saving.', 'The save failed');
    }
  };

  /**
   * @function debug
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Display the cron object. Call by "debug" button
   */
  $scope.debug = function () {
    alert(angular.toJson(createCron(), true));
  };

  /**
   * @function delete
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Delete the cron.  Call by "Delete" button.
   */
  $scope.delete = function () {
    var result = confirm('Do you want to delete the cron ?');
    if (result) {
      $http.delete('../api/robocop/cron/delete/' + $routeParams.id).then((response) => {
        toastNotifications.addSuccess('Successfully deleted.');
        $timeout(function () {$window.location.href = '#/cron';}, 1000);
      }, (err) => {
        toastNotifications.addDanger('The deletion failed');
      });
    }
  };

  /**
   * @function duplicate
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Duplicate the cron. Call by "duplicate" button.
   */
  $scope.duplicate = function () {
    var result = checkCron();
    if (result[0] === 'danger') {
      toastNotifications.addDanger(result[1]);
      return;
    }
    newCron('Successfully duplicating.', 'Failure duplicating.', true);
  };

  /**
   * @function checkButton
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Manage the result of checkCron. Call by "check" button.
   */
  $scope.checkButton = function () {
    var result = checkCron();
    if (result[0] === 'success') {
      toastNotifications.addSuccess(result[1]);
    } else if (result[0] === 'warning') {
      toastNotifications.addWarning(result[1]);
    } else {
      toastNotifications.addDanger(result[1]);
    }
  };

  /**
   * @function execute
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Execute the cron.
   */
  $scope.execute = function () {
    $http.get('../api/robocop/cron/execute/' + $routeParams.id).then((response) => {
      toastNotifications.addSuccess('Cron executed.');
    }, (err) => {
      toastNotifications.addDanger('Server send an error.');
    });
  };

  /**
   * @function selectWorkWeek
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Select/deselect Monday, Thuesday, Wednesday, Thursday and Friday.
   * Deselect only if the 5 days is select.
   */
  $scope.selectWorkWeek = function () {
    let days = $scope.cron.period.days;
    if (days[1] && days[2] && days[3] && days[4] && days[5]) {
      $scope.cron.period.days[1] = $scope.cron.period.days[2] = $scope.cron.period.days[3] = $scope.cron.period.days[4] = $scope.cron.period.days[5] = false;
      $scope.cron.period.days[0] = $scope.cron.period.days[6] = false;
    } else {
      $scope.cron.period.days[1] = $scope.cron.period.days[2] = $scope.cron.period.days[3] = $scope.cron.period.days[4] = $scope.cron.period.days[5] = true;
      $scope.cron.period.days[0] = $scope.cron.period.days[6] = false;
    }
  };

  /**
   * @function selectWeek
   * @memberof angular_module.robocop.controller.robocopCronEditController
   * @description Select/deselect all the week.
   * Deselect only if the 7 days is select.
   */
  $scope.selectWeek = function () {
    let days = $scope.cron.period.days;
    if (days[1] && days[2] && days[3] && days[4] && days[5] && days[6] && days[0]) {
      $scope.cron.period.days[0] = $scope.cron.period.days[1] = $scope.cron.period.days[2] = $scope.cron.period.days[3] = $scope.cron.period.days[4] = $scope.cron.period.days[5] = $scope.cron.period.days[6] = false;
    } else {
      $scope.cron.period.days[0] = $scope.cron.period.days[1] = $scope.cron.period.days[2] = $scope.cron.period.days[3] = $scope.cron.period.days[4] = $scope.cron.period.days[5] = $scope.cron.period.days[6] = true;
    }
  };

  $scope.openLog = function () {
    if (!isNew()) {
      kbnUrl.change('/management/log/' + $routeParams.id + '?object=cron');
    }
  };
})

/**
 * @class angular_module.robocop.controller.cronTableController
 * @description Controller for cronTable.html. Control the cron's table.
 * @param $scope {service}
 * @param $http {service}
 * @param $window {service}
 */
.controller('cronTableController', function ($scope, $http, $window) {
  // Cron table
  $http.get('../api/robocop/cron/getAllSummary').then((response) => {
    response = response.data.hits.hits;
    this.cron = [];
    for (var idCron in response) {
      var el = {
        id: response[idCron]._id,
        title: response[idCron]._source.title,
        status: response[idCron]._source.enabled,
        script: response[idCron]._source.script.enabled,
        periodicity: response[idCron]._source.periodicity,
        createdDate: new Date(response[idCron]._source.createdDate),
        modifiedDate: new Date(response[idCron]._source.modifiedDate)
      };

      for (var action in response[idCron]._source.action) {
        action = response[idCron]._source.action[action];
        if (action.enabled) {
          el[action.type] = true;
        }
      }

      el.period = {};
      el.period.type = response[idCron]._source.period.type;
      if (response[idCron]._source.period.enabled) {
        el.period.start = response[idCron]._source.period.start;
        el.period.end = response[idCron]._source.period.end;
      }
      el.period.days = response[idCron]._source.period.days;
      this.cron.push(el);
    }
  });

  this.cronTable = {
    len           : function () {return $scope.results ? $scope.results.length : 0;},
    sortName      : 'title',
    sortReverse   : false,
    searchWord    : '',
    index         : 0,
    numberDisplay : 10,
    previous      : function () {if (this.index > 0) {this.index -= 1;}},
    next          : function () {if (this.index < this.len() / this.numberDisplay - 1)  {this.index += 1;}},
    show          : function (indexRow) {return indexRow >= this.index * this.numberDisplay && indexRow < (this.index + 1) * this.numberDisplay;},
  };

  /**
   * @name newCron
   * @function
   * @memberOf angular_module.robocop.controller.cronTableController
   * @description Open the page to create a cron.
   */
  this.newCron = function () {
    $window.location.href = '#/cron/edit/';
  };
});
