var http = require('http');
var https = require('https');
var q = require('q');
var Request = require('./request');

var VERSION = require('../package').version;

module.exports = Server;

function Server(app) {
  if (!(this instanceof Server)) {
    return new Server(app);
  }

  this.app = app;
}

Server.prototype = {
  get version() {
    return VERSION;
  },

  listen: function (port, host, opts) {
    var listener = this.createListener();

    if (typeof port !== 'number') {
      opts = host;
      host = port;
      port = 8080;
    }

    if (typeof host !== 'string') {
      host = '127.0.0.1';
    }

    opts = opts || {};

    if (opts.ssl) {
      https.createServer(opts.ssl, listener).listen(port, host);
    } else {
      http.createServer(listener).listen(port, host);
    }
  },

  createListener: function () {
    return createListener(this.app);
  }
};

function createListener(app) {
  return function (request, response) {
    var deferred = q.defer();
    var req = new Request(request);

    process.nextTick(function() {
      var appRes = app(req);

      try {
        respond(response, appRes);
      } catch (err) {
        deferred.reject(err);
      }

      deferred.resolve(appRes);
    });

    return deferred.promise;
  }
}

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

  if (jsgiRes === undefined || jsgiRes === null) {
    return writeError(new Error('JSGI Response must be an object'));
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

