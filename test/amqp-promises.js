'use strict';

const AMQP = require('../amqp');
const config = require('./config').good;

describe('AMQP', function () {
  describe('#connect', function () {
    it('should return a promise', function (done) {
      var amqp = AMQP(config);
      amqp.connect().then(function () {
        done();
      }, done);
    });
  });
});
