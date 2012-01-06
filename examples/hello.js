var bogartServer = require('../index');

bogartServer(function(req) {
  return {
    status: 200,
    headers: { 'content-type': 'text/html' },
    body: [ 'Hello' ]
  }
}).listen(8085);
