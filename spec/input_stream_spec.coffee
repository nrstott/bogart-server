q = require 'q'
InputStream = require '../lib/input_stream'

describe 'InputStream', ->

  it 'given no request should throw error', ->
    expect(() -> new InputStream()).toThrow(new Error('request is required'))
