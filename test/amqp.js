var SandboxedModule = require('sandboxed-module'),
    expect = require('expect.js'),
    Sinon = require('sinon'),
    AMQP = require('../amqp');

describe('AMQP', function() {
  var config = {
    url: 'amqp://guest:guest@localhost',
    exchange: 'mytestexchange',
    queues: {
      consume: {
        name: 'myconsumequeue'
      },
      publish: [
        {
          name: 'mypublishqueue',
          routingKey: 'mypublishqueuerk',
          options: {deadLetterExchange: 'dlexch'}
        }
      ]
    }
  };
  describe('#connect', function() {
    it('should call the callback successfully', function(done) {
      var amqp = AMQP(config);
      amqp.connect(done);
    });
    it('should setup for publishing and consuming', function(done) {
      var amqpLibMock = require('./amqplibmock')();
      var mockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config);

      mockedAMQP.connect(function(err) {
        if(err) return done(err);

        // two queues, one of which is dead lettered
        expect(amqpLibMock.assertQueueSpy.callCount).to.be(3);
        // Bind the publishing queue, and its dead letter queue.
        expect(amqpLibMock.bindQueueSpy.callCount).to.be(2);
        done();
      });
    });
  });
  describe('#publishToQueue', function() {
    it('should call the callback successfully', function(done) {
      var amqp = AMQP(config);
      amqp.connect(function(err) {
        if (err) return done(err);
        amqp.publishToQueue('mypublishqueue', 'test', done);
      });
    });
  });
  describe('#publish', function() {
    it('should call the callback successfully', function(done) {
      var amqp = AMQP(config);
      amqp.connect(function(err) {
        if (err) return done(err);
        amqp.publish('myqueue', 'test', {}, done);
      });
    });
    it('should accept objects', function(done) {
      var amqp = AMQP(config);
      amqp.connect(function(err) {
        if (err) return done(err);
        amqp.publish('myqueue', {woo: 'test'}, {}, done);
      });
    });
  });
  describe('#consume', function() {
    it('if done(err) is called with err === null, calls ack().', function(done) {
      var ack = function() {
        done();
      };

      var amqpLibMock = require('./amqplibmock')({overrides: {ack: ack}});

      var mockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config);

      function myMessageHandler(parsedMsg, cb) {
        cb();
      }

      mockedAMQP.connect(function(err) {
        if(err) return done(err);
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

      var mockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config);

      function myMessageHandler(parsedMsg, cb) {
        cb();
      }

      mockedAMQP.connect(function(err) {
        if(err) return done(err);
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

      var mockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          'amqplib/callback_api': amqpLibMock.mock
        }
      })(config);

      function myMessageHandler(parsedMsg, cb) {
        cb(new Error('got it bad'), 'requeue');
      }

      mockedAMQP.connect(function(err) {
        if(err) return done(err);
        mockedAMQP.consume(myMessageHandler);
      });
    });
  });
});

// vim: set et sw=2 ts=2 colorcolumn=80:
