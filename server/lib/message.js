/**
 * A virtual namespace which regroup the method that format a message write in robocop language.
 *
 * @namespace Message_be
 */
import moment from 'moment';
/**
 *  Prepare variables for formating message.
 *  It create the shortcuts.
 * @memberof Message_be
 *  @param {Server} server - Kibana server
 *  @param {String} msg - Msg to format write in robocop language
 *  @param {Object} variables - Object with all the variables that can be call in message.
 *  @param {Function} callback - function call when message is formatting with the message.
 */
function formatMessage(server, msg, variables, callback) {

  // add shortcut for aggregations
  if (variables.result && variables.result.aggregations && !variables.aggregations) {
    let aggsName = Object.keys(variables.result['aggregations'])[0];
    let aggs = variables.result['aggregations'][aggsName]['buckets'] || variables.result['aggregations'][aggsName]['value'];
    variables.aggregations = aggs;
  }
  formatMessageAsync(server, msg, variables, { msgFinal: '', nextContext: [] }, callback);
}

/**
 *  Format the message write in robocop language.
 *  @memberof Message_be
 *  @param {Server} server - Kibana server
 *  @param {String} msg - Msg to format write in robocop language.
 *  @param {Object} variables - Object with all the variable that can be call in message.
 *  @param {Object} localContext - Oject use to save tmp data during the process.
 *  @param {Function} callback - function call when message is formatting with the message.
 */
function formatMessageAsync(server, msg, variables, localContext, callback) {
  if (msg.length === 0 && localContext['nextContext'].length === 0) {
    callback(localContext['msgFinal']);
    return;
  }

  /* Choose the message to processing. */
  var msgCurrent = '';
  if (localContext['nextContext'].length > 0) {
    msgCurrent = localContext['nextContext'][0]['msg'];
    variables[localContext['nextContext'][0]['variableName']] = localContext['nextContext'][0]['variables'];
  } else {
    msgCurrent = msg;
  }

  var indexNextPart = 0;

  if (msgCurrent.startsWith('@[')) {
    let indexEndFirstTag = msgCurrent.indexOf(']');
    if (indexEndFirstTag === -1) {
      localContext['msgFinal'] += ']';
      indexNextPart = 1;
    } else {
      let fields = msgCurrent.slice(2, indexEndFirstTag).split('.');
      if (fields[0].startsWith('for') && !fields[0].startsWith('forend')) {
        /* manage begin of for loop */
        let indexEndForMessage = findIndexEndFor(msgCurrent);

        var variableName = fields[0].match(/for\((.+)\)/);
        variableName = (variableName ? variableName[1] : 'item');

        if (localContext['nextContext'].length > 0 && msgCurrent === localContext['nextContext'][0]['msg']) {
          localContext['nextContext'][0]['msg'] = localContext['nextContext'][0]['msg'].substring(indexEndForMessage + 9);
        } else {
          msg = msg.substring(indexEndForMessage + 9);// 9 = "@[forend]".length
        }

        let idFor = 0;
        let listFor = findValue(fields.slice(1, fields.length), variables);
        for (idFor in listFor) {
          let context = {
            msg: msgCurrent.slice(indexEndFirstTag + 1, indexEndForMessage),
            variables: listFor[idFor],
            variableName: variableName,
          };
          localContext['nextContext'].splice(idFor, 0, context);
        }
        if (typeof listFor === 'undefined') {
          indexNextPart = 1;
        } else {
          indexNextPart = 0;
        }

      } else if (fields[0].startsWith('var(')) {
        /* Create a new variable */
        return createVariable(server, indexEndFirstTag, fields, msgCurrent, msg, variables, localContext, callback);
      } else {
        /* Replace tag with its value */
        let value = findValue(fields, variables);
        if (value) {
          localContext['msgFinal'] += value;
          msgCurrent = msgCurrent.substring(indexNextPart);
        } else {
          localContext['msgFinal'] += msgCurrent.slice(0, indexEndFirstTag + 1);
        }
        indexNextPart = indexEndFirstTag + 1;
      }
    }
  } else {
    let indexFirstTag = msgCurrent.indexOf('@[');
    if (indexFirstTag !== -1) {
      localContext['msgFinal'] += msgCurrent.slice(0, indexFirstTag);
      indexNextPart = indexFirstTag;
    } else { // End of message
      localContext['msgFinal'] += msgCurrent;
      indexNextPart = msgCurrent.length;
    }
  }

  /* Deplace the current message start to next position */
  if (localContext['nextContext'].length > 0 && msgCurrent === localContext['nextContext'][0]['msg']) {

    localContext['nextContext'][0]['msg'] = localContext['nextContext'][0]['msg'].substring(indexNextPart);
    if (localContext['nextContext'][0]['msg'] === '') {
      localContext['nextContext'].shift();
    }
  } else if (localContext['nextContext'].length === 0) {
    msg = msgCurrent.substring(indexNextPart);
  }
  formatMessageAsync(server, msg, variables, localContext, callback);
}

/**
 * Find the value of a tag.
 * @memberof Message_be
 *  @param {String[]} fields - array with path of the values. ex: ["path","to","var"]
 *  @param {Object} value - Object with all the variables.
 */
function findValue(fields, value) {
  /* global context */
  for (var i in fields) {
    if (fields[i] === 'length()' && value !== undefined) {
      // size of an array
      value = value.length;
    } else if (fields[i].startsWith('format(') && value !== undefined) {
      // format for a date
      value = moment(value).format(getArgument1(fields[i].match(/\((.*)\)/)[1]));
    } else if (fields[i].startsWith('default(')) {
      // if element no existent replace by the default
      if (value === undefined) {
        value = getArgument1(fields[i].match(/\((.*)\)/)[1]);
      }
    } else if (value !== undefined) {
      value = value[fields[i]];
    }
  }
  return value;
}

/**
 *  Find the index of the end of for loop.
 * @memberof Message_be
 *  @param {String} msg - Message to parse.
 *  @param {Integer} nb - Counter for imbricated loop. (default: 1)
 *  @returns {Integer} Index of the last charactere of message in the for loop.
 */
function findIndexEndFor(msg, nb) {
  var indexTmp = 0;
  if (!nb) {
    nb = 1;
  }

  var indexEnd = /@\[forend\]/.exec(msg.slice(1));
  indexEnd = (indexEnd ? indexEnd.index : -1);

  var indexStart = /@\[for((?!@\[).)*\]/.exec(msg.slice(1));
  indexStart = (indexStart ? indexStart.index : -1);

  if (indexStart >= 0 && indexEnd >= 0 && indexStart < indexEnd) {
    return indexStart + 1 + findIndexEndFor(msg.slice(indexStart + 1), nb + 1);
  } else if (indexEnd >= 0) {
    if (nb === 1) {
      return indexEnd + 1;
    } else {
      return indexEnd + 1 + findIndexEndFor(msg.slice(indexEnd + 1), nb - 1);
    }
  } else if (indexEnd === -1) {
    //impossible
  }
}

/**
 *  Handle the tag @[var()]
 *  Execute an ES request if es() tag.
 * @memberof Message_be
 *  @param {Integer} indexEndFirstTag - Index of the end of the tag.
 *  @param {String[]} fields - array with path of the values. ex: ["path","to","var"]
 *  @param {String} msgCurrent - Part of message currently being processed
 *  @param {String} msg - Msg to format write in robocop language
 *  @param {Object} variables - Object with all the variables that can be call in message.
 *  @param {Object} localContext - Oject use to save tmp data during the process.
 *  @param {Function} callback - function call when message is formatting with the message.
 */
function createVariable(server, indexEndFirstTag, fields, msgCurrent, msg, variables, localContext, callback) {
  var varName = fields[0].match(/\((.*)\)/)[1];
  if (fields[1].startsWith('es(')) {
    let callES = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
    var args = fields[1].match(/\((.*)\)/)[1];
    args = getArguments3(args);
    if (args.length === 0) {
      nextTurn(server, msgCurrent, indexEndFirstTag + 1, msg, variables, localContext, callback);
    } else {
      callES('search', {
        index: args[0],
        type: args[1],
        body: args[2]
      }).then(function (response) {
        variables[varName] = response;
        nextTurn(server, msgCurrent, indexEndFirstTag + 1, msg, variables, localContext, callback);
      }, function (error) {
        nextTurn(server, msgCurrent, indexEndFirstTag + 1, msg, variables, localContext, callback);
      });
    }
  } else {
    nextTurn(server, msgCurrent, indexEndFirstTag + 1, msg, variables, localContext, callback);
  }
}


/**
 *  Return an array of 1 elements with the argument of a function.
 *  An argument is a string between " or '.
 * @memberof Message_be
 *  @param {String} args - String with the arguments. ex:"(arg1)"
 *  @returns {String} The argument.
 */
function getArgument1(args) {
  args = /^ *('([^']+|\\')*'|[^,'" ]+|"([^"]+|\\")*") *$/g.exec(args);
  if (args) {
    args = [args[1]];
    for (let idArgs in args) {
      if ((args[idArgs][0] === '\'' && args[idArgs][args[idArgs].length - 1] === '\'') ||
       (args[idArgs][0] === '"' && args[idArgs][args[idArgs].length - 1] === '"')) {
        args[idArgs] = args[idArgs].slice(1, args[idArgs].length - 1);
      }
    }
    return args[0];
  }
  return '';
}

/**
 *  Return an array of 3 elements with the 3 arguments of a function
 *  An argument is a string between " or '. Each argument is separate by a coma.
 *  @memberof Message_be
 *  @param {String} args - String with the arguments. ex:"'arg1','arg2','arg3'"
 *  @returns {String[]} An array of 3 item with the 3 arguments.
 */
function getArguments3(args) {
  args = /^ *('([^']+|\\')*'|[^,'" ]+|"([^"]+|\\")*") *, *('([^']+|\\')*'|[^,'" ]+|"([^"]+|\\")*") *, *('([^']+|\\')*'|[^,'" ]+|"([^"]+|\\")*") *$/g.exec(args);
  if (args) {
    args = [args[1], args[4], args[7]];
    for (let idArgs in args) {
      if ((args[idArgs][0] === '\'' && args[idArgs][args[idArgs].length - 1] === '\'') ||
        (args[idArgs][0] === '"' && args[idArgs][args[idArgs].length - 1] === '"')) {
        args[idArgs] = args[idArgs].slice(1, args[idArgs].length - 1);
      }
    }
    return args;
  }
  return [];
}

/**
 *  Deplace the start of message on the untreated part and call formatMessageAsync
 * @memberof Message_be
 *  @param {Server} server - Kibana server
 *  @param {String} msgCurrent - Part of message currently being processed
 *  @param {String} msg - Msg to format write in robocop language.
 *  @param {Object} variables - Object with all the variable that can be call in message.
 *  @param {Object} localContext - Oject use to save tmp data during the process.
 *  @param {Function} callback - function call when message is formatting with the message.
 */
function nextTurn(server, msgCurrent, nextIndex, msg, variables, localContext, callback) {
  if (localContext['nextContext'].length > 0 && msgCurrent === localContext['nextContext'][0]['msg']) {
    localContext['nextContext'][0]['msg'] = localContext['nextContext'][0]['msg'].substring(nextIndex);
  } else {
    msg = msg.substring(nextIndex);
  }
  formatMessageAsync(server, msg, variables, localContext, callback);
}

module.exports = {
  formatMessage: formatMessage
};
