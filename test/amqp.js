var SandboxedModule = require('sandboxed-module'),
    expect = require('expect.js'),
    Sinon = require('sinon'),
    AMQP = require('../amqp');

describe('AMQP', function() {
  var config = {
    url: '
    exchange: 'mytestexchange',
    queues: {
      consume: {
        name: 'myconsumequeue'
      },
      publish: [
        {
          name: 'mypublishqueue',
          routingKey: 'mypublishqueuerk'
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
      var queueSetup = require('../queue-setup');
      var amqp = AMQP(config);
      Sinon.stub(queueSetup, 'setupForConsume');
      Sinon.stub(queueSetup, 'setupForPublish');
      amqp.connect(function(err) {
        if (err) return done(err);
        expect(queueSetup.setupForConsume.calledOnce).to.be(true);
        expect(queueSetup.setupForPublish.calledOnce).to.be(true);
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
      var ackSpy = Sinon.spy(function(message) {
        done();
      });
      var mockedAMQP = SandboxedModule.require('../amqp',
        // message will be {}. Mock out 'ack' method.
        require('./amqplibmock')('{}', {ack: ackSpy})
      )(config);

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
      var nackSpy = Sinon.spy(function(message, upTo, requeue) {
        expect(requeue).to.equal(false);
        done();
      });

      var mockedAMQP = SandboxedModule.require('../amqp',
        // message will be invalid json. Mock out 'nack' method.
        require('./amqplibmock')('nonvalidjson', {nack: nackSpy})
      )(config);

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
      var nackSpy = Sinon.spy(function(message, upTo, requeue) {
        expect(requeue).to.equal('requeue');
        done();
      });

      var mockedAMQP = SandboxedModule.require('../amqp',
        require('./amqplibmock')('{}', {nack: nackSpy})
      )(config);

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
