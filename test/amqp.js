var AMQP = require('../amqp'),
    SandboxedModule = require('sandboxed-module'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    $ = require('lodash');

describe('AMQP', function() {
  describe('#connect', function() {
    it('should call the callback successfully', function(done) {
      AMQP.connect(' 'mytestexchange', {
        consume: {
          name: 'myconsumequeue'
        },
        publish: [
          {
            name: 'mypublishqueue',
            routingKey: 'mypublishqueuerk'
          }
        ]
      }, function(err, res) {
        if (err) return done(err);
        done();
      });
    });
  });
  describe('#publishToQueue', function() {
    it('should call the callback successfully', function(done) {
      AMQP.connect(' 'mytestexchange', {
        publish: [
          {
            name: 'myqueue',
            routingKey: 'myqueuekey'
          }
        ]
      }, function(err, res) {
        if (err) return done(err);
        AMQP.publishToQueue('myqueue', new Buffer('test'), function(err) {
          if (err) return done(err);
          done();
        });
      });
    });
  });
  describe('#publish', function() {
    it('should call the callback successfully', function(done) {
      AMQP.connect(' 'mytestexchange',{},
          function(err, res) {
        if (err) return done(err);
        AMQP.publish('myqueue', new Buffer('test'), function(err) {
          if (err) return done(err);
          done();
        });
      });
    });
  });
  describe('#consume', function() {
    function createMockedModuleObject(messageToDeliver, additionals) {
      var channelMock = {
        consume: function (a, handleMessage, b) {
          handleMessage({
            content: {
              toString: function() {return messageToDeliver;}
            }
          });
        }
      };

      return {
        locals: {
          channel: $.extend(channelMock, additionals)
        }
      };
    }

    it('if done(err) is called with err === null, calls ack().',
        function(done) {
      var ackSpy = sinon.spy(function(message) {
        done();
      });
      var mockedAMQP = SandboxedModule.require('../amqp',
        // message will be {}. Mock out 'ack' method.
        createMockedModuleObject('{}', {ack: ackSpy}));
      mockedAMQP.queueParams({consume: {}});

      function myMessageHandler(parsedMsg, cb) {
        cb();
      }

      mockedAMQP.consume(myMessageHandler);
    });

    it('if json unparsable, calls nack() with requeue of false.',
        function(done) {
      var nackSpy = sinon.spy(function(message, upTo, requeue) {
        expect(requeue).to.equal(false);
        done();
      });

      var mockedAMQP = SandboxedModule.require('../amqp',
        // message will be invalid json. Mock out 'nack' method.
        createMockedModuleObject('nonvalidjson', {nack: nackSpy}));
      mockedAMQP.queueParams({consume: {}});

      function myMessageHandler(parsedMsg, cb) {
        cb();
      }

      mockedAMQP.consume(myMessageHandler);
    });
    it('if json callback called with err, calls nack() with requeue as given.',
        function(done) {
      var nackSpy = sinon.spy(function(message, upTo, requeue) {
        expect(requeue).to.equal('requeue');
        done();
      });
      var mockedAMQP = SandboxedModule.require('../amqp',
        // message will be {}. Mock out 'nack' method.
        createMockedModuleObject('{}', {nack: nackSpy}));
      mockedAMQP.queueParams({consume: {}});


      function myMessageHandler(parsedMsg, cb) {
        cb(new Error('got it bad'), 'requeue');
      }

      mockedAMQP.consume(myMessageHandler);
    });
  });
});

// vim: set et sw=2 ts=2 colorcolumn=80:
