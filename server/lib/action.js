import msgManager from './message.js';
import msgManagerHtml from './messageHtml.js';
import log from './log.js';

/**
 * A virtual namespace which regroup the method that manage Action (slack or mail).
 * @namespace Action_be
 */

/**
 * An object that represent an action. An action is the setting to send a message.
 * By default, it's the JSON object save in the filed action of the alert.
 * @typedef {Object} Action
 * @memberof Action_be
 */

/**
 *  Execute an action.
 *  The function create all messages then send it or save it.
 *  @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {Action} action - Action to execute.
 *  @param {Action[]} actions - List of action with the default value. Can be empty.
 *  @param {Object} variables - Object with variables available for the messages. Can be empty.
 *  @param {Function} [callback=undefined] - Function to override default behavior after the creation of the message.
 */
function executeAction(server, action, actions, variables, callback) {
  var config = server.config().get('robocop').action;
  let configIndex = server.config().get('robocop').index;

  // Fill missing field of action with default action.
  for (var idActionDefault in actions) {
    let actionDefault = actions[idActionDefault];

    if (actionDefault.type == action.type) {
      if (action.type == 'slack') {
        action.canal = action.canal || actionDefault.canal;
        action.name  = action.name || actionDefault.name;
        action.body  = action.body || actionDefault.body;
      } else if (action.type == 'mail') {
        action.to       = action.to || actionDefault.to;
        action.from     = action.from || actionDefault.from;
        action.subject  = action.subject || actionDefault.subject;
        action.body     = action.body || actionDefault.body;
      } else if (action.type == 'marvin') {
        action.typeAlert       = action.typeAlert || actionDefault.typeAlert;
        action.title           = action.title || actionDefault.title;
        action.contact         = action.contact || actionDefault.contact;
        action.detectionSource = action.detectionSource || actionDefault.detectionSource;
        action.alertSource     = action.alertSource || actionDefault.alertSource;
        action.body            = action.body || actionDefault.body;
        action.criticity       = action.criticity || actionDefault.criticity;
        action.category        = action.category || actionDefault.category;
      }
    }
  }

  // Fill missing field of action with config.
  if (action.type == 'slack') {
    action.canal = action.canal || config.slack.canal;
    action.name  = action.name  || config.slack.name;
    action.body  = action.body  || config.slack.body;
  } else if (action.type == 'mail') {
    action.to       = action.to  || config.mail.to;
    action.from     = action.from  || config.mail.from;
    action.smtphost = config.mail.smtpHost;
    action.smtpport = config.mail.smtpPort;
    action.subject  = action.subject || config.mail.subject;
    action.body     = action.body || config.mail.body;
  } else if (action.type == 'marvin') {
    action.typeAlert = action.typeAlert || config.marvin.typeAlert;
    action.body      = action.body || config.marvin.body;
  }

  variables.action = action;
  if (action.type == 'slack') {
    createMessageSlack(server, action, variables, callback);
  } else if (action.type == 'mail') {
    createMessageMail(server, action, variables, callback);
  } else if (action.type == 'marvin') {
    createMessageMarvin(server, action, variables, callback);
  }
}

/**
 *  Create message for slack.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {Action} action - Action to execute.
 *  @param {Object} variables - Object with variables available for the messages. Can be empty.
 *  @param {Function} callback - Function to override default behavior.
 */
function createMessageSlack(server, action, variables, callback) {
  if (server.config().get('robocop').action.slack.enabled) {
    var options = {
      action: action,
      variables: variables,
      callback: callback,
      idHistory: variables.idHistory,
    };
    msgManager.formatMessage(server, action.body, variables, (message) => {callBackMessageSlack(server, message, options);});
  } else {
    server.log(['warning', 'robocop'], 'Action "slack" not enabled');
  }
}

/**
 *  Return function after formatting message.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {Action} message - Message to send.
 *  @param {Object} options - Object with the options and variable need for send message or save it.
 */
function callBackMessageSlack(server, message, options) {
  var msg = {
    body: message,
    type: 'slack',
  };

  if (options.callback) {
    options.callback(msg);
  } else {
    // Default action if no callback
    try {
      require('@slack/client');
      if (typeof options.variables.idCron == 'undefined') { // then is an alert
        addMessageToHistory(server, msg, options);
        if ((options.variables.alert && isActive(server, options.variables.alert.period))) {
          sendMessageSlack(server, options.action, msg, options.variables.idAlert);
        } else {
          saveAction(server, options.variables.idHistory, options.variables.idAlert, options.variables.alert.period, options.action, msg);
        }
      } else if (typeof options.variables.idCron != 'undefined') {
        sendMessageSlack(server, options.action, msg, options.variables.idCron);
      }else {
        server.log(['error', 'robocop'], 'error send slack for ' + options.variables);
        return;
      }
    } catch (e) {
      server.log(['warning', 'robocop'], 'Package slack-client error: ' + e);
    }
  }
}

/**
 *  Send message by slack.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {Action} action - Action to execute.
 *  @param {String} message - Message object to send. {body:"message"}
 */
function sendMessageSlack(server, action, message, idObject) {
  var config = server.config().get('robocop').action.slack;
  try {
    const { WebClient } = require('@slack/client');
    var token = config.token;
    var web = new WebClient(token);

    message.body += '\n' + config.footer;
    let canalList = action.canal.split(',');
    for (let canal in canalList) {
      web.chat.postMessage({ channel: canalList[canal], text: message.body, username: action.name})
        .then((res) => {
          server.log(['debug', 'robocop'], 'Scheduler : action slack send');
          log.log(server, 'info', idObject, 'Message send to slack ', '');
        }, (error) => {
          server.log(['warning', 'robocop'], 'Scheduler : action fail to slack ' + error);
          log.log(server, 'error', idObject, 'Error to send slack message ', error);
        });
    }
  } catch (e) {
    server.log(['warning', 'robocop'], 'Package slack-client error : ' + e);
  }
}

/**
 * Create message for Mail.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {Action} action - Action to execute.
 *  @param {Object} variables - Object with variables available for the messages. Can be empty.
 */
function createMessageMail(server, action, variables, callback) {
  if (server.config().get('robocop').action.mail.enabled) {
    var options = {
      action: action,
      variables: variables,
      callback: callback,
      idHistory: variables.idHistory,
    };
    if (server.config().get('robocop').action.mail.template != '') {
      msgManagerHtml.formatMessage(server, action.subject, variables, (message) => {callBackMessageMail(server, message, options);});
    } else {
      msgManager.formatMessage(server, action.subject, variables, (message) => {callBackMessageMail(server, message, options);});
    }
  } else {
    server.log(['warning', 'robocop'], 'Scheduler : action "mail" not enabled');
  }
}

/**
 *  Return function after formatting message.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {Action} message - Message to send.
 *  @param {Object} options - Object with the options and variable need for send message or save it.
 */
function callBackMessageMail(server, message, options) {
  if (!options.subject) {
    options.subject = message;
    if (server.config().get('robocop').action.mail.template != '') {
      msgManagerHtml.formatMessage(server, options.action.body, options.variables, (message) => {callBackMessageMail(server, message, options);});
    } else {
      msgManager.formatMessage(server, options.action.body, options.variables, (message) => {callBackMessageMail(server, message, options);});
    }
  } else {
    let msg = {
      subject: options.subject,
      body: message,
      type: 'mail',
    };
    if (options.callback) {
      options.callback(msg);
    } else {
      try {
        require('nodemailer');
        if (typeof options.variables.idCron == 'undefined') { // then is an alert
          addMessageToHistory(server, msg, options);
          if (isActive(server, options.variables.alert.period)) {
            sendMessageMail(server, options.action, msg, options.variables.idAlert);
          } else {
            saveAction(server, options.variables.idHistory, options.variables.idAlert, options.variables.alert.period, options.action, msg);
          }
        } else if (typeof options.variables.idCron != 'undefined') {
          sendMessageMail(server, options.action, msg, options.variables.idCron);
        } else {
          server.log(['error', 'robocop'], 'error send mail for ' + options.variables.idCron);
          return;
        }

      } catch (e) {
        server.log(['warning', 'robocop'], 'Package nodemailer error callBack: ' + e);
        server.log(['warning', 'robocop'], options.variables);
      }
    }
  }
}

/**
 * Send message by mail.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {Action} action - Action to execute.
 *  @param {String} message - Message object to send. {subject:"message", body:"message"}
 */
function sendMessageMail(server, action, message, idObject) {
  var config = server.config().get('robocop').action.mail;
  try {
    const nodemailer = require('nodemailer');

    if (!action.smtphost) {
      server.log(['warning', 'robocop'], 'Scheduler : action mail : No smtpHost configured');
      log.log(server, 'error', idObject, 'No smtpHost configured to send mail', '');
      return;
    }
    if (!action.from) {
      server.log(['warning', 'robocop'], 'Scheduler : action mail : No from adresse configured');
      log.log(server, 'error', idObject, 'No from adresse configured to send mail', '');
      return;
    }
    if (!action.to) {
      server.log(['warning', 'robocop'], 'Scheduler : action mail : No to adresse configured');
      log.log(server, 'error', idObject, 'No to adresse configured to send mail', '');
      return;
    }

    var transporter = nodemailer.createTransport({
      host: action.smtphost,
      port: action.smtpport,
      tls: {
        rejectUnauthorized: false
      }
    });
    var mailOptions = {
      from: action.from,
      to: action.to,
      replyTo: action.replyto || action.from,
      subject: message.subject,
      text: message.body,
      priority: action.priority || 'normal'
    };

    if (config.template != '') {
      const fs = require('fs');
      var template = fs.readFileSync(config.template + 'template.html', 'utf-8');
      mailOptions.attachments = [];
      fs.readdirSync(config.template).forEach(function (file, index) {
        if (file !='template.html') {
          mailOptions.attachments.push({
            filename: file,
            path: config.template + file,
            cid: file
          });
        }
      });

      mailOptions.html =  template.replace('<MESSAGE>', message.body);
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        server.log(['warning', 'robocop'], 'Scheduler : action fail to mail ' + error);
        log.log(server, 'error', idObject, 'Error to send mail', error);
      } else {
        server.log(['debug', 'robocop'], 'Scheduler : action mail send');
        log.log(server, 'info', idObject, 'Message send by mail', '');
      }
    });
  } catch (e) {
    server.log(['warning', 'robocop'], 'Package nodemailer error : ' + e);
  }
}

/**
 *  Create message for Marvin.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {Action} action - Action to execute.
 *  @param {Object} variables - Object with variables available for the messages. Can be empty.
 *  @param {Function} callback - Function to override default behavior.
 */
function createMessageMarvin(server, action, variables, callback) {
  if (server.config().get('robocop').action.marvin.enabled) {
    var options = {
      action: action,
      variables: variables,
      callback: callback,
      idHistory: variables.idHistory,
    };
    msgManager.formatMessage(server, action.body, variables, (message) => {callBackMessageMarvin(server, message, options);});
  } else {
    server.log(['warning', 'robocop'], 'Action "Marvin" not enabled');
  }
}

/**
 *  Return function after formatting message.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {Action} message - Message to send.
 *  @param {Object} options - Object with the options and variable need for send message or save it.
 */
function callBackMessageMarvin(server, message, options) {
  if (!options.body) {
    options.body = message;
    msgManager.formatMessage(server, options.action.title || '', options.variables, (message) => {callBackMessageMarvin(server, message, options);});
  } else {
    var msg = {
      body: options.body,
      title: message,
      type: 'marvin',
    };

    if (options.callback) {
      options.callback(msg);
    } else {
      // Default action if no callback
      try {
        if (typeof options.variables.idCron == 'undefined') { // then is an alert
          addMessageToHistory(server, msg, options);
          options.action.category = options.variables.alert.category;
          options.action.criticity = options.variables.alert.level;
          sendMessageMarvin(server, options, msg, options.variables.idAlert, options.variables.alert);
        } else if (typeof options.variables.idCron != 'undefined') {
          options.action.category = options.variables.cron.category;
          sendMessageMarvin(server, options, msg, options.variables.idCron, options.variables.cron);
        }else {
          server.log(['error', 'robocop'], 'error send Marvin for ' + options.variables);
          return;
        }
      } catch (e) {
        server.log(['warning', 'robocop'], 'Marvin error: ' + e);
      }
    }
  }
}

/**
 *  Send message to Marvin.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {Action} action - Action to execute.
 *  @param {String} message - Message object to send. {body:"message"}
 */
function sendMessageMarvin(server, option, message, idObject, object) {
  var config = server.config().get('robocop').action.marvin;
  try {
    var data = {
      'title': message.title,
      'type': option.action.typeAlert,
      'category': option.action.category,
      'opened': option.variables.date,
      'criticity': option.action.criticity,
      'description': message.body,
      'contact': option.action.contact,
      'detection': option.action.detectionSource,
      'alert': option.action.alertSource,
    };
    var http = require('http');
    var request = new http.ClientRequest({
      host: 'localhost',
      port: 5601,
      path: '/api/marvin/external/NewIrp',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'kbn-xsrf': 'robocop',
        'Content-Length': Buffer.byteLength(JSON.stringify(data))
      }
    });

    request.end(JSON.stringify(data));
    request.on('response', function (res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        if (res.statusCode != 200) {
          server.log(['warning', 'robocop'], 'Marvin error return code: ' + res.statusCode);
          log.log(server, 'warning', idObject, 'Marvin error return code: ' + res.statusCode);
        } else {
          log.log(server, 'info', idObject, 'Message send to Marvin', '');
        }
      });
    });
  } catch (e) {
    server.log(['warning', 'robocop'], 'Can\'t send to Marvin - error : ' + e);
  }
}


function addMessageToHistory(server, message, options) {
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  let config = server.config().get('robocop').index;

  if (message.type == 'mail') {
    message.to = message.to || options.action.to;
    message.from = message.from || options.action.from;
  }
  message = Object.assign({}, message);
  callES('update', {
    index: config.log,
    type: 'log',
    id: options.idHistory,
    body: {
      script: {
        inline: 'ctx._source.messageSend.add(params.msg)',
        lang: 'painless',
        params: {
          msg: message
        }
      }
    }
  }).then(response => {
  }, error => {
    server.log(['warning', 'robocop'], 'warning save mail message ' + JSON.stringify(error));
    addMessageToHistory(server, message, options);
  });
}

/**
 * Compare if 2 date is equal (year, month and day).
 * @memberof Action_be
 * @param {Date} date1 - First date to compare
 * @param {Date} date1 - Second date to compare
 * @returns {Boolean} true if date1 and date2 is equal
 */
function dateEqual(date1, date2) {
  if (date1.getDate() == date2.getDate()) {
    if (date1.getMonth() == date2.getMonth()) {
      if (date1.getFullYear() == date2.getFullYear() || date1.getYear() == 0 || date2.getYear() == 0) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if an alert/cron is active or in stand by.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {Object} period - Period use to check if alert/cron is active.
 *  @returns {Boolean} true if message must be send, false if not.
 */
function isActive(server, period) {
  var dateTmp = server.plugins.robocop['scheduler_date'];

  var dateAlert = String('00' + dateTmp.getDate()).slice(-2) + '/' + String('00' + (dateTmp.getMonth()+1)).slice(-2);

  // Days Off
  if (period.type == 'wh' || ((period.type == 'custom'  || !period.type) && (period.days && !period.days[0]))) {
    var daysOff = server.config().get('robocop').daysOff;
    daysOff = daysOff.concat(server.plugins.robocop['workerOff'] || []);
    var isOff = false;
    for (var idDay in daysOff) {
      var day = daysOff[idDay].split('/');
      if (day.length == 3) {
        day = new Date(day[3], day[2], day[1]);
      } else if (day.length === 2) {
        day = new Date(dateTmp.getFullYear(), day[1] - 1, day[0]);
      } else {
        server.log(['warning', 'robocop'], 'Day Off not a valid date');
      }
      if (dateEqual(dateTmp, day)) {
        isOff = true;
        break;
      }
    }
    if (isOff) {
      return false ;
    }
  }

  // Alert configuration
  if (period.type == 'wh') {
    var days = server.plugins.robocop['workerDay'];
    var week = [false, false, false, false, false, false, false];

    for (var idDay in days) {
      idDay = days[idDay];
      if (idDay == 'mon') {week[1] = true;}
      if (idDay == 'tue') {week[2] = true;}
      if (idDay == 'wed') {week[3] = true;}
      if (idDay == 'thu') {week[4] = true;}
      if (idDay == 'fri') {week[5] = true;}
      if (idDay == 'sat') {week[6] = true;}
      if (idDay == 'sun') {week[0] = true;}
    }
    if (week[dateTmp.getDay()]) {
      var date = dateTmp.getHours() * 100 + dateTmp.getMinutes();

      let dateStart = server.plugins.robocop['workerTime'].split('-')[0].replace(':', '');
      var dateEnd = server.plugins.robocop['workerTime'].split('-')[1].replace(':', '');

      if (dateStart < dateEnd) {
        return dateStart <= date && date <= dateEnd;
      } else {
        return dateStart <= date || date <= dateEnd;
      }
    }
    return false;
  } else if (period.type == 'nwh') {
    return true;
  } else {
    if (period.days && period.days[dateTmp.getDay()]) {
      if (!period.enabled) {
        return true;
      }

      var date = dateTmp.getHours() * 100 + dateTmp.getMinutes();
      if (period.start < period.end) {
        // day case
        return period.start <= date && date <= period.end;
      } else {
        // night case
        return period.start <= date || date <= period.end;
      }
    }
    return false;
  }
}

/**
 *  Save message of inactive alert in Elasticsearch for later.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {String} idHistory - Id of history.
 *  @param {String} idAlert - Id of alert use to the id of save.
 *  @param {Object} period - Period use to know when the alert will be active.
 *  @param {Action} action - Action oject with setting for send message.
 *  @param {String} message - Message ready to send.
 */
function saveAction(server, idHistory, idAlert, period, action, message) {
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  let config = server.config().get('robocop').index;

  callES('update', {
    index: config.data,
    type: 'data',
    id: 'wa' + idAlert,
    body: {
      script: {
        inline: 'ctx._source.events.add(params.event)',
        lang: 'painless',
        params: {
          event: {
            historyId: idHistory,
            message: message,
            action: action
          }
        }
      },
      upsert: {
        type: 'waitingAction',
        alertId: idAlert,
        period: period,
        events: [{
          historyId: idHistory,
          message: message,
          action: action
        }],
      }
    }
  }).then(response => {
  }, error => {
    saveAction(server, idHistory, idAlert, period, action, message);
  });
}


/**
 *  Send message save in the Elasticsearch during stand by.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {String} message - Message ready to send.
 */
function sendMessageStandBy(server, message, objectId) {
  if (message.action.type == 'slack') {
    sendMessageSlack(server, message.action, message.message, objectId);
  } else if (message.action.type == 'mail') {
    sendMessageMail(server, message.action, message.message, objectId);
  }
}

module.exports = {
  executeAction: executeAction,
  isActive: isActive,
  send: sendMessageStandBy,
};
