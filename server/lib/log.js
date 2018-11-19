import sender from './sender.js';

function sendSupport(server, nameAlert, error) {
  let config = server.config().get('robocop');
  if (config.debug.enabled) {
    var mail = {
      subject: '[ROBOCOP][ERROR] An error has occurred during the execution of : ' + nameAlert,
      body: error,
      from: 'robocop_security@vente-privee.com',
      to: config.debug.mail,
      priority: 'normal',
      smtphost: config.action.mail.smtpHost,
      smtpport: config.action.mail.smtpPort
    };
    sender.mail(server, mail);
  }
}

function sendError(server, error) {
  let config = server.config().get('robocop');
  if (config.debug.enabled) {
    var mail = {
      subject: '[ROBOCOP][ERROR] Robocop has crashed.',
      body: error,
      from: 'robocop_security@vente-privee.com',
      to: config.debug.mail,
      priority: 'normal',
      smtphost: config.action.mail.smtpHost,
      smtpport: config.action.mail.smtpPort
    };
    sender.mail(server, mail);
  }

}

function sendUser(server, nameAlert, error, mailUser) {
  let config = server.config().get('robocop');
  if (config.debug.enabled) {
    var mail = {
      subject: '[ROBOCOP][ERROR] An error has occurred during the execution of : ' + nameAlert,
      body: error,
      from: 'robocop_security@vente-privee.com',
      to: mailUser,
      priority: 'normal',
      smtphost: config.action.mail.smtpHost,
      smtpport: config.action.mail.smtpPort
    };
    sender.mail(server, mail);
  }
}

function log(server, level, object, title, message) {
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  let config = server.config().get('robocop').index;
  callES('create', {
    index: config.log,
    type: 'log',
    id: Math.random().toString(36).substr(2, 10),
    body: {
      type: 'log',
      //dateEvent : server.plugins.robocop['scheduler_date'],
      timestamp: new Date(),
      level: level,
      object: object,
      title: title,
      message: message
    }
  }).then(response => {
  }, error => {
    sendSupport(server, 'Error - Error to log', level + '\n\n' + title + '\n\n' + message);
  });
}

module.exports = {
  sendSupport: sendSupport,
  sendError: sendError,
  sendUser: sendUser,
  log: log
};
