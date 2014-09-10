'use strict';

var SandboxedModule = require('sandboxed-module');
var AMQP = require('../../lib/amqp');

var expect = require('expect.js');

describe('AMQP', function() {
  var config = require('../config');
  describe('#constructor', function() {
    it('should throw with empty constructor', function(done) {
      expect(function() { AMQP(); }).to
        .throwError('amqp-wrapper: Invalid config');
      done();
    });
    it('should throw with no url or exchange', function(done) {
      expect(function() { AMQP({}); }).to
        .throwError('amqp-wrapper: Invalid config');
      done();
    });
    it('should throw with no url', function(done) {
      expect(function() { AMQP({exchange: ''}); }).to
        .throwError('amqp-wrapper: Invalid config');
      done();
    });
    it('should throw with no exchange', function(done) {
      expect(function() { AMQP({url: ''}); }).to
        .throwError('amqp-wrapper: Invalid config');
      done();
    });
  });
  describe('#connect', function() {
    it('should should fail to connect to bad endpoint', function(done) {
      var amqp = AMQP({
        url: 'amqp://guest:guest@localhost:6767',
        exchange: 'FOO'
      });
      amqp.connect(function(err) {
        expect(err.code).to.equal('ECONNREFUSED');
        done();
      });
    });
    it('should call the callback successfully', function(done) {
      var amqp = AMQP(config);
      amqp.connect(done);
    });
    it('should setup for publishing and consuming', function(done) {
      var amqpLibMock = require('./amqplibmock')();
      var mockedAMQP = SandboxedModule.require('../../lib/amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config);

      mockedAMQP.connect(function(err) {
        if (err) {
          return done(err);
        }

        // two queues, one of which is dead lettered
        expect(amqpLibMock.assertQueueSpy.callCount).to.equal(3);
        // Bind the publishing queue, and its dead letter queue.
        expect(amqpLibMock.bindQueueSpy.callCount).to.equal(2);
        done();
      });
    });
  });
  describe('#publishToQueue', function() {
    it('should call the callback successfully', function(done) {
      var amqp = AMQP(config);
      amqp.connect(function(err) {
        if (err) {
          return done(err);
        }
        amqp.publishToQueue('mypublishqueue', 'test', done);
      });
    });
  });
  describe('#publish', function() {
    it('should call the callback successfully', function(done) {
      var amqp = AMQP(config);
      amqp.connect(function(err) {
        if (err) {
          return done(err);
        }
        amqp.publish('myqueue', 'test', {}, done);
      });
    });
    it('should accept objects', function(done) {
      var amqp = AMQP(config);
      amqp.connect(function(err) {
        if (err) {
          return done(err);
        }
        amqp.publish('myqueue', {woo: 'test'}, {}, done);
      });
    });
  });
  describe('#consume', function() {
    it('if done(err) is called with err === null, calls ack().',
    function(done) {
      var ack = function() {
        done();
      };

      var amqpLibMock = require('./amqplibmock')({overrides: {ack: ack}});

      var mockedAMQP = SandboxedModule.require('../../lib/amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config);

      function myMessageHandler(parsedMsg, cb) {
        cb();
      }

      mockedAMQP.connect(function(err) {
        if (err) {
          return done(err);
        }
        mockedAMQP.consume(myMessageHandler);
      });
    });

    it('if json unparsable, calls nack() with requeue of false.',
    function(done) {
      var nack = function(message, upTo, requeue) {
        expect(requeue).to.equal(false);
        done();
      };

      var amqpLibMock = require('./amqplibmock')({
        messageToDeliver: 'nonvalidjson',
        overrides: {nack: nack}
      });

      var mockedAMQP = SandboxedModule.require('../../lib/amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config);

      function myMessageHandler(parsedMsg, cb) {
        cb();
      }

      mockedAMQP.connect(function(err) {
        if (err) {
          return done(err);
        }
        mockedAMQP.consume(myMessageHandler);
      });
    });
    it('if json callback called with err, calls nack() with requeue as given.',
    function(done) {
      var nack = function(message, upTo, requeue) {
        expect(requeue).to.equal('requeue');
        done();
      };

      var amqpLibMock = require('./amqplibmock')({overrides: {nack: nack}});

      var mockedAMQP = SandboxedModule.require('../../lib/amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config);

      function myMessageHandler(parsedMsg, cb) {
        cb(new Error('got it bad'), 'requeue');
      }

      mockedAMQP.connect(function(err) {
        if (err) {
          return done(err);
        }
        mockedAMQP.consume(myMessageHandler);
      });
    });
  });
});
