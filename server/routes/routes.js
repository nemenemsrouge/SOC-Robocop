import alert from '../lib/alert.js';
import cron from '../lib/cron.js';

export default function routes(server) {
  let call = server.plugins.elasticsearch.getCluster('data').callWithRequest;
  let config = server.config().get("robocop");

  /**
   * Delete all the folder with the script [name].
   * @param {string} name - Name of the script, the id of cron/alert
   */
  function delScript(name) {
    if (!server.config().get("robocop").script.enabled) {
      return;
    }
    var fs = require('fs');
    var deleteFolderRecursive = function(path) {
      if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
          var curPath = path + "/" + file;
          if(fs.lstatSync(curPath).isDirectory()) { // recurse
            deleteFolderRecursive(curPath);
          } else { // delete file
            fs.unlinkSync(curPath);
          }
        });
        fs.rmdirSync(path);
      }
    };

    deleteFolderRecursive(server.config().get("robocop").script.path + name);
  }

  /**
   * @Deprecated
   * Replace "\r\n" to "\n" in all the file in folder [path] and his subfolder without the original archive.
   * @param {string} path - Path of the root folder.
   */
  var replaceFileRecursive = function(path, id) {
    if (!server.config().get("robocop").script.enabled) {
      return;
    }
    var fs = require('fs');
    if(fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function(file,index){
        var curPath = path + "/" + file;
        if(fs.lstatSync(curPath).isDirectory()) { // recurse
          replaceFileRecursive(curPath);
        } else {
          if (!curPath.endsWith(id)) {
            var data = fs.readFileSync(curPath, 'utf8');
            data = data.replace(/\r\n/g, "\n");
            fs.writeFileSync(curPath, data);
          }
        }
      });
    }
  };

  /**
   * Process to create the file of a script.
   * @param {string} folder - Path of the folder for the script or a alert;
   * @param {string} id - Id of the cron/alert for the name of the script.
   * @param {string} reply - Function to response to the request.
   */
  function fileProcessing(folder, id, reply) {
    var fs = require('fs');
    fs.readdirSync(folder).forEach(function(file,index){
      if(!fs.lstatSync(folder + file).isDirectory() && file.split(".")[0] == 'run') {
        try {
          fs.renameSync(folder + file, folder + 'run')
        } catch (e) {
          server.log(['error', 'robocop'], 'Folder "' + folder + " not rename.");
        }
      }
    });

    fs.chmodSync(folder + 'run', '700');
    reply();
  }

  /**
   *  Create new script or update if existing.
   * @param {string} folder - Path of the folder for the script or a alert;
   * @param {string} id - Id of the cron/alert for the name of the script.
   * @param {string} name - Name of the script, use for the extension.
   * @param {string} data - Data of the script/tarball send by the user.
   * @param {string} reply - Function to response to the request.
   */
  var updateScript = function(id, name, data, reply) {
    if (!server.config().get("robocop").script.enabled) {
      reply();
    }
    delScript(id);
    var fs = require('fs');

    var folder = server.config().get("robocop").script.path + id + '/';
    try {
      fs.mkdirSync(folder);
    } catch (e) {
      server.log(['error', 'robocop'], 'Folder "' + folder + " not create.");
    }

    fs.writeFile(folder + id, data, function(err) {
      if(err) {
        server.log(['error', 'robocop'], 'Can\'t writing in file ' + id);
        reply().code(500);
      } else {
        var nameTab = name.split(".");
        var ext = nameTab[nameTab.length - 1];
        var ext2 = nameTab[nameTab.length - 2];
        if (ext == 'tar' || (ext == 'gz' && ext2 == 'tar') || (ext == 'bz2' && ext2 == 'tar')) {
          var exec = require('child_process').exec;
          exec('tar xf ' + folder + id + ' -C ' + folder, (error, stdout, stderr) => {
            fileProcessing(folder, id, reply);
          });
        } else if (ext == 'zip') {
          var exec = require('child_process').exec;
          exec('unzip ' + folder + id + ' -d ' + folder, (error, stdout, stderr) => {
            fileProcessing(folder, id, reply);
          });
        } else {
          fs.renameSync(folder + id, folder + 'run')
          fs.chmodSync(folder + 'run', '700');
          reply();
        }
      }
    });
  }

  /**
   * Check if the script exist.
   * @param {string} id - Id of the cron/alert for the name of the script folder.
   * @returns {boolean} - true if alert/cron have a script.
   */
  var scriptExist = function(id) {
    var fs = require('fs');
    return fs.existsSync(server.config().get("robocop").script.path + id);
  }

  /**
   * Copy a script when duplication of alert/cron.
   * It copy the source of the old script and create a new script folder for the new alert/cron.
   * @param {string} oldId - Id of the cron/alert being copied.
   * @param {string} newId - Id of the new cron/alert.
   * @param {string} nameScript - nameScript use for the extension.
   * @param {string} reply - Function to response to the request.
   */
  function copyScript(oldId, newId, nameScript, reply) {
    var fs = require('fs');
    var folder = server.config().get("robocop").script.path + oldId + '/';

    if (fs.existsSync(folder + oldId)) {
      var fileData = fs.readFileSync(folder + "/" + oldId);
      updateScript(newId, nameScript, fileData, reply);
    } else {
      var fileData = fs.readFileSync(folder + "/run");
      updateScript(newId, nameScript, fileData, reply);
    }
  }

  /* Alert related function */

  function createAlert(req, id, payload, number, reply) {
    payload.alert.number = ("0000" + number).slice(-4);
    payload.alert.type = 'alert';
    var body = {
      index : config.index.data,
      type  : 'data',
      id    : id,
      body  : payload.alert
    };

    call(req, 'create', body)
    .then(function (response) {
      if (payload.alert.script && payload.alert.script.enabled && !payload.duplicate) {
        var data = new Buffer(payload.script, 'base64');
        updateScript(id, payload.alert.script.name, data, reply);
      } else if (payload.alert.script && payload.alert.script.enabled && payload.duplicate) {
        copyScript(payload.duplicate, id, payload.alert.script.name, reply);
      } else {
        reply(response);
      }
    }, function (error) {
       reply(error);
    });
  }

  /**
   * Create an object config to configure the route.
   * @param {string} id - Id of the cron/alert for the name of the script.
   * @returns {Object} Configuration for the routes.
   */
  function getConfigRoute() {
    var conf = {
      payload: {
        maxBytes: 10485760, // 1O MB
      }
    };
    return conf;
  }

  /**
   * Reply all the config file without the slack token
   */
  server.route({
    path: '/api/robocop/config/getAll',
    method: 'GET',
    handler(req, reply) {
      let config = server.config().get('robocop');
      delete config.action.slack.token;
      reply(config);
    }
  });

  /**
   * Reply a list of the index in Elasicsearch
   */
  server.route({
    path: '/api/robocop/indices/getAll',
    method: 'GET',
    handler(req, reply) {
      call(req, 'cluster.state').then(function (response) {
        let indices = Object.keys(response.metadata.indices);
        let indicesList = indices.filter(function(elem){ return ! elem.startsWith(".")});
        reply(indicesList);
      });
    }
  });

  /**
   * Create a new alert with the id [id]
   * The payload is in the form : {alert:{}, script:"", duplicate:bool}
   * Script is base 64 encode.
   * Reply the Elasticsearch response
   */
  server.route({
    path: '/api/robocop/alert/new/{id}',
    method: 'POST',
    config: getConfigRoute(),
    handler(req, reply) {
      var payload = req.payload;
      // Check if no script in the payload.
      if (payload.alert.script && payload.alert.script.enabled && !payload.script && !payload.duplicate) {
          reply("Script not found").code(400);
      } else {
        call(req, 'search', {
          index: config.index.data,
          type : 'data',
          body : {
            'query': {
              'bool': {
                "must": [
                  {"exists": { "field": "number"}},
                  {"term" : { "type" : "alert"}}
                ]
              }
            },
            'size' : 1,
            'sort' : {'number.keyword':'desc'}
          },
          _sourceInclude : ['number']
        }).then(response => {
          var number = 0;
          if (response.hits.total != 0) {
            number = parseInt(response.hits.hits[0]._source.number);
          }
          createAlert(req, req.params.id, payload, number + 1, reply);
        }, err => {
          createAlert(req, req.params.id, payload, 1, reply);
        })
      }
    }
  });

  /**
   * Delete the alert with the id [id]
   * Reply the Elasticsearch response
  */
  server.route({
    path: '/api/robocop/alert/delete/{id}',
    method: 'DELETE',
    handler(req, reply) {
      call(req, 'delete', {
        index: config.index.data,
        type: 'data',
        id: req.params.id
      }).then(function (response) {
        delScript(req.params.id);
        reply(response);
      }, function (error) {
         reply(error);
      });
    }
  });

  /**
   * Update an existing alert with the id [id]
   * The payload is in the form : {alert:{}, script:""}
   * Script is base 64 encode.
   */
  server.route({
    path: '/api/robocop/alert/update/{id}',
    method: 'POST',
    config: getConfigRoute(),
    handler(req, reply) {
      var payload = req.payload;
      // Check if no script in the payload.
      if (payload.alert.doc.script && payload.alert.doc.script.enabled && !payload.script && !scriptExist(req.params.id)) {
        reply("Script not found").code(400);
      } else {
        payload.alert.type = "alert";
        call(req, 'update', {
          index : config.index.data,
          type  : 'data',
          id    : req.params.id,
          body  : payload.alert
        }).then(function (response) {
          if (payload.alert.doc.script && payload.alert.doc.script.enabled && payload.script) {
            var data = new Buffer(payload.script, 'base64');
            updateScript(req.params.id, payload.alert.doc.script.name, data, reply);
          } else if (!payload.alert.doc.script || !payload.alert.doc.script.enabled){
            delScript(req.params.id);
            reply(response);
          } else {
            reply(response);
          }
        }, function (error) {
          reply(error);
        });
      }
    }
  });

  /**
   * Reply the list of all the alert.
   * Only the following fields are send :
   * title, createdDate, modifiedDate, description, enabled, watcher.periodicity, script.enabled, period
   */
  server.route({
    path: '/api/robocop/alert/getAllSummary',
    method: 'GET',
    handler(req, reply) {
      call(req, 'search', {
        index : config.index.data,
        type  : 'data',
        _sourceInclude: ['title', 'createdDate', 'modifiedDate', 'description', 'enabled', 'watcher.periodicity', 'script.enabled', 'period', 'action', 'level', 'category', 'number'],
        size  : 500,
        q     : "type:alert"
      }).then(function (response) {
        reply(response);
      }, function (error) {
        reply(error);
      });
    }
  });

  /**
   * Reply the alert [id].
   */
  server.route({
    path: '/api/robocop/alert/get/{id}',
    method: 'GET',
    handler(req, reply) {
      call(req, 'get', {
        index : config.index.data,
        type  : 'data',
        id    : req.params.id,
      }).then(function (response) {
        if (response._source.type == "alert") {
          reply(response);
        }
      }, function (error) {
        reply(error);
      });
    }
  });

  /**
   * Reply the last history created sort by alertDate like configured in the configuration file.
   *
   * Only the following fields are send :
   * alertId, alertDate, alert.title, alert.description
   */
  server.route({
    path: '/api/robocop/history/getAllSummary',
    method: 'GET',
    handler(req, reply) {
      call(req, 'search', {
        index : config.index.log,
        type  : 'log',
        _sourceInclude:['alertId', 'timestamp', 'alert.title', 'alert'],
        size  : config.history.maxItem,
        sort  : ['timestamp:desc'],
        q     : "type:history"
      }).then(function (response) {
        reply(response);
      }, function (error) {
        reply();
      });
    }
  });

  /**
   * Reply the the history [id].
   */
  server.route({
    path: '/api/robocop/history/get/{id}',
    method: 'GET',
    handler(req, reply) {
      call(req, 'get', {
        index: config.index.log,
        type:'log',
        id: req.params.id,
      }).then(function (response) {
        reply(response);
      }, function (error) {
        reply(error);
      });
    }
  });


  /**
   * Reply a list with all thte cron.
   *
   * Only the following fields are send :
   * "title", "enabled", "periodicity", "createdDate", "modifiedDate", 'script.enabled', 'period'
   */
  server.route({
    path: '/api/robocop/cron/getAllSummary',
    method: 'GET',
    handler(req, reply) {
      call(req, 'search', {
        index : config.index.data,
        type  : 'data',
        _sourceInclude:['title', 'enabled', 'periodicity', 'createdDate', 'modifiedDate', 'script.enabled', 'period', 'action'],
        size  : 500,
        q     : 'type:cron'
      }).then(function (response) {
        reply(response);
      }, function (error) {
        reply(error);
      });
    }
  });

  /**
   * Reply the the cron [id].
   */
  server.route({
    path: '/api/robocop/cron/get/{id}',
    method: 'GET',
    handler(req, reply) {
      call(req, 'get', {
        index: config.index.data,
        type:'data',
        id: req.params.id,
      }).then(function (response) {
        if (response._source.type == 'cron') {
          reply(response);
        }
      }, function (error) {
         reply(error);
      });
    }
  });

  /**
   * Create a new cron with the id [id]
   * The payload is in the form : {cron:{}, script:""}
   * Script is base 64 encode.
   * Reply the Elasticsearch response
   */
  server.route({
    path: '/api/robocop/cron/new/{id}',
    method: 'POST',
    config: getConfigRoute(),
    handler(req, reply) {
      var payload = req.payload;

      // Check if there is a script in the payload.
      if (payload.cron.script && payload.cron.script.enabled && !payload.script && !payload.duplicate) {
          reply('Script not found').code(400);
      } else {
        payload.cron.type = 'cron';
        var body = {
          index: config.index.data,
          type: 'data',
          id: req.params.id,
          body:payload.cron
        };
        call(req, 'create', body)
        .then(function (response) {
          if (payload.cron.script && payload.cron.script.enabled && !payload.duplicate) {
            var data = new Buffer(payload.script, 'base64');
            updateScript(req.params.id, payload.cron.script.name, data, reply);
          } else if (payload.cron.script && payload.cron.script.enabled && payload.duplicate) {
            copyScript(payload.duplicate, req.params.id, req.payload.cron.script.name, reply);
          } else {
            reply(response);
          }
        }, function (error) {
          reply(error);
        });
      }
    }
  });

  /**
   * Delete the cron with the id [id]
   * Reply the Elasticsearch response
  */
  server.route({
    path: '/api/robocop/cron/delete/{id}',
    method: 'DELETE',
    handler(req, reply) {
      call(req, 'delete', {
        index: config.index.data,
        type: 'data',
        id: req.params.id
      }).then(function (response) {
        delScript(req.params.id);
        reply(response);
      }, function (error) {
        reply(error);
      });
    }
  });

  /**
   * Update an existing cron with the id [id]
   * The payload is in the form : {cron:{}, script:""}
   * Script is base 64 encode.
   */
  server.route({
    path: '/api/robocop/cron/update/{id}',
    method: 'POST',
    config: getConfigRoute(),
    handler(req, reply) {
      var payload = req.payload;

      // Check if no script in the payload.
      if (payload.cron.doc.script && payload.cron.doc.script.enabled && !payload.script && !scriptExist(req.params.id)) {
        reply("Script not found").code(400);
      } else {
        payload.cron.type = 'cron';
        call(req,  'update', {
          index: config.index.data,
          type:  'data',
          id:    req.params.id,
          body:  payload.cron
        }).then(function (response) {
          if (payload.cron.doc.script && payload.cron.doc.script.enabled && payload.script) {
            var data = new Buffer(payload.script, 'base64');
            updateScript(req.params.id, payload.cron.doc.script.name, data, reply);
          } else if (!payload.cron.doc.script || !payload.cron.doc.script.enabled){
            delScript(req.params.id);
            reply(response);
          } else {
            reply(response);
          }
        }, function (error) {
          reply(error);
        });
      }
    }
  });

  /**
   * Check if the script exist.
   */
  server.route({
    path: '/api/robocop/script/{id}',
    method: 'GET',
    handler(req, reply) {
      var fs = require('fs');
      var exist = scriptExist(req.params.id);
      if (exist) {
        reply('{"exist":true}');
      } else {
        reply('{"exist":false}');
      }
    }
  });


  /**
   * Create a new snapshot
   * Return the reponse of elasticsearch or status 500 if repository not found.
   */
  server.route({
    path: '/api/robocop/snapshot/new/{name}',
    method: 'POST',
    handler(req, reply) {
      call(req,  'snapshot.getRepository', {
      }).then(function (response) {
        if (response && response[config.snapshot.repository]) {
          call(req, 'snapshot.create', {
            repository: config.snapshot.repository,
            snapshot: req.params.name,
            body: { indices : [config.index.data, config.index.log]}
          }).then(function (response) {
            reply(response);
          }, function (error) {
            reply(error);
          });
        } else {
          reply("No repository found").code(500)
        }
      }, function (error) {
         reply(error);
      });
    }
  });

  /**
   * Reply a list of all snapshot.
   * Reply the response of elasticsearch in case of error or status 500 if repository not found.
   */
  server.route({
    path: '/api/robocop/snapshot/getAll',
    method: 'GET',
    handler(req, reply) {
      call(req,  'snapshot.getRepository', {
      }).then(function (response) {
        if (response && response[config.snapshot.repository]) {
          call(req,  'snapshot.get', {
            repository: config.snapshot.repository,
            snapshot:'_all'
          }).then(function (response) {
            reply(response);
          }, function (error) {
           reply(error);
          });
        } else {
          reply("No repository found").code(500);
        }
      }, function (error) {
        reply(error);
      });
    }
  });

  /**
   * Restore a snapshot name [name].
   * Reply the response of elasticsearch or status 500 if repository not found.
   */
  server.route({
    path: '/api/robocop/snapshot/restore/{name}',
    method: 'POST',
    handler(req, reply) {
      call(req, 'snapshot.getRepository', {
      }).then(function (response) {
        if (response && response[config.snapshot.repository]) {
          call(req, 'indices.close', {
            index: [config.index.data, config.index.log]
          }).then(function (response) {
            call(req, 'snapshot.restore', {
              repository: config.snapshot.repository,
              snapshot: req.params.name,
            }).then(function (response) {
              reply(response);
            }, function (error) {
              reply(error);
            });
          }, function (error) {
             reply(error);
          });
        } else {
          reply("No repository found").code(500)
        }
      }, function (error) {
       reply(error);
      });
    }
  });

  /**
   * Delete the snapshot [name].
   * Reply the response of elasticsearch or status 500 if repository not found.
   */
  server.route({
    path: '/api/robocop/snapshot/delete/{name}',
    method: 'POST',
    handler(req, reply) {
      call(req, 'snapshot.getRepository', {
      }).then(function (response) {
        if (response && response[config.snapshot.repository]) {
          call(req, 'snapshot.delete', {
            repository: config.snapshot.repository,
            snapshot: req.params.name,
          }).then(function (response) {
            reply(response);
          }, function (error) {
            reply(error);
          });
        } else {
          reply("No repository found").code(500)
        }
      }, function (error) {
        reply(error);
      });
    }
  });

  /**
   * Reply all the document in the index robocop. Export function.
   * Elasticsearch limit the export function at 10 000 documents.
   */
  server.route({
    path: '/api/robocop/export',
    method: 'GET',
    handler(req, reply) {
      call(req, 'search', {
        index: config.index.data,
        body: { query: {match_all: {}}},
        size: 10000
      }).then(function (response) {
        reply(response);
      }, function (error) {
        reply(error);
      });
    }
  });

  /**
   * List of document Id that importation threw error.
   */
  var errorImport = []

  /**
   * Manage the import function.
   * Wait the last document import to reply the confirmation or the list of documents not imported.
   * @param {string} reply - Function to response to the request.
   * @param {string} documentId - Current document id.
   * @param {string} lastDocumentId - Last document id that must bee process.
   */
  function importReply(reply, documentId, lastDocumentId) {
    if (documentId == lastDocumentId) {
      if (errorImport.length != 0) {
        server.log(['warning', 'robocop'], 'Import : fail ' +  errorImport);
        reply(errorImport).code(500);
      } else {
        reply();
      }
    }
  };

  /**
   * Import all the document in the payload.
   */
  server.route({
    path: '/api/robocop/import',
    method: 'POST',
    config: getConfigRoute(),
    handler(req, reply) {
      errorImport = []
      for(var idDocument in req.payload) {
        let document = req.payload[idDocument];
        if (document._source.type == 'config') {
          call(req,  'update', {
            index: config.index.data,
            type:  'data',
            id:    'conf1',
            body:  {
              doc: document._source,
            }
          }).then(function (response) {
            importReply(reply, document._id, req.payload[req.payload.length - 1]._id)
          }, function (error) {
            errorImport.push(document._id);
            importReply(reply, document._id, req.payload[req.payload.length - 1]._id)
          });
        } else {
          call(req, 'create', {
            index: config.index.data,
            type: "data",
            id: document._id,
            body: document._source
          }).then(function (response) {
            importReply(reply, document._id, req.payload[req.payload.length - 1]._id)
          }, function (error) {
            errorImport.push(document._id);
            importReply(reply, document._id, req.payload[req.payload.length - 1]._id)
          });
        }
      }
    }
  });

  /**
   * Update the config documentin Elasticsearch.
   * Payload must be configure like "field:value"
   *
   */
  server.route({
    path: '/api/robocop/config',
    method: 'POST',
    handler(req, reply) {
      call(req, 'update', {
        index: config.index.data,
        type: 'data',
        id: 'conf1',
        body: { doc: req.payload }
      }).then(function (response) {
        reply(response);
      }, function (error) {
        reply(error);
      });
    }
  });

  /**
   * Reply a list of config save in Elasticsearch.
   * Fields : list of field to return.
   * fields argument can be nul, in this case, all configuration is return.
   */
   // Deprecated
  server.route({
      path: '/api/robocop/config/{fields?}',
      method: 'GET',
      handler(req, reply) {
        console.log("deprecated config")
          if (!req.params.fields) {
              var tab = [];
          } else {
              var tab = req.params.fields.split(",");
          }
          call(req, 'get', {
                index: config.index.data,
                type: 'data',
                id: 'conf1',
              _sourceInclude:tab,
          }).then(function (response) {
              reply(response);
          }, function (error) {
              reply(error);
          });
      }
  });
  server.route({
    path: '/api/robocop/config/adv/{fields?}',
    method: 'GET',
    handler(req, reply) {
      if (!req.params.fields) {
        var tab = [];
      } else {
        var tab = req.params.fields.split(",");
      }
      call(req, 'get', {
        index: config.index.data,
        type: 'data',
        id: 'conf1',
        _sourceInclude:tab,
      }).then(function (response) {
        reply(response);
      }, function (error) {
        reply(error);
      });
    }
  });

  /**
   * Call the preview function of an alert.
   * It generate the message of an alert witout send it.
   */
  server.route({
    path: '/api/robocop/alert/preview/{id?}',
    method: 'POST',
    handler(req, reply) {
      if (!req.params.id && req.payload.script) {
        // In case of new alert. There are not script
        req.payload.script.enabled = false;
        var id = "IDALERT";
      } else {
        var id = req.params.id;
      }
      if (req.payload.action.length != 0) {
        alert.preview(server, id, req.payload, reply);
      } else {
        reply("No action set").code(500);
      }
    }
  });

  /**
   * Execute a search request to test the watcher of an alert.
   * payload must be an object like : {indices:"", request:""}
   */
  server.route({
    path: '/api/robocop/alert/previewRequest',
    method: 'POST',
    handler(req, reply) {
      call(req, 'search', {
        index: req.payload.indices,
        body: req.payload.request
      }).then(function (response) {
        reply(response);
      }, function (error) {
        reply({error:"Error in request or index"});
      });
    }
  });

    /**
   * Execute a search request to test the watcher of an alert.
   * payload must be an object like : {indices:"", request:""}
   */
  server.route({
    path: '/api/robocop/cron/execute/{id}',
    method: 'GET',
    handler(req, reply) {
      cron.executeCron(server, req.params.id)
      reply()
    }
  });

  /**
   * Execute a search request to the log
   * payload must be an object like :
   */
  server.route({
    path: '/api/robocop/log',
    method: 'POST',
    handler(req, reply) {
      var type = '';
      if (req.payload.lvlInfo) {
        type += 'level:info';
      }
      if (req.payload.lvlWarning) {
        if (type != '') {
          type += ' OR ';
        }
        type += 'level:warning'
      }
      if (req.payload.lvlError) {
        if (type != '') {
          type += ' OR ';
        }
        type += 'level:error';
      }

      // request final
      if (req.payload.search == '') {
        req.payload.search = "*"
      }
      var q = 'title:' + req.payload.search
      if (type != '') {
        q += ' AND (' + type + ')';
      }

      if (req.payload.object) {
        q += ' AND object:'+ req.payload.object ;
      }

      q += " AND type:log"
      var body = {}
      body.query = {
        bool: {
          must: [
            {
              query_string: {query: q}
            }
          ]
        }
      }

      var range = {};
      range["timestamp"] = {};
      if (req.payload.to) {
        range["timestamp"].lte = req.payload.to
      }
      if (req.payload.from) {
        range["timestamp"].gte = req.payload.from
      }
      body.query.bool.must.push({range:range})

      call(req, 'search', {
        index : config.index.log,
        type  : 'log',
        body  : body,
        sort  : 'timestamp:desc',
        size  : 100
      }).then(function (response) {
        reply(response.hits.hits);
      }, function (error) {
        console.log(error);
        reply({error:'Error in request'}).code(500);
      });
    }
  });
}
