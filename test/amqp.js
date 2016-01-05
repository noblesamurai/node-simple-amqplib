'use strict';

var SandboxedModule = require('sandboxed-module'),
    expect = require('expect.js'),
    AMQP = require('../amqp'),
    config = require('./config');

describe('AMQP', function() {
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
      var amqp = AMQP(config.good);
      amqp.connect(done);
    });
    it('should declare your queue, and bind it', function(done) {
      var amqpLibMock = require('./lib/amqplibmock')();
      var mockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config.good);

      mockedAMQP.connect(function(err) {
        if (err) {
          return done(err);
        }

        // one queue, dead lettered
        expect(amqpLibMock.assertQueueSpy.callCount).to.equal(2);
        // Bind the consume queue, and its dead letter queue.
        expect(amqpLibMock.bindQueueSpy.callCount).to.equal(2);
        done();
      });
    });
    it('allows you to specify an array for routingKey and binds each given',
        function(done) {
      var amqpLibMock = require('./lib/amqplibmock')();
      var mockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config.routingKeyArray);

      mockedAMQP.connect(function(err) {
        if (err) {
          return done(err);
        }

        // one queue, dead lettered
        expect(amqpLibMock.assertQueueSpy.callCount).to.equal(2);
        // Bind the consume queue with its two routing keys, and its dead
        // letter queue.
        expect(amqpLibMock.bindQueueSpy.callCount).to.equal(4);
        done();
      });

    });
    it('should just declare if you don\'t specify routing key', function(done) {
      var amqpLibMock = require('./lib/amqplibmock')();
      var mockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config.noRoutingKey);

      mockedAMQP.connect(function(err) {
        if (err) {
          return done(err);
        }

        // one queue, not dead lettered
        expect(amqpLibMock.assertQueueSpy.callCount).to.equal(1);
        // No binding.
        expect(amqpLibMock.bindQueueSpy.callCount).to.equal(0);
        done();
      });
    });
  });
  describe('#publish', function() {
    it('should call the callback successfully', function(done) {
      var amqp = AMQP(config.good);
      amqp.connect(function(err) {
        if (err) {
          return done(err);
        }
        amqp.publish('myqueue', 'test', {}, done);
      });
    });
    it('should accept objects', function(done) {
      var amqp = AMQP(config.good);
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

      var amqpLibMock = require('./lib/amqplibmock')({overrides: {ack: ack}});

      var mockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config.good);

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

      var amqpLibMock = require('./lib/amqplibmock')({
        messageToDeliver: 'nonvalidjson',
        overrides: {nack: nack}
      });

      var mockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config.good);

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

      var amqpLibMock = require('./lib/amqplibmock')({overrides: {nack: nack}});

      var mockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config.good);

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

// vim: set et sw=2 colorcolumn=80:
