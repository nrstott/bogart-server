var q = require('q');

/**
 * Create an Input Stream for a request.
 *
 * @param {Object} request Node request.
 * @constructor
 */
function InputStream(request) {
  var inputBuffer = [];
  var deferred = q.defer();

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

module.exports = InputStream;
