import init from './server/lib/init.js';
import routes from './server/routes/routes.js';

export default function (kibana) {

  return new kibana.Plugin({
    require: ['elasticsearch', 'kibana'],

    uiExports: {
      app: {
        title: 'Robocop',
        description: 'Plugin to generate alert',
        main: 'plugins/robocop/app',
        icon: 'plugins/robocop/icon.png',
      }
    },

    config: function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(false),
        index: Joi.object({
          data: Joi.string().default('.robocop-data'),
          log: Joi.string().default('.robocop-log')
        }).default(),
        watcher: Joi.object({
          indices: Joi.string().default('logstash-*')
        }).default(),
        action: Joi.object({
          slack: Joi.object({
            enabled: Joi.boolean().default('false'),
            token: Joi.string().when('enabled', { is: true, then: Joi.required() }),
            name: Joi.string().allow('').default(''),
            canal: Joi.string().allow('').default(''),
            body: Joi.string().allow('').default('@[alert.title] alert is triggered [@[result.hits.total]]'),
            footer: Joi.string().allow('').default('')
          }).default(),
          mail: Joi.object({
            enabled: Joi.boolean().default('false'),
            from: Joi.string().allow('').default(''),
            to: Joi.string().allow('').default(''),
            smtpHost: Joi.string().allow('').default(''),
            smtpPort: Joi.number().integer().positive().default(25),
            subject: Joi.string().allow('').default('@[alert.title] alert is triggered !'),
            body: Joi.string().allow('').default('@[alert.title] has hit @[result.hits.total] times.'),
            template: Joi.string().regex(/^.*\/$/).allow('').default('')
          }).default(),
          marvin: Joi.object({
            enabled: Joi.boolean().default('false'),
            type: Joi.string().allow('').default('alert'),
            title: Joi.string().allow('').default('@[alert.title] alert is triggered !'),
            category: Joi.string().allow('').default(''),
            criticity: Joi.string().allow('').default(''),
            contact: Joi.string().allow('').default(''),
            detectionSource: Joi.string().allow('').default('Robocop'),
            alertSource: Joi.string().allow('').default('Robocop'),
            body: Joi.string().allow('').default('@[alert.title] has hit @[result.hits.total] times.'),
          }).default()
        }).default(),
        history: Joi.object({
          maxItem: Joi.number().integer().positive().default(50),
        }).default(),
        script: Joi.object({
          enabled: Joi.boolean().default('false'),
          path: Joi.string().regex(/^.*\/$/).when('enabled', { is: true, then: Joi.required() }),
        }).default(),
        snapshot: Joi.object({
          repository: Joi.string().default('robocop'),
        }).default(),
        debug: Joi.object({
          enabled: Joi.boolean().default('false'),
          mail: Joi.string().default(),
        }).default(),
        daysOff: Joi.array().items(Joi.string()).default([])
      }).default();
    },

    init: function (server, options) {
      server.plugins.robocop.status.yellow('Check Elasticsearch config');
      // init plugin
      init.createIndice(server);

      // Create routes for backend
      routes(server);

    }
  });
}

/**
 * {@link https://hapijs.com/api#server-properties|Hapijs} object containing all the configuration and methode.
 * @typedef {Object} Server
 */
