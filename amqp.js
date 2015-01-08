'use strict';

var amqp = require('amqplib/callback_api');
var stringifysafe = require('json-stringify-safe');
var queueSetup = require('./lib/queue-setup');
var debug = require('debug')('amqp-wrapper');

module.exports = function(config) {
  if (!config || !config.url || !config.exchange) {
    throw new Error('amqp-wrapper: Invalid config');
  }

  var channel;

  var prefetch = config.prefetch || 10;

  var ret = {
    /**
     * Connects and remembers the channel.
     */
    connect: function(cb) {
      amqp.connect(config.url, createChannel);

      function createChannel(err, conn) {
        debug('createChannel()');
        if (err) {
          return cb(err);
        }

        conn.createConfirmChannel(assertExchange);
      }

      function assertExchange(err, ch) {
        debug('assertExchange()', ch);
        if (err) {
          return cb(err);
        }
        channel = ch;

        channel.prefetch(prefetch);
        channel.assertExchange(config.exchange, 'topic', {}, assertQueues);
      }

      function assertQueues(err) {
        debug('assertQueues()');
        if (err) {
          return cb(err);
        }
        if (config.queue && config.queue.name) {
          queueSetup.setupForConsume(channel, config, cb);
        } else {
          cb();
        }
      }
    },

    /**
     * Publish a message using the specified routing key.
     * @param {string} routingKey The name of the queue to use.
     * @param {string} message The message to publish.
     * @param {Object} options Any options to pass through to the underlying
     *                         publish.
     * @param {Function(err)} callback The callback to call when done.
     */
    publish: function(routingKey, message, options, callback) {
      debug('publish()');
      if (typeof message === 'object') {
        message = stringifysafe(message);
      }
      channel.publish(config.exchange, routingKey, new Buffer(message),
        options, callback);
    },

    /**
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
    consume: function(handleMessage) {
      debug('consume()');
      function callback(message) {
        function done(err, requeue) {
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
        }
        catch (error) {
          console.log(error);
          // Do not requeue on exception - it means something unexpected
          // (and prob. non-transitory) happened.
          done(error, false);
        }
      }

      channel.consume(config.queue.name, callback, {noAck: false});
    }
  };

  return ret;
};

// vim: set et sw=2:
