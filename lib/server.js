var http = require('http');
var https = require('https');
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
    var listener = createListener(this.app);

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

function createListener(app) {
  return function (request, response) {
    var req = new Request(request);

    process.nextTick(function() {
      var appRes = app(req);

      respond(response, appRes);
    });
  }
}