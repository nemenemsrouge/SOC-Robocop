/**
 * Send message by mail.
 * @memberof Action_be
 *  @param {Server} server - Kibana server.
 *  @param {Action} action - Action to execute.
 *  @param {String} message - Message object to send. {subject:"message", body:"message"}
 */
function mail(server, action) {
  try {
    const nodemailer = require('nodemailer');

    if (!action.smtphost) {server.log(['warning', 'robocop'], 'Scheduler : action mail : not smtpHost configured'); return;}
    if (!action.from) {server.log(['warning', 'robocop'], 'Scheduler : action mail : not from adresse configured'); return;}
    if (!action.to) {server.log(['warning', 'robocop'], 'Scheduler : action mail : not to adresse configured'); return;}

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
      subject: action.subject,
      text: action.body,
      priority: action.priority
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        server.log(['warning', 'robocop'], 'Scheduler : action fail to mail ' + error);
      } else {
        server.log(['debug', 'robocop'], 'Scheduler : action mail send');
      }
    });
  } catch (e) {
    server.log(['warning', 'robocop'], 'Package nodemailer error : ' + e);
  }
}

module.exports = {
  mail: mail
};
