const amqp = require('amqplib');
const stringifysafe = require('json-stringify-safe');
const queueSetup = require('./lib/queue-setup');
const { promisify } = require('util');

/**
 * Class to contain an instantiated connection/channel to AMQP with a given
 * config.
 */
class AMQPWrapper {
  /**
   * Instantiate an AMQP wrapper with a given config.
   * @param {object} config
   * @param {string} config.url
   * @param {string} config.exchange
   * @param {object} config.queue
   * @param {string} config.queue.name
   * @param {Array<string>|string} config.queue.routingKey
   * @param {object} config.queue.options
   */
  constructor (config) {
    if (!config || !config.url || !config.exchange) {
      throw new Error('simple-amqplib: Invalid config');
    }
    this.config = config;
    this.connection = null;
    this.channel = null;
    this.prefetch = config.prefetch || 10;
  }

  /**
   * @async
   * @description Connects, establishes a channel, sets up exchange/queues/bindings/dead
   * lettering.
   * @returns {Promise}
   */
  async connect () {
    const { config } = this;
    this.connection = await amqp.connect(config.url);
    this.channel = await this.connection.createConfirmChannel();
    this.channel.prefetch(this.prefetch);
    await this.channel.assertExchange(config.exchange, 'topic', {});
    if (config.queue && config.queue.name) {
      return queueSetup.setupForConsume(this.channel, config);
    }
  }

  /**
   * @async
    * @description
   * Closes connection.
   * @returns {Promise}
   */
  async close () {
    if (this.connection) {
      return this.connection.close();
    }
  }

  /**
   * Publish a message using the specified routing key.
   * @param {string} routingKey The name of the queue to use.
   * @param {string} message The message to publish.
   * @param {Object} options Any options to pass through to the underlying
   *                         publish.
   * @param {Function(err)} callback The callback to call when done.
   */

  /**
    * @async
    * @description
    * Publish a message to the given routing key, with given options.
    * @param {string} routingKey
    * @param {object|string} message
    * @param {object} options
    * @returns {Promise}
    */
  async publish (routingKey, message, options = {}) {
    if (typeof message === 'object') {
      message = stringifysafe(message);
    }
    // NB: amqplib's ConfirmChannel.publish does not actually return a promise.
    // See https://www.squaremobius.net/amqp.node/channel_api.html#flowcontrol
    return promisify(this.channel.publish.bind(this.channel, this.config.exchange, routingKey, Buffer.from(message), options))();
  }

  /**
   * @async
   * Start consuming on the queue specified in the config you passed on
   * instantiation, using the given message handler callback.
   * @param {function} handleMessage
   * @param {object} options
   * @description
   * handleMessage() is expected to be of the form:
   * handleMessage(parsedMessage, callback).
   * If callback is called with a non-null error, then the message will be
   * nacked. You can call it like:
   * callback(err, requeue) in order
   * to instruct rabbit whether to requeue the message
   * (or discard/dead letter).
   *
   * If not given, requeue is assumed to be false.
   *
   * cf http://squaremo.github.io/amqp.node/doc/channel_api.html#toc_34
   * @returns {Promise}
   */
  async consume (handleMessage, _options = {}) {
    const { returnRawMessage = false, ...options } = _options;
    const { channel } = this;
    function callback (message) {
      function done (err, requeue) {
        if (requeue === undefined) {
          requeue = false;
        }
        if (err) {
          return channel.nack(message, false, requeue);
        }
        channel.ack(message);
      }

      try {
        const messagePayload = message.content.toString();
        const parsedPayload = JSON.parse(messagePayload);
        if (returnRawMessage) {
          handleMessage(parsedPayload, message, done);
        } else {
          handleMessage(parsedPayload, done);
        }
      } catch (error) {
        console.log(error);
        // Do not requeue on exception - it means something unexpected
        // (and prob. non-transitory) happened.
        done(error, false);
      }
    }

    return channel.consume(this.config.queue.name, callback, options);
  }
}

module.exports = AMQPWrapper;
