'use strict';

const AMQP = require('../amqp');
const config = require('./config').good;

describe('AMQP', function () {
  describe('#consume', function () {
    it('should return a promise', function (done) {
      var amqp = AMQP(config);
      amqp.connect().then(function () {
        return amqp.consume().then(function () {
          done();
        }, done);
      });
    });
  });
});
