Server = require '../index'
http = require 'http'
q = require 'q'

HelloApp = (next) ->
  (req) ->
    {
      status: 200,
      body: [ 'hello', ' ', 'world' ],
      headers:
        'content-type': 'text/html'
    }

describe 'Server', ->

  it 'should construct', ->
    expect(new Server()).not.toBe(undefined)

  it 'should have version', ->
    expect(new Server().version).not.toBe(undefined)

  describe 'listening with default parameters', ->
    server = null
    app = jasmine.createSpy 'app'
    listen = jasmine.createSpy 'listen'

    beforeEach ->
      spyOn(http, 'createServer').andReturn({
        listen: listen
      })

      server = new Server app
      server.listen()

    it 'should create server', ->
      expect(listen).toHaveBeenCalledWith(8080, '127.0.0.1')

  describe 'listening on specified port', ->
    server = null
    app = jasmine.createSpy 'app'
    listen = jasmine.createSpy 'listen'

    beforeEach ->
      spyOn(http, 'createServer').andReturn({
        listen: listen
      });

      server = new Server app
      server.listen 1337

    it 'should create server', ->
      expect(listen).toHaveBeenCalledWith(1337, '127.0.0.1')

  describe 'listening on a specified host', ->
    server = null
    app = jasmine.createSpy 'app'
    listen = jasmine.createSpy 'listen'
    HOST = 'bogartrocks.com'

    beforeEach ->
      spyOn(http, 'createServer').andReturn({
        listen: listen
      })

      server = new Server app
      server.listen HOST

    it 'should create server', ->
      expect(listen).toHaveBeenCalledWith(8080, HOST)

  describe 'listener', ->
    app = null
    listener = null

    beforeEach ->
      app = jasmine.createSpy 'app'
      app.andReturn q({
        status: 200
        body: [],
        headers:
          'content-type': 'text/html'
      })

      server = new Server app
      listener = server.createListener()

    describe 'receiving a request', ->
      nodeRequest = null
      nodeResponse = null
      res = null

      beforeEach ->
        nodeRequest =
          on: jasmine.createSpy 'Request#on'
          connection:
            remoteAddress: '127.0.0.1'
            on: jasmine.createSpy 'Request#connection#on'

        nodeRequest.on.andReturn nodeRequest

        nodeResponse = jasmine.createSpy 'Node Response'

        res = listener nodeRequest, nodeResponse

      it 'should call app', (done) ->
        res
          .then (args) ->
            expect(app).toHaveBeenCalled()
          .fail (err) =>
            @fail err
          .fin ->
            done()

