'use strict';

var AMQP = require('../amqp'),
    config = require('./config').good;

describe('AMQP', function() {
  describe('#connect', function() {
    it('should return a promise', function(done) {
      var amqp = AMQP(config);
      return amqp.connect().then(function() {
        done();
      }, done);
    });
  });
});
