var InputStream = require('./input_stream');

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

module.exports = Request;
