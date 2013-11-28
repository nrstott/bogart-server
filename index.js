var q = require('q')
  , parseUrl = require('url').parse
  , util = require('util')
  , Server = require('./lib/server');

module.exports = Server;

// Conveniance shims
Server.when = q.when;
Server.defer = q.defer;

/**
 * Create an Input Stream for a request.
 *
 * @param {Object} request Node request.
 * @constructor
 */
function InputStream(request) {
  var inputBuffer = []
    , deferred = createServer.defer();

  var onData = function(data) {
    inputBuffer.push(data);
  }

  var onEnd = function() {
    request.removeAllListeners('data');
    request.removeListener('end', onEnd);
    deferred.resolve();
  };

  request.connection.on('close', function() {
    request.removeAllListeners('data');
    request.removeAllListeners('end');
  });

  request.on('data', onData).on('end', onEnd);

  this.forEach = function(callback) {
    if (this.encoding) {
      request.setBodyEncoding(this.encoding);
    }

    inputBuffer.forEach(callback);

    request.removeListener('data', onData);
    request.on('data', function(data) {
      callback(data);
    });

    return deferred.promise;
  };
}

/**
 * Like Array.prototype.join but the default seperator is empty string.
 *
 * @param {String} seperator  An optional seperator, defaults to empty string.
 * @returns {Promise} A promise for the joined stream.
 */
InputStream.prototype.join = function(seperator) {
  var chunks = []
    , deferred = createServer.defer();
  
  deferred.resolve(createServer.when(this.forEach(function(chunk) {
    chunks.push(chunk);
  }), function() {
    return chunks.join(seperator || '');
  }));
  
  return deferred.promise;
};

/**
 * 
 *
 * @param {Object} response Node response.
 * @param {Object} jsgiRes  JSGI Response.
 * @returns {Function} A Function that processes a JSGI Response.
 */
function respond(response, jsgiRes) {
  var forEachResult;

  function writeError(err) {
    response.writeHead(500, { 'content-type': 'text/html' });
    response.write('<html><head><title>Error</title></head><body><div>');
    response.write(err.message);
    response.write('<br /><br />JSGI Response:<br />');
    response.write(util.inspect(jsgiRes));
    response.write('</div></body>');
    response.end();
  }

  if (jsgiRes.then && typeof jsgiRes.then === 'function') {
    return jsgiRes.then(function(jsgiRes) {
      return respond(response, jsgiRes);
    });
  }

  if (!jsgiRes.status) {
    return writeError(new Error('JSGI Response must have `status` property.'));
  }
  if (!jsgiRes.headers) {
    return writeError(new Error('JSGI Response must have `headers` property.'));
  }
  if (!jsgiRes.body) {
    return writeError(new Error('JSGI Response must have `body` property.'));
  }

  response.writeHead(jsgiRes.status, jsgiRes.headers);
  
  if (typeof jsgiRes.body.forEach !== 'function') {
    throw new Error('The body does not have a forEach function');
  }

  forEachResult = jsgiRes.body.forEach(function(chunk) {
    response.write(chunk, jsgiRes.body.encoding || 'utf8');
  });

  if (forEachResult && typeof forEachResult.then === 'function') {
    forEachResult.then(function() {
      response.end();
    }, function(err) {
      console.log('error writing', err);
      response.end();
    });
  } else {
    response.end();
  }
}
