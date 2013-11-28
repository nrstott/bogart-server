Server = require '../index'
http = require 'http'

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
