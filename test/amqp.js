const SandboxedModule = require('sandboxed-module');
const expect = require('chai').expect;
require('chai').use(require('chai-as-promised'));
require('chai').use(require('dirty-chai'));
const AMQP = require('../amqp');
const config = require('./config');

describe('AMQP', function () {
  describe('#constructor', function () {
    it('should throw with empty constructor', function () {
      expect(() => new AMQP()).to.throw('simple-amqplib: Invalid config');
    });
    it('should throw with no url or exchange', function () {
      expect(() => new AMQP({})).to.throw('simple-amqplib: Invalid config');
    });
    it('should throw with no url', function () {
      expect(() => new AMQP({ exchange: '' })).to.throw('simple-amqplib: Invalid config');
    });
    it('should throw with no exchange', function () {
      expect(() => new AMQP({ url: '' })).to.throw('simple-amqplib: Invalid config');
    });
  });
  describe('#connect', function () {
    it('should should fail to connect to bad endpoint', function (done) {
      const amqp = new AMQP({
        url: 'amqp://guest:guest@localhost:6767',
        exchange: 'FOO'
      });
      amqp.connect().catch(function (err) {
        expect(err.code).to.equal('ECONNREFUSED');
        done();
      });
    });
    it('should return a promise', async function () {
      const amqp = new AMQP(config.good);
      expect(amqp.connect()).to.be.fulfilled();
    });
    it('should declare your queue, and bind it', async function () {
      const amqpLibMock = require('./amqplibmock')();
      const MockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          amqplib: amqpLibMock.mock
        }
      });
      const mockedAMQP = new MockedAMQP(config.good);

      await mockedAMQP.connect();
      // one queue, dead lettered
      expect(amqpLibMock.assertQueueSpy.callCount).to.equal(2);
      // Bind the consume queue, and its dead letter queue.
      expect(amqpLibMock.bindQueueSpy).to.have.been.calledWith(config.good.queue.name, config.good.exchange, config.good.queue.routingKey);
      expect(amqpLibMock.bindQueueSpy.callCount).to.equal(2);
    });
    it('allows you to specify an array for routingKey and binds each given', function (done) {
      const amqpLibMock = require('./amqplibmock')();
      const MockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          amqplib: amqpLibMock.mock
        }
      });
      const mockedAMQP = new MockedAMQP(config.routingKeyArray);

      mockedAMQP.connect().then(function () {
        // one queue, dead lettered
        expect(amqpLibMock.assertQueueSpy.callCount).to.equal(2);
        // Bind the consume queue with its two routing keys, and its dead
        // letter queue.
        expect(amqpLibMock.bindQueueSpy.callCount).to.equal(4);
        done();
      }).catch(done);
    });
    it('should just declare if you don\'t specify routing key', function (done) {
      const amqpLibMock = require('./amqplibmock')();
      const MockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          amqplib: amqpLibMock.mock
        }
      });
      const mockedAMQP = new MockedAMQP(config.noRoutingKey);

      mockedAMQP.connect().then(function () {
        // one queue, not dead lettered
        expect(amqpLibMock.assertQueueSpy.callCount).to.equal(1);
        // No binding.
        expect(amqpLibMock.bindQueueSpy.callCount).to.equal(0);
        done();
      }).catch(done);
    });
  });
  describe('#publish', function () {
    it('should resolve successfully', async function () {
      const amqp = new AMQP(config.good);
      await amqp.connect();
      await expect(amqp.publish('myqueue', 'test', {})).to.eventually.be.fulfilled();
    });
    it('should accept objects', async function () {
      const amqp = new AMQP(config.good);
      await amqp.connect();
      await expect(amqp.publish('myqueue', { woo: 'test' }, {})).to.eventually.be.fulfilled();
    });
  });
  describe('#consume', async function () {
    it('if done(err) is called with err === null, calls ack().', function (done) {
      const ack = function () {
        done();
      };

      const amqpLibMock = require('./amqplibmock')({ overrides: { ack: ack } });
      const MockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          amqplib: amqpLibMock.mock
        }
      });
      const mockedAMQP = new MockedAMQP(config.good);

      function myMessageHandler (parsedMsg, cb) {
        cb();
      }

      mockedAMQP.connect().then(function () {
        mockedAMQP.consume(myMessageHandler);
      }).catch((done));
    });

    it('if json unparsable, calls nack() with requeue of false.', function (done) {
      const nack = function (message, upTo, requeue) {
        expect(requeue).to.equal(false);
        done();
      };

      const amqpLibMock = require('./amqplibmock')({
        messageToDeliver: 'nonvalidjson',
        overrides: { nack: nack }
      });

      const MockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          amqplib: amqpLibMock.mock
        }
      });
      const mockedAMQP = new MockedAMQP(config.good);

      function myMessageHandler (parsedMsg, cb) {
        cb();
      }

      mockedAMQP.connect().then(function () {
        mockedAMQP.consume(myMessageHandler);
      }).catch(done);
    });
    it('if json callback called with err, calls nack() with requeue as given.',
      function (done) {
        const nack = function (message, upTo, requeue) {
          expect(requeue).to.equal('requeue');
          done();
        };

        const amqpLibMock = require('./amqplibmock')({ overrides: { nack: nack } });

        const MockedAMQP = SandboxedModule.require('../amqp', {
          requires: {
            amqplib: amqpLibMock.mock
          }
        });
        const mockedAMQP = new MockedAMQP(config.good);

        function myMessageHandler (parsedMsg, cb) {
          cb(new Error('got it bad'), 'requeue');
        }

        mockedAMQP.connect().then(function () {
          mockedAMQP.consume(myMessageHandler);
        }).catch(done);
      });
  });
  describe('#close', function () {
    it('should close the connection', async function () {
      const amqpLibMock = require('./amqplibmock')();
      const MockedAMQP = SandboxedModule.require('../amqp', {
        requires: {
          amqplib: amqpLibMock.mock
        }
      });
      const amqp = new MockedAMQP(config.good);
      await amqp.connect();
      await amqp.close();
      expect(amqpLibMock.closeConnectionSpy).to.have.been.called();
    });
  });
});

// vim: set et sw=2 colorcolumn=80:
