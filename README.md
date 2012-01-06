# Bogart Server

Bogart Server is an implementation of JSGI B for Node.JS.

## Quick Start

    mkdir myapp
    cd myapp
    npm install bogart-server

Create a file called `app.js` with the following contents:

    var createServer = require('bogart-server');

    createServer(function(req) {
      return {
        status: 200,
        headers: { 'content-type': 'text/plain' },
        body: [ 'Hello World' ]
      }
    }).listen(8080);

Run the application with Node.JS:

    node app.js

Visit it in the browser: [http://127.0.0.1:8080](http://127.0.0.1:8080);

## Create Server

The `createServer` method accepts one parameter, a JSGI Middleware Function.

The signature of a JSGI Middleware Function is `function(req, next)`.
