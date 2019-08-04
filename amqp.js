const amqp = require('amqplib');
const stringifysafe = require('json-stringify-safe');
const queueSetup = require('./lib/queue-setup');

module.exports = function (config) {
  if (!config || !config.url || !config.exchange) {
    throw new Error('amqp-wrapper: Invalid config');
  }

  var connection, channel;
  var prefetch = config.prefetch || 10;

  /**
   * @async
   * @module connect
   * Connects, establishes a channel, sets up exchange/queues/bindings/dead
   * lettering.
   */
  async function connect () {
    const conn = await amqp.connect(config.url);
    channel = await conn.createConfirmChannel();
    channel.prefetch(prefetch);
    await channel.assertExchange(config.exchange, 'topic', {});
    if (config.queue && config.queue.name) {
      return queueSetup.setupForConsume(channel, config);
    }
  }

  /**
   * @async
   * @module close
   * Closes connection.
   */
  async function close () {
    if (connection) {
      return connection.close();
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
    * @module publish
    * Publish a message to the given routing key, with given options.
    * @param {string} routingKey
    * @param {object|string} message
    * @param {object} options
    */
  async function publish (routingKey, message, options) {
    if (typeof message === 'object') {
      message = stringifysafe(message);
    }
    return channel.publish(config.exchange, routingKey, Buffer.from(message), options);
  }

  /**
   * @async
   * @module consume
   * Start consuming on the queue specified in the config you passed on
   * instantiation, using the given message handler callback.
   * @param {function} handleMessage
   * @param {object} options
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
   */
  async function consume (handleMessage, options) {
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
        var messagePayload = message.content.toString();
        var parsedPayload = JSON.parse(messagePayload);
        handleMessage(parsedPayload, done);
      } catch (error) {
        console.log(error);
        // Do not requeue on exception - it means something unexpected
        // (and prob. non-transitory) happened.
        done(error, false);
      }
    }

    return channel.consume(config.queue.name, callback, options);
  }

  return {
    connect,
    close,
    publish,
    consume
  };
};
