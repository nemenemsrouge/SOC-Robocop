import { toastNotifications } from 'ui/notify';

var modules = require('ui/modules');

if (!modules) {
  modules = require('ui/modules').uiModules
}

modules.get('app/robocop')

/**
 * @class angular_module.robocop.controller.robocopCronEditController
 * @description Controller for editHistory.html.
 * @param $routeParams {service}
 * @param $scope {service}
 * @param $http {service}
 */
.controller("robocopHistoryEditController", function($routeParams, $scope, $http) {
    // NavBar settings
    $scope.navbarPage = "history";
    $scope.hideCol = {};

    $http.get('../api/robocop/history/get/' + $routeParams.id).then((response) => {
        response = response.data;

        $scope.hist = response._source;
        $scope.alert = angular.fromJson($scope.hist.alert);
        $scope.alert.watcher.request = angular.toJson(angular.fromJson($scope.alert.watcher.request), 2);
        $scope.hist.alertDate = new Date($scope.hist.timestamp);
        var results = angular.fromJson($scope.hist.result);
        $scope.prettyResult = angular.toJson(results, 2);

        for (var idAction in $scope.hist.alert.action) {
            if ($scope.hist.alert.action[idAction].type == "slack") {
                $scope.slack = $scope.hist.alert.action[idAction];
            } else if ($scope.hist.alert.action[idAction].type == "mail") {
                $scope.mail = $scope.hist.alert.action[idAction];
            }
        }

        // hits part
        results = results.hits.hits;
        $scope.colName = [];
        $scope.data = []; // list of hits

        for (var idResult in results) {
            var el = {};
            for (var propertyName in results[idResult]._source) {
                if (!$scope.colName.includes(propertyName)) {
                    $scope.colName.push(propertyName);
                }
                el[propertyName] = results[idResult]._source[propertyName]
            }
            $scope.data.push(el);
        }
        for (var idColName in $scope.colName.slice(0, 10)) {
            $scope.hideCol[$scope.colName[idColName]] = true;
        }

        //Aggs part
        $scope.aggs = [];// list of aggs
        if ($scope.hist.result.aggregations) {
            let aggsName = Object.keys($scope.hist.result.aggregations)[0];
            results = $scope.hist.result.aggregations[aggsName].buckets;
            for (var idResult in results) {
                var el = {
                    key:results[idResult].key,
                    doc_count:results[idResult].doc_count
                };

                $scope.aggs.push(el);
            }
        }


    }, error => {
        toastNotifications.addDanger('Error when loading history.');
    });

    $scope.aceLoaded = function(_editor) {
        // Options
        _editor.$blockScrolling = Infinity;
    };

    $scope.resultTable = {
        len           : function() {return $scope.results ? $scope.results.length : 0},
        sortName      : 'title',
        sortReverse   : false,
        searchWord    : '',
        index         : 0,
        numberDisplay : 20000,
        previous      : function() {if (this.index > 0) {this.index -= 1}},
        next          : function() {if (this.index < this.len() / this.numberDisplay - 1)  {this.index += 1}},
        show          : function(indexRow) {return indexRow >= this.index * this.numberDisplay && indexRow < (this.index + 1) * this.numberDisplay - 1},
    };

    $scope.resultTableAggs = {
        len           : function() {return $scope.results ? $scope.resultsAggs.length : 0},
        sortName      : 'key',
        sortReverse   : false,
        searchWord    : '',
        index         : 0,
        numberDisplay : 20000,
        previous      : function() {if (this.index > 0) {this.index -= 1}},
        next          : function() {if (this.index < this.len() / this.numberDisplay - 1)  {this.index += 1}},
        show          : function(indexRow) {return indexRow >= this.index * this.numberDisplay && indexRow < (this.index + 1) * this.numberDisplay - 1},
    };

})

/**
 * @class angular_module.robocop.controller.robocopHistoryController
 * @description Controller for history.html. Control the index of history.
 * @param $scope {service}
 */
.controller("robocopHistoryController", function($window, $scope, $http) {
    // NavBar settings
    $scope.navbarPage = "history";
})

/**
 * @class angular_module.robocop.controller.historyTableController
 * @description Controller for historyTable.html. Control the history's table.
 * @param $scope {service}
 * @param $http {service}
 */
.controller("historyTableController", function($scope, $http) {
    //History
    $http.get('../api/robocop/history/getAllSummary').then((response) => {
      if (response.data) {
        response = response.data.hits.hits;
        this.history = [];
        for (var idHist in response) {
            response[idHist]._source.alert = JSON.parse(response[idHist]._source.alert)
            let hist = {
                id:response[idHist]._id,
                alertId:response[idHist]._source.alertId,
                alertDate:new Date(response[idHist]._source.timestamp),
                alertTitle:response[idHist]._source.alert.title,
                alertDescription: response[idHist]._source.alert.description
            };
            this.history.push(hist);
        }
      }
    }, error => {
    });
    this.historyTable = {
        len           : function() {return $scope.resultsHist ? $scope.resultsHist.length : 0},
        sortName      : 'alertDate',
        sortReverse   : true,
        searchWord    : '',
        index         : 0,
        numberDisplay : 10,
        previous      : function() {if (this.index > 0) {this.index -= 1}},
        next          : function() {if (this.index < this.len() / this.numberDisplay - 1)  {this.index += 1}},
        show          : function(indexRow) {return indexRow >= this.index * this.numberDisplay && indexRow < (this.index + 1) * this.numberDisplay},
    };
})

