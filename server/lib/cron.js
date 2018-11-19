import action from './action.js';
import log from './log.js';
/**
 * A virtual namespace which regroup the method that manage cron execution.
 * @namespace Cron_be
 */

/**
 * An object that represent the cron.
 * It's like the cron save in the elasticsearch except the field data which be convert into object if possible.
 * @typedef {Object} Cron
 * @memberof Cron_be
 */

/** Start the execution of the cron
 * Search all the cron that must be execute then execute them.l
 * @memberof Cron_be
 * @param {Server} server - Kibana server
 * @param {String} time - Period that must be execute.
 */
function startCronByTime(server, time) {
  let config = server.config().get("robocop").index;
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;

  // Create request
  let q = ""
  if (time == 'custom') {
    const date = server.plugins.robocop['scheduler_date']
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let dayTime = '(periodicity:"1 days" AND period.time:' + ("0" + date.getHours()).slice(-2) + ("0" + date.getMinutes()).slice(-2) + ')';
    let weekTime = '(periodicity:"7 days" AND period.dayWeek:' + days[date.getDay()] + ' AND period.time:' + ("0" + date.getHours()).slice(-2) + ("0" + date.getMinutes()).slice(-2) + ')';
    let monthTime = '(periodicity:"1 months" AND period.dayMonth:' + date.getDate() + ' AND period.time:' + ("0" + date.getHours()).slice(-2) + ("0" + date.getMinutes()).slice(-2) + ')';
    q = 'type:cron AND enabled:true AND (' + dayTime + ' OR ' + weekTime + ' OR ' + monthTime + ')';
  } else {
    q = 'type:cron AND enabled:true AND periodicity:"' + time + '"';
  }

  callES('search', {
    index : config.data,
    type  : 'data',
    q     : q,
    size  : 10000
  }).then(response => {
    server.log(['debug', 'robocop'], 'Cron ' + time + ': ' + response.hits.total + " result.");
    for (var index in response.hits.hits) {
      var cronProperty = response.hits.hits[index];
      var cron = cronProperty._source;
      // Check if watcher must be execute -- ES send back false alert
      if (cron.enabled && action.isActive(server, cron.period)) {
        executeCron(server, cron, cronProperty._id);
      } else {
        server.log(['debug', 'robocop'], 'Cron : "' + cron.title + '" canceled.');
      }
    }
  });
}

function startCronById(server, cronId) {
  let config = server.config().get("robocop").index;
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  callES('get', {
    index : config.data,
    type  : 'data',
    id    : cronId
  }).then(response => {
    executeCron(server, response._source, response._id);
  });

}

/** Execute the request of a cron and execute the script if enabled
 * @memberof Cron_be
 *  @param {Server} server - Kibana server
 *  @param {Cron} cron - Object ES cron
 *  @param {String} cronId - Id of the cron
 */
function executeCron(server, cron, cronId) {
  server.log(['debug', 'robocop'], 'Cron : "' + cron.title + '" executed');
  log.log(server, 'info', cronId, 'Cron ' + cron.title + ' executed', '');

  var http = require('http');
  var data = cron.request.data;
  if (cron.request.method == "GET" && typeof cron.request.data != 'undefined' ) {
    if (cron.request.data != '') {
      cron.request.method = 'POST';
    }
  }

  var request = new http.ClientRequest({
      host: "127.0.0.1",
      port: 9200,
      path: cron.request.path,
      method: cron.request.method,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
  })

  let contentResult = ""
  request.end(data)
  request.on('response', function (res) {
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
      if (res.statusCode != 200) {
        server.log(['debug', 'robocop'], 'Cron error: ' + cron.title + '. Request send back ' + res.statusCode);
      } else {
        server.log(['debug', 'robocop'], 'Cron done: ' + cron.title);
      }

      if (cron.script && cron.script.enabled) {
        contentResult += chunk;
      }
    });

    res.on('end', () => {
      if (cron.script && cron.script.enabled) {
        executeCronScript(server, res.statusCode, cron, cronId, contentResult);
      }
    });
  });


}

/** Execute the script of the cron
 * @memberof Cron_be
 *  @param {Server} server - Kibana server
 *  @param {Integer} statusCode - Return HTTP code of the request
 *  @param {Cron} cron - Object ES cron
 *  @param {String} cronId - Id of the cron
 *  @param {String} result - Response send back by the request
 */
function executeCronScript(server, statusCode, cron, cronId, result) {
  var exec = require('child_process').exec;

  // Prepare argument
  var argCmd = "";
  var args = cron.script.arguments;
  var envVariable = {}
  for (var idArg in args) {
    switch(args[idArg]) {
      case "status":
        argCmd +=  '--status "' + statusCode + '" ';
        envVariable["status"] = statusCode;
        break;
      case "date":
        argCmd +=  '--date "' + server.plugins.robocop['scheduler_date'].toISOString() + '" ';
        envVariable["date"] = server.plugins.robocop['scheduler_date'].toISOString();
        break;
      case "cron":
        argCmd +=  '--cron "' + new Buffer(JSON.stringify(cron)).toString('base64') + '" ';
        envVariable["cron"] = new Buffer(JSON.stringify(cron)).toString('base64');
        break;
      case "idCron":
        argCmd +=  '--idCron "' + cronId + '" ';
        envVariable["idCron"] = cronId;
        break;
      case "result":
        argCmd +=  '--result "' + new Buffer(result).toString('base64') + '" ';
        envVariable["result"] = new Buffer(result).toString('base64');
        break;
    }
  }
  // Create var env for data field of cron
  if (cron.data) {
    try {
      var dataJson = JSON.parse(cron.data);
      if (Object.prototype.toString.call(dataJson) === '[object Array]') {
        envVariable["data"] = dataJson;
      } else {
        for (let idData in dataJson) {
          envVariable[idData] = dataJson[idData];
        }
      }
    } catch (e) {}
  }

  // Execute the script
  var commandLine = 'cd ' +  server.config().get("robocop").script.path + cronId + '; ./run ' + argCmd;
  try{
     exec(commandLine, {env : envVariable}, (error, stdout, stderr) => {callBackScript(server, cron, cronId, error, stdout, stderr)});
  } catch (e) {
    server.log(['warning', 'robocop'], 'script no executed ' + JSON.stringify(e));
  }
}

/** Manage the output of script to execute actions like send message.
 * @memberof Cron_be
 *  @param {Server} server - Kibana server
 *  @param {Cron} cron - Object ES cron
 *  @param {String} cronId - Id of the cron
 *  @param {String} error -
 *  @param {String} stdout - stdout of the script.
 *  @param {String} stderr - stderr of the script.
 */
function callBackScript(server, cron, cronId, error, stdout, stderr) {
  if (stderr) {
    log.log(server, 'warning', cronId, "Error in the script : " + cron.title, stderr);
    server.log(['warning', 'robocop'], 'Script return an error ' + stderr);
    log.sendSupport(server, cron.title, "The script return this error but the execution continue :\n\n" + stderr)
    if (cron.debug.mail) {
      log.sendUser(server, cron.title, "Your script return this error but the execution continue :\n\n" + stderr, cron.debug.mail)
    }
  }
  if (!stdout || stdout == "" ) { return }
  var variables = {
    cron   : cron,
    idCron : cronId,
    date   : server.plugins.robocop['scheduler_date']
  }
  try {
    var actionOut = JSON.parse(stdout);
    if (Object.prototype.toString.call(actionOut) === '[object Array]') {
      for (let idAction in actionOut) {
        if (actionOut[idAction].enabled) {
          action.executeAction(server, actionOut[idAction], cron.action, variables);
        }
      }
    } else {
      if (actionOut.enabled) {
        action.executeAction(server, actionOut, cron.action, variables);
      }
    }
  } catch (e) {
    for (let idAction in cron.action) {
      let actionTmp = cron.action[idAction];
      if (actionTmp.enabled) {
        actionTmp.body = stdout;
        action.executeAction(server, actionTmp, cron.action, variables);
      }
    }
  }
}

module.exports = {
  execute: startCronByTime,
  executeCron: startCronById
};
