import { toastNotifications } from 'ui/notify';
import { timefilter } from 'ui/timefilter';

var modules = require('ui/modules');

if (!modules) {
  modules = require('ui/modules').uiModules
}

modules.get('app/robocop')

/**
 * @class angular_module.robocop.controller.robocopManagementController
 * @description Controller for management.html. Control the management of robocop and snapshot.
 */
.controller("robocopManagementController", function($scope, $http, $timeout, $window, Notifier) {
    // NavBar settings
    $scope.navbarPage = "management";

    $scope.date = new Date();

    // load config
    $http.get('../api/robocop/config/adv/').then((response) => {
      for (let idConfig in response.data._source) {
        $scope[idConfig] = response.data._source[idConfig];
        $scope[idConfig + 'Save'] = response.data._source[idConfig];
      }
    }, (err) => {
      toastNotifications.addDanger("Fail to load config");
    })

    //Snapshot list
    $scope.itemlist = [];
    /**
     * @function refresh
     * @memberof angular_module.robocop.controller.robocopManagementController
     * @description Refresh the list of all the snpashots.
     */
    function refresh() {
        $scope.itemlist = [];
        $scope.snapshotSelected = '';
        $http.get('../api/robocop/snapshot/getAll').then((response) => {

            for (var indexSnapshot in response.data.snapshots) {
                $scope.itemlist.push({
                    name: response.data.snapshots[indexSnapshot].snapshot,
                    date: new Date(response.data.snapshots[indexSnapshot].start_time)
                });
            }
        }, (err) => {
          $scope.alertMessage = "Fail to load snapshot : " + err.data;
        })
    }
    refresh();

    /**
     * @function backup
     * @memberof angular_module.robocop.controller.robocopManagementController
     * @description Create a backup in Elasticsearch. Use the name gives by the user or generate one: "robocop_TIMESTAMPS"
     */
    $scope.backup = function() {
        if (!$scope.nameSnapshotBck || $scope.nameSnapshotBck == "") {
            var date = new Date();
            var nameSnapshot = 'robocop_' + date.valueOf();
        } else {
            var nameSnapshot = $scope.nameSnapshotBck.replace(/ /g, '_');
        }

        $http.post('../api/robocop/snapshot/new/' + nameSnapshot, {}).then((response) => {
            toastNotifications.addSuccess('Backup done')
            $timeout(function() {refresh();}, 500);
        }, (err) => {
            toastNotifications.addDanger('Backup fail: ' + err.data || err);
        })
    }


    /**
     * @function restore
     * @memberof angular_module.robocop.controller.robocopManagementController
     * @description Restore a previous backup selected with "select" function.
     */
    $scope.restore = function() {
        if ($scope.snapshotSelected == '') {toastNotifications.addDanger("No snapshot selected"); return}

        $http.post('../api/robocop/snapshot/restore/' + $scope.snapshotSelected).then((response) => {
            toastNotifications.addSuccess('Snapshot restored');
        }, (err) => {
            toastNotifications.addDanger('Restore fail');
        })

    }
    $scope.snapshotSelected = '';

    /**
     * @function select
     * @memberof angular_module.robocop.controller.robocopManagementController
     * @description Select a snpashot in the list before choose an option.
     * @param {String} name - Name of the snapshot.
     */
    $scope.select = function(name) {
        if ($scope.snapshotSelected == '') {
            $scope.snapshotSelected = name;
        } else {
            $scope.snapshotSelected = '';
        }
    }

    /**
     * @function delete
     * @memberof angular_module.robocop.controller.robocopManagementController
     * @description Delete the snapshot selected with "select" function.
     */
    $scope.delete = function(name) {
        if ($scope.snapshotSelected == '') {toastNotifications.addDanger("No snapshot selected"); return}

        $http.post('../api/robocop/snapshot/delete/' + $scope.snapshotSelected).then((response) => {
            $timeout(function() {refresh();}, 500);
        }, (err) => {
            toastNotifications.addDanger("Restore fail: " + err.data || err);
        })
    }

    /**
     * @function export
     * @memberof angular_module.robocop.controller.robocopManagementController
     * @description Export the index robocop in JSON format.
     */
    $scope.export = function() {
        $http.get('../api/robocop/export').then((response) => {
            var a = document.createElement("a");
            document.body.appendChild(a);
            a.style = "display: none";

            var date = new Date();
            a.download = 'robocop_' + date.toISOString() + '.json';
            var blob = new Blob([ angular.toJson(response.data.hits.hits)], {type: 'text/plain'});
            a.href = (window.URL || window.webkitURL).createObjectURL(blob);
            a.click();
            window.URL.revokeObjectURL(a.href);

        }, error => {
            toastNotifications.addDanger("error, can't export");
        });
    }

    /**
     * @function export
     * @memberof angular_module.robocop.controller.robocopManagementController
     * @description Check if there are a file to upload.
     */
    function isFile() {
        return document.getElementById('file').files[0] ? true : false;
    };

    /**
     * @function import
     * @memberof angular_module.robocop.controller.robocopManagementController
     * @description Import a file in JSON to fill the Elasticsearch. Return the list of id not add.
     */
    $scope.import = function() {
        if (isFile()) {
            var f = document.getElementById('file').files[0];
            if (!f) {toastNotifications.addDanger("No file selected");return}

            var r = new FileReader();
            r.onloadend = function(e){
                var data = e.target.result;
                var payload = data;

                $http.post('../api/robocop/import', payload).then((response) => {
                    document.getElementById('file').value = '';
                    toastNotifications.addSuccess('All documents imported');
                }, (err) => {
                    toastNotifications.addDanger('Some documents fail to import : ' + JSON.stringify(err.data));
                })
            }
            r.readAsBinaryString(f);
        }
    }

    /**
     * @function saveconfig
     * @memberof angular_module.robocop.controller.robocopManagementController
     * @description Save the config.
     * @param {String} field - Name of the option.
     * @param {} value - Value of the option.
     */
    $scope.saveconfig = function(field, value, array=false, rexep="") {
        if (array && !Array.isArray(value)) {
            value = value.split(/\s*,\s*/)
        }

        // Check work day
        if (field == "workerDay") {
          var days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
          for (let index in value) {
            var day = value[index]
            if (days.indexOf(day) == -1) {
              $scope[field + 'Check'] = true;
              toastNotifications.addDanger("Day '" + day + "' not a day (mon, tue, wed, thu, fri, sat, sun)");
              return;
            }
          }
        }

        // Check html valid
        if (rexep != "") {
          var re = new RegExp(rexep);
          if (!re.test(value)) {
            return;
          }
        }


        var el = {};
        el[field] = value;

        $http.post('../api/robocop/config', el).then((response) => {
            $scope[field + 'Check'] = false;
            $scope[field] = value;
            $scope[field + 'Save'] = value;
        }, (err) => {
            $scope[field + 'Check'] = true;
            toastNotifications.addDanger("Option not save");
        });
    }

})

/**
 * @class angular_module.robocop.controller.robocopManagementController
 * @description Controller for snapshotTable.html. Control the management of the snapshot list.
 */
.controller("snapshotTableController", function($scope, $http) {

    this.optionTable = {
        len           : function() {return $scope.resultsHist ? $scope.resultsHist.length : 0},
        sortName      : 'date',
        sortReverse   : true,
        searchWord    : '',
        index         : 0,
        numberDisplay : 10,
        previous      : function() {if (this.index > 0) {this.index -= 1}},
        next          : function() {if (this.index < this.len() / this.numberDisplay - 1)  {this.index += 1}},
        show          : function(indexRow) {return indexRow >= this.index * this.numberDisplay && indexRow < (this.index + 1) * this.numberDisplay},
    };
})

/**
 * @class angular_module.robocop.controller.robocopManagementLogController
 * @description Controller for log.html. Control the log viewer page.
 */
.controller("robocopManagementLogController", function($scope, $http, $location, $routeParams, kbnUrl) {
  $scope.navbarPage = "log";
  timefilter.enableTimeRangeSelector();

  if (isObject) {$scope.idObject = $routeParams.id;}

  $scope.topNavMenu = [{
    key: 'Close',
    description: 'Return to the alert/cron',
    run: function () { kbnUrl.change('/' + $location.search().object + '/edit/' + $routeParams.id); },
    testId: 'robocopCloseButton',
  }]

  $scope.searchInput = "*";
  $scope.lvlInfo = true;
  $scope.lvlWarning = true;
  $scope.lvlError = true;
  $scope.log = [];


  /**
   * @function search
   * @memberof angular_module.robocop.controller.robocopManagementLogController
   * @description Search the log in ES.
   */
  $scope.search = function() {
    $scope.log = [];
    var payload = {
      search:$scope.searchInput,
      lvlInfo: $scope.lvlInfo,
      lvlWarning: $scope.lvlWarning,
      lvlError: $scope.lvlError,
      from:timefilter.getTime().from,
      to:timefilter.getTime().to
    }
    if (isObject) {
      payload.object = $routeParams.id;
    }
    $http.post('../api/robocop/log', payload).then((response) => {
      for (let idResponse in response.data) {
        response.data[idResponse]._source.show = false;
        $scope.log.push(response.data[idResponse]._source);
      }
    }, (err) => {
    })
  }

  /**
   * @function isObject
   * @memberof angular_module.robocop.controller.robocopManagementLogController
   * @description Check if it's limited to an obejct (alert/cron)l
   * @return {Boolean} true if limited to an object.
   */
  function isObject() {
    return $routeParams.id;
  };

  /**
   * @event angular_module.robocop.controller.robocopManagementLogController#timefilter
   * @memberof aangular_module.robocop.controller.robocopManagementLogController
   * @description Catch timefilter modifcation to refresh the log.
   */
  $scope.$watch('timefilter', function(newVal, oldVal) {
    var newVal = newVal || undefined;
    var oldVal = oldVal || undefined;
    if (!newVal && !oldVal) {
      return;
    }

    if (!oldVal || (oldVal.refreshInterval.pause == newVal.refreshInterval.pause &&
                     oldVal.refreshInterval.value == newVal.refreshInterval.value &&
                     oldVal.refreshInterval.display == newVal.refreshInterval.display)) {
      //Action
      $scope.search();
    } else {}
  }, true);

})

