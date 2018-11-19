import cronHandler from './cron.js';
import alertHandler from './alert.js';
import actionHandler from './action.js';
import snapshotHandler from './snapshot.js';
import historyHandler from './history.js';

import log from './log.js';

/**
 * Create the robocop data index if not exist.
 * It saves the alerts, crons, configs, waiting Actions
 * @param {Server} server - Kibana server.
 */
function createIndiceData(server) {
  var config = server.config().get('robocop').index;
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  callES('indices.exists', { index: config.data }).then(response => {
    if (response === true) {
      createConfig(server);
    } else {
      server.plugins.robocop.status.yellow('No index' + config.data);
      callES('indices.create', {
        index: config.data,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1
          }
        }
      }).then(response => {
        createIndiceLog(server);
      }, err => {
        server.plugins.robocop.status.red('No index' + config.data);
        setTimeout(function () { createIndiceData(server); }, 10000);
      });
    }
  });
}

/**
 * Create the robocop log index if not exist.
 * It saves the history and the log
 * @param {Server} server - Kibana server.
 */
function createIndiceLog(server) {
  var config = server.config().get('robocop').index;
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  callES('indices.exists', { index: config.log }).then(response => {
    if (response === true) {
      createConfig(server);
    } else {
      server.plugins.robocop.status.yellow('No index' + config.log);
      callES('indices.create', {
        index: config.log,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1
          }
        }
      }).then(response => {
        createConfig(server);
      }, err => {
        server.plugins.robocop.status.red('No index' + config.log);
        setTimeout(function () { createIndiceLog(server); }, 10000);
      });
    }
  });
}

/**
 * Create the conf1 document if not exist.
 * @param {Server} server - Kibana server.
 */
function createConfig(server) {
  var config = server.config().get('robocop').index;
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  callES('exists', {
    index: config.data,
    type: 'data',
    id: 'conf1'
  }).then(response => {
    if (response === true) {
      //migrate(server)
      initScheduler(server);
    } else {
      callES('create', {
        index: config.data,
        type: 'data',
        id: 'conf1',
        body: {
          snapshotPeriodicity: 'never',
          snapshotHistory: 0,
          historyHistory: 0,
          alertCategory: '',
          alertLevel: '',
          cronCategory: '',
          workerDay: [],
          workerTime: '',
          workerOff: [],
          logHistory: 0
        }
      }).then(response => {
        //migrate(server);
        initScheduler(server);
      });
    }
  });
}

/**
 * Function call each minutes to execute all action shedule
 * like alert, cron, clean,...
 * @param {Server} server - Kibana server.
 */
function scheduler(server) {
  var date = new Date();
  var minutes = date.getMinutes();
  var hours = date.getHours();
  var days = date.getDate();
  var dayPos = date.getDay(); // 1 -> monday...
  server.log(['info', 'status', 'robocop'], 'Scheduler: Wake up ' + hours + ':' + minutes);

  var midnight = (hours === 0 && minutes === 0);
  server.plugins.robocop['scheduler_date'] = date;

  //manage history depending on the configuration
  historyHandler.manage(server);

  let config = server.config().get('robocop').index;
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  callES('get', {
    index: config.data,
    type: 'data',
    id: 'conf1',
    _sourceInclude: ['workerDay', 'workerTime', 'workerOff', 'logHistory'],
  }).then(function (response) {
    callES('cluster.state').then(function (responseIndices) {
      let indices = Object.keys(responseIndices.metadata.indices);

      historyHandler.manageLog(server, response._source.logHistory);
      server.plugins.robocop.workerDay = response._source.workerDay;
      server.plugins.robocop['workerTime'] = response._source.workerTime;
      server.plugins.robocop['workerOff'] = response._source.workerOff;

      //Send action saved
      sendWaitingAction(server);

      alertHandler.start(server, '1 minutes', indices);
      cronHandler.execute(server, '1 minutes');
      cronHandler.execute(server, 'custom');
      if (minutes % 10 === 0) {
        alertHandler.start(server, '10 minutes', indices);
        cronHandler.execute(server, '10 minutes');
      }
      if (minutes === 0 || minutes === 30) {
        alertHandler.start(server, '30 minutes', indices);
        cronHandler.execute(server, '30 minutes');
      }
      if (minutes === 0) {
        alertHandler.start(server, '1 hours', indices);
        cronHandler.execute(server, '1 hours');
      }
      if (hours % 2 === 0 && minutes === 0) {
        alertHandler.start(server, '2 hours', indices);
        cronHandler.execute(server, '2 hours');
      }
      if (midnight) {
        alertHandler.start(server, '1 days', indices);
        //cronHandler.execute(server, '1 days');
        snapshotHandler.start(server, 'every 1 day');
        historyHandler.manageLog(server, response._source.workerDay);
      }
      if (dayPos === 1 && midnight) {
        alertHandler.start(server, '7 days', indices);
        //cronHandler.execute(server, '7 days');
        snapshotHandler.start(server, 'every 1 week');
      }
      if ((days === 1 || days === 15) && midnight) {
        snapshotHandler.start(server, 'every 2 weeks');
      }
      if (days === 1 && midnight) {
        alertHandler.start(server, '1 months', indices);
        //cronHandler.execute(server, '1 months');
        snapshotHandler.start(server, 'every 1 month');
      }
    }, function (error) {
      log.sendError(server, error);
    });
  }, function (error) {
    log.sendError(server, error);
  });
}

/**
 * Check stand by alert and send message if alert wake up.
 * @param {Server} server - Kibana server.
 */
function sendWaitingAction(server) {
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  let config = server.config().get('robocop').index;

  var date = server.plugins.robocop['scheduler_date'];
  callES('search', {
    index: config.data,
    type: 'data',
    q: 'type:waitingAction'
  }).then(response => {
    for (var index in response.hits.hits) {
      var actionWaiting = response.hits.hits[index]._source;
      if (actionHandler.isActive(server, actionWaiting.period)) {
        for (var idEvent in actionWaiting.events) {
          let message = actionWaiting.events[idEvent];
          actionHandler.send(server, message, actionWaiting.alertId);
        }
        callES('delete', {
          index: config.data,
          type: 'data',
          id: response.hits.hits[index]._id
        }).then(function (response) {
        }, function (error) {
          server.log(['warning', 'robocop'], 'Scheduler: action waiting ' + error);
        });
      }
    }
  }, error => {
    server.log(['error', 'robocop'], 'sendWaitingAction: ' + error);
  });
}

/**
 * Init the scheduler.
 * This is the last point of the initialisation.
 * @param {Server} server - Kibana server.
 */
function initScheduler(server) {
  server.plugins.robocop.status.green('Ready');
  scheduler(server);
  setInterval(function () { scheduler(server); }, 60 * 1000);
}

module.exports = {
  createIndice: createIndiceData,
  initScheduler: initScheduler,
};
