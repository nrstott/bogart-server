var q = require('q')
  , parseUrl = require('url').parse
  , util = require('util')
  , http = require('http')
  , https = require('https');

var VERSION = require('./package').version;

function createServer(app) {
  return new Server(app);
}

module.exports = createServer;

// Conveniance shims
createServer.when = q.when;
createServer.defer = q.defer;

function Server(app) {
  this.app = app;
}

Server.prototype = {
  get version() {
    return VERSION;
  },

  listen: function (port, host, opts) {
    var listener = nodeListener(this.app);

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
  }
};

createServer.Request = Request;

function nodeListener(app) {
  return function listener(request, response) {
    var req = new Request(request);

    process.nextTick(function() {
      var appRes = app(req);

      respond(response, appRes);
    });
  }
}

/**
 * JSGI Request
 *
 * @param {Object} request Node.JS request
 * @constructor
 */
function Request(request) {
  var self = this;
  
  this.request = request;
  this.headers = request.headers;
  this.method = request.method;
  this.remoteAddr = request.connection.remoteAddress;

  if (this.method !== 'GET') {
    this.body = new InputStream(request);
  }
}

Request.prototype = {
  version: '0.3b',

  get requestUrl() {
    if (!this._parsedUrl) {
      this._parsedUrl = parseUrl(this.request.url);
    }
    return this._parsedUrl;
  },

  get serverSoftware() {
    return 'Bogart Server v0.1.4';
  }
};

['hostname','port','pathname','search','protocol','auth'].forEach(function(x) {
  Object.defineProperty(Request.prototype, x, {
    get: function() {
      return this.requestUrl[x];
    },
    set: function(val) {
      this.requestUrl[x] = val;
    }
  });
});

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
