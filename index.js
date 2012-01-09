var q = require('q')
  , parseUrl = require('url').parse;

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

Server.prototype.listen = function(port, host, opts) {
  opts = opts || {};

  var listener = nodeListener(this.app);

  if (typeof port !== 'number') {
    opts = host;
    host = port;
    port = 8080;
  }

  if (typeof host !== 'string') {
    host = '127.0.0.1';
  }

  if (opts.ssl) {
    require('https').createServer(opts.ssl, listener).listen(port);
  } else {
    require('http').createServer(listener).listen(port);
  }
};

createServer.Request = Request;

function nodeListener(app) {
  return function listener(request, response) {
    process.nextTick(function() {
      var req = new Request(request)
        , appRes = app(req);

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

  this.body = new InputStream(request);
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
    return 'Bogart Server v0.1.1'
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

  request.on('data', onData).on('end', deferred.resolve);

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

  if (jsgiRes.then && typeof jsgiRes.then === 'function') {
    return jsgiRes.then(function(jsgiRes) {
      return respond(response, jsgiRes);
    });
  }

  if (!jsgiRes.status) {
    throw 'JSGI Response must have `status` property.';
  }
  if (!jsgiRes.headers) {
    throw 'JSGI Response must have `headers` property.';
  }
  if (!jsgiRes.body) {
    throw 'JSGI Response must have `body` property.';
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
