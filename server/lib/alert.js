import action from './action.js';
import log from './log.js';

/**
 * A virtual namespace which regroup the method that manage alert execution.
 * @namespace Alert_be
 */

/**
 * An object that represent the alert.
 * It's like the alert save in the elasticsearch except the field data which be convert into object if possible.
 * @typedef {Object} Alert
 * @memberof Alert_be
 */


/**
 *  Start the execution of alert.
 *  Find alerts that must be checked and and executes them.
 *  @memberof Alert_be
 *  @param {Server} server - Kibana server.
 *  @param {String} time - String that represents the alert period that must be called
 */
function start(server, time, indicesList) {
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  let config = server.config().get('robocop');
  callES('search', {
    index: config.index.data,
    type: 'data',
    q: 'type:alert AND enabled:true AND watcher.periodicity:"' + time + '"',
    size: 10000
  }).then(response => {
    server.log(['debug', 'robocop'], 'Scheduler ' + time + ': ' + response.hits.total  + ' result.');
    for (var index in response.hits.hits) {
      var alertProperty = response.hits.hits[index];
      var al = alertProperty._source;

      // Get indice to search.
      var indices;
      if (al.optiLogstash) {
        indices = getIndices(server.plugins.robocop['scheduler_date'], time, config.watcher.indices, indicesList);
      } else {
        indices = al.watcher.indices;
      }

      execute(server, al, alertProperty._id, indices);
    }
  });
}

/**
 * Return the list of index use for the alert in fact of the time.
 * @memberof Alert_be
 */
function getIndices(date, time, indices, indicesList) {
  var dateEnd = date;
  var dateStart = undefined;

  if (time === '1 minutes') {
    dateStart = new Date(dateEnd.getTime() - (60 * 1000));
  } else if (time === '10 minutes') {
    dateStart = new Date(dateEnd.getTime() - (600 * 1000));
  } else if (time === '30 minutes') {
    dateStart = new Date(dateEnd.getTime() - (1800 * 1000));
  } else if (time === '1 hours') {
    dateStart = new Date(dateEnd.getTime() - (3600 * 1000));
  } else if (time === '2 hours') {
    dateStart = new Date(dateEnd.getTime() - (7200 * 1000));
  } else if (time === '1 days') {
    dateStart = new Date(dateEnd.getTime() - (86400 * 1000));
  } else if (time === '7 days') {
    dateStart = new Date(dateEnd.getTime() - (7 * 86400 * 1000));
  } else if (time === '1 months') {
    dateStart = new Date(dateEnd.getTime() - (31 * 86400 * 1000));
  }

  var dateArray = new Array();
  var currentDate = dateStart;
  while (currentDate <= dateEnd) {
    let month = ('00' + (currentDate.getMonth() + 1)).slice(-2);
    let day = ('00' + currentDate.getDate()).slice(-2);
    let indicesName = indices.replace('*', currentDate.getFullYear() + '.' +  month + '.' + day);
    if (indicesList.indexOf(indicesName) >= 0) {
      dateArray.push(indicesName);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  return dateArray;
}


/**
 * Check if an alert is triggered.
 * Contain all conditions to check the alert.
 * @memberof Alert_be
 * @param {Object} response - Response of a Elasticsearch's search request.
 * @returns {Boolean} True if request has result and aggreagations is not empty.
 */
function isTrigger(response) {
  var result = (response.hits.total > 0);
  if (response.aggregations) {
    let aggsName = Object.keys(response.aggregations)[0];
    if (response.aggregations[aggsName].buckets) {
      result = response.aggregations[aggsName].buckets.length > 0;
      return result;
    } else if (response.aggregations[aggsName].value) {
      result = Object.keys(response.aggregations[aggsName].value).length > 0 || response.aggregations[aggsName].value > 0;
      return result;
    }
  }
  return result;
}

/**
 *  Call watcher request to check if alert must be trigger and execute action.
 * @memberof Alert_be
 *  @param {Server} server - Kibana server.
 *  @param {Alert} al - Alert checked.
 *  @param {String} idAlert - Id of the alert checked.
 */
function execute(server, al, idAlert, indices) {
  server.log(['debug', 'robocop'], 'Scheduler : watcher "' + al.title + '" check');
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  let config = server.config().get('robocop').index;

  callES('search', {
    index: indices,
    body: al.watcher.request
  }).then(response  => {
    if (isTrigger(response)) {
      server.log(['debug', 'robocop'], 'Scheduler : watcher "' + al.title + '" hits ' +  response.hits.total + 'events');
      log.log(server, 'info', idAlert, 'Alert ' + al.title + ' hits ' +  response.hits.total, '');
      var alertDate = server.plugins.robocop['scheduler_date'];
      var idHistory = Math.random().toString(36).substr(2, 10);
      callES('create', {
        index: config.log,
        type: 'log',
        id: idHistory,
        body: {
          type: 'history',
          alertId: idAlert,
          timestamp: alertDate,
          messageSend: [],
          alert: JSON.stringify(al),
          result: JSON.stringify(response)
        }
      }).then(function (responseHist) {
        let variables = {
          idHistory: idHistory,
          idAlert: idAlert,
          alert: al,
          result: response,
          date: alertDate
        };
        executeAlertScript(server, idHistory, variables, undefined);
      });
    } else {
      server.log(['debug', 'robocop'], 'Scheduler : watcher "' + al.title + '" no hit');
      //log.log(server, 'info', idAlert, 'Alert ' + al.title + ' no triggered', "");
    }
  });
}

/**
 *  Preapre option for script and execute it if enabled.
 *  Convert String alert.data in object.
 * @memberof Alert_be
 *  @param {Server} server - Kibana server.
 *  @param {String} idHistory - Id of the history of the current alert.
 *  @param {Object} variables - Object with variables available for the messages.
 *  @param {Function} callback - Function to override default behavior after the creation of the message.
 */
function executeAlertScript(server, idHistory, variables, callback) {
  if (variables.alert.data) {
    try {
      variables.alert.data = JSON.parse(variables.alert.data);
    } catch (e) {
      log.log(server, 'warning', variables.aler.idAlert, 'Parse of data fail', e);
    }
  }
  if (variables.alert.script && variables.alert.script.enabled) {
    var exec = require('child_process').exec;

    var argCmd = '';
    var envVariable = {};
    var args = variables.alert.script.arguments;
    if (variables.preview) {
      argCmd += '--preview ';
      envVariable['preview'] = 'true';
    }

    for (var idArg in args) {
      switch(args[idArg]) {
        case 'alert':
          envVariable['alert'] = new Buffer(JSON.stringify(variables.alert)).toString('base64');
          argCmd +=  '--alert "' + new Buffer(JSON.stringify(variables.alert)).toString('base64') + '" ';
          break;
        case 'idAlert':
          envVariable['idAlert'] = variables.idAlert;
          argCmd +=  '--idAlert "' + variables.idAlert + '" ';
          break;
        case 'idHistory':
          envVariable['idHistory'] = idHistory;
          argCmd +=  '--idHistory "' + idHistory + '" ';
          break;
        case 'date':
          envVariable['date'] = server.plugins.robocop['scheduler_date'].toISOString();
          argCmd +=  '--date "' + server.plugins.robocop['scheduler_date'].toISOString() + '" ';
          break;
        case 'result':
          envVariable['result'] = new Buffer(JSON.stringify(variables.result)).toString('base64');
          argCmd +=  '--result "' + new Buffer(JSON.stringify(variables.result)).toString('base64') + '" ';
          break;
      }
    }

    var commandLine = 'cd ' +  server.config().get('robocop').script.path + variables.idAlert + '; ./run ' + argCmd;
    try{
      exec(commandLine, { env: envVariable }, (error, stdout, stderr) => {callBackScript(server, variables, error, stdout, stderr, callback);});
    } catch (e) {
      server.log(['warning', 'robocop'], 'script no executed ' + JSON.stringify(e));
    }
  } else {
    prepareAction(server, variables, callback);
  }
}

/**
 *  Manage the multiMessage setting and start the action processing.
 * @memberof Alert_be
 *  @param {Server} server - Kibana server.
 *  @param {Object} variables - Object with variables available for the messages.
 *  @param {Function} callback - Function to override default behavior after the creation of the message.
 */
function prepareAction(server, variables, callback) {
  var al = variables.alert;

  if (al.multiMessage) {
    let aggsName = Object.keys(variables.result.aggregations)[0];
    for (var idAggr in variables.result.aggregations[aggsName].buckets) {
      for (let indexAction in al.action) {
        if (al.action[indexAction].enabled) {
          variables.item = variables.result.aggregations[aggsName].buckets[idAggr];
          action.executeAction(server, al.action[indexAction], undefined, variables, callback);
        }
      }
      // limit the generation of message to the first agg.
      if (variables.preview) {
        break;
      }
    }
  } else {
    for (let indexAction in al.action) {
      if (al.action[indexAction].enabled) {
        action.executeAction(server, al.action[indexAction], undefined, variables, callback);
      }
    }
  }
}

/**
 * Manage instruction return by the script.
 *  Use "data" instruction to add a new variable in script variable. ex: @[script.var]
 *  Use "slack" or "mail" instruction to send message.
 * @memberof Alert_be
 *  @param {Server} server - Kibana server
 *  @param {Object} variables - Object with variables available for the messages.
 *  @param {String} error - Error generate by the script - not use
 *  @param {String} stdout - stdout of the script.
 *  @param {String} stderr - stderr of the script. - not use
 *  @param {Function} callback - Function to override default behavior after the creation of the message.
 */
function callBackScript(server, variables, error, stdout, stderr, callback) {
  if (stderr) {
    log.log(server, 'warning', variables.idAlert, 'Error in the script : ' + variables.alert.title, stderr);
    server.log(['warning', 'robocop'], 'Script return an error ' + stderr);
    log.sendSupport(server, variables.alert.title, 'The script return this error but the execution continue :\n\n' + stderr);
  }
  if (stdout != '') {
    try {
      var actionOut = JSON.parse(stdout);
      if (Object.prototype.toString.call(actionOut) != '[object Array]') {
        actionOut = [actionOut];
      }

      /* Add variables return by the script */
      for (var idAction in actionOut) {
        if (actionOut[idAction].type == 'data' || !actionOut[idAction].type) {
          variables.script = actionOut[idAction];
          delete variables.script.type;
        }
      }

      /* Send message return by script */
      if (!variables.preview) {
        for (var idAction in actionOut) {
          if (actionOut[idAction].type && actionOut[idAction].type != 'data') {
            action.executeAction(server, actionOut[idAction], variables.alert.action, variables);
          }
        }
      }

    } catch (e) {
      log.log(server, 'error', variables.idAlert, 'Error in script parsing ' + variables.alert.title, '* The alert has crash after the execution of a script with the following error : \n\n' + e + '\n\n* The script has returned : \n\n' + stdout);
      server.log(['warning', 'robocop'], 'Error in the parsing. The script return ' + JSON.stringify(e));
      log.sendSupport(server, variables.alert.title, '* The alert has crash after the execution of a script with the following error : \n\n' + e + '\n\n* Your script has returned : \n\n' + stdout);
    }
  }
  /* Send message configured on the web interface */
  prepareAction(server, variables, callback);
}

/**
 *  Use to generate message without executing any action after.
 *  Messages will be send to reply function
 * @memberof Alert_be
 *  @param {Server} server - Kibana server
 *  @param {String} idAlert - Id of alert to execute.
 *  @param {Alert} al - alert to execute.
 *  @param {Function} reply - Callback to send the message generate.
 */
function preview(server, idAlert, al, reply) {
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  callES('search', {
    index: al.watcher.indices,
    body: al.watcher.request
  }).then(function (response) {
    if (isTrigger(response)) {
      let variables = {
        idHistory: 'IDHISTORY',
        idAlert: idAlert,
        alert: al,
        result: response,
        preview: true,
        date: new Date
      };
      executeAlertScript(server, 'IDHISTORY', variables, (message) => {callbackPreview(al.action[0].type, message, reply);});
    } else {
      reply({error: 'Alert not triggered'});
    }
  }, function (error) {
    reply({ error: 'Error in request or index' }).code(500);
  });
}

/**
 *  Format message to reply to the web interface. Replace execute function.
 *  @memberof Alert_be
 *  @param {Server} server - Kibana server.
 *  @param {Message} message - Message generate.
 *  @param {Function} reply - Callback to send the message generate.
 */
function callbackPreview(type, message, reply) {
  var result = {};
  result.type = type;
  for(var key in message) {
    result[key] = message[key];
  }
  reply([result]);
}

module.exports = {
  start: start,
  executecript: executeAlertScript,
  preview: preview
};
