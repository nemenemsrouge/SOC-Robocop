import log from './log.js';

/**
 * Function to create automatic snapshot.
 * @param {Server} server - Kibana server
 * @param {String} time - String that represente the periodicity.
 */
function start(server, time) {
  let config = server.config().get("robocop").index;
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  callES('get', {
    index: config.data,
    type: 'data',
    id: 'conf1',
    _sourceInclude:['snapshotPeriodicity', 'snapshotHistory']
  }).then(function(response) {
    var config = response._source;
    if (config.snapshotPeriodicity == time) {
       create(server, config.snapshotHistory, 0)
    }
  });
}

function create(server, snapshotHistory, cptTry=0) {
  let config = server.config().get("robocop");
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  var moment = require('moment');
  callES('snapshot.create', {
    repository: config.snapshot.repository,
    snapshot: 'rcss_' + moment(server.plugins.robocop['scheduler_date']).utc().format('YYYYMMDD_HHmmss'),
    body : {
      indices: [config.index.data, config.index.log]
    }
  }).then(function (response) {
      manageHistory(server, snapshotHistory);
  }, function (error) {
      //server.log(['warning', 'robocop'], 'Snapshot : automatic snapshot fail ' + error);
      if (cptTry < 30) {
        setTimeout(create(server, snapshotHistory, cptTry + 1), 60 * 1000)

      } else {
        server.log(['warning', 'robocop'], 'Snapshot : automatic snapshot fail ' + error);
        log.log(server, 'error', "", "automatic snapshot fail", error)
        manageHistory(server, snapshotHistory);
      }
  });
}

/**
 * Manage the number of snapshot.
 * @param {Server} server - Kibana server
 * @param {Integer} snapshotHistory - Number of automatic snapshot to keep.
 */
function manageHistory(server, snapshotHistory) {
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  callES('snapshot.get', {
    repository: server.config().get('robocop').snapshot.repository,
    snapshot: ['rcss_*']
  }).then(function(response) {
    if (response.snapshots.length > snapshotHistory && snapshotHistory > 0) {
     remove(server, oldestSnaphot(response.snapshots), snapshotHistory)
    }
  }, function (error) {
    server.log(['warning', 'robocop'], 'Snapshot : can\'t get snaphots to manage ' + error);
  });
}

/**
 * Find the oldest snapshot.
 * @param {Object[]} snapshots - List of snaphots return by Elasticsearch.
 * @returns {Integer} Index of the last charactere of message in the for loop.
 */
function oldestSnaphot(snapshots) {
  var snapshot = snapshots[0].snapshot
  var snapshotDate = snapshots[0].start_time_in_millis;

  for (var snapId in snapshots) {
    if (snapshots[snapId].start_time_in_millis < snapshotDate) {
      snapshot = snapshots[snapId].snapshot;
      snapshotDate = snapshots[snapId].start_time_in_millis;
    }
  }
  return snapshot;
}

/**
 * Delete a snaphot
 * @param {String} name - Name of the snapshot to delete
 * @param {Integer} snapshotHistory - Use to call a new time manageHistory to delete more that 1 snapshot. undefined if no more snapshot to delete.
 */
function remove(server, name, snapshotHistory, cptTry=0) {
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  callES('snapshot.delete', {
    repository: 'robocop',
    snapshot: name,
  }).then(function (response) {
    server.log(['debug', 'robocop'], 'Snapshot : delete');
    if (snapshotHistory) {
      manageHistory(server, snapshotHistory)
    }
  }, function (error) {
    server.log(['warning', 'robocop'], 'Snapshot : can\'t delete snapshot ' + error);
    if (cptTry < 30) {
      setTimeout(function(){remove(server, name, snapshotHistory, cptTry + 1);}, 60 * 1000);
    } else {
      server.log(['warning', 'marvin'], 'Snapshot : can\'t delete snapshot ' + err);
    }
  });
}

module.exports = {
  start:start
};
