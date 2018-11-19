import log from './log.js';

/**
 * Delete old history like configure in the web interface.
 * @param {Server} server - Kibana server
 */
function manage(server) {
  let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  let config = server.config().get("robocop").index;
  // GET the config for number of history
  callES('get', {
    index : config.data,
    type  : 'data',
    id    : 'conf1',
    _sourceInclude:['historyHistory']
  }).then(function(historyCount) {
    historyCount = historyCount._source.historyHistory;
    if (historyCount > 0) {
      // GET the number of history
      callES('count', {
        index : config.log,
        type  : 'log',
        body  : {
          query: {
            match: {
              type: "history"
            }
          }
        }
      }).then(function(response) {
        response = response.count;
        if (response > historyCount) {
          // GET history id to delete
          callES('search', {
              index   : config.log,
              type    : 'log',
              _source : false,
              sort    : ["timestamp"],
              size    : response - historyCount,
              body    : {
                query : {
                  match: {
                    type: "history"
                  }
                }
              }
          }).then(function(response) {
            for (var idHistory in response.hits.hits) {
              // DELETE history document
              callES('delete', {
                  index: config.log,
                  type: 'log',
                  id: response.hits.hits[idHistory]._id,
              }).then(function(response2) {
              }, function (error) {
                server.log(['warning', 'robocop'], 'history : can\'t delete history' + error);
              });
            }
          });
        }
      }, function (error) {
          server.log(['warning', 'robocop'], 'Error delete history ' + error);
      });
    }
  });
}


/**
 * Delete old log like configure in the web interface.
 * @param {Server} server - Kibana server
 */
 function deleteLog(server, nbDay) {
  if (nbDay > 0) {
    let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
    let config = server.config().get("robocop");
    callES('deleteByQuery', {
      index: config.index.log,
      body: {
        'query': {
          'bool': {
            'must': [{'range': {'timestamp':{'lte': 'now-' + nbDay + 'd'}}}]
          }
        }
      }
    }).then(response => {
       log.log(server, 'info', "", "Log deleted", "")
       server.log(['debug', 'robocop'], 'Log deleted');
    }, error => {
      server.log(['warning', 'robocop'], 'logHistory : can\'t delete log' + error);
      log.log(server, 'error', "", "Can\'t delete log", error)
    });
  }
}

module.exports = {
  manage:manage,
  manageLog:deleteLog
};

