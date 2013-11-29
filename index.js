var q = require('q')
  , parseUrl = require('url').parse
  , util = require('util')
  , Server = require('./lib/server');

module.exports = Server;

// Conveniance shims
Server.when = q.when;
Server.defer = q.defer;
