var amqp = require('amqplib'),
    Q = require('q'),
    _ = require('lodash'),
    queueSetup = require('./queue-setup');

module.exports = function(config) {
  if (!config || !config.url || !config.exchange) {
    throw new Error('amqp-wrapper: Invalid config');
  }

  var channel;

  config.prefetch = config.prefetch || 10;

  var ret = {
    /**
     * Passes the AMQP channel created to the callback.
     */
    connect: function(cb) {
      // amqp.connect throws on some error conditions, rather than resolving the
      // promise.  Hence the need for the try/catch.
      try {
        Q(amqp.connect(config.url))
        .then(function(conn) {
          return conn.createConfirmChannel();
        })
        .then(function(ch) {
          channel = ch;

          var promise = ch.assertExchange(config.exchange, 'topic');
          if (config.queues.publish && config.queues.publish instanceof Array) {
            promise = promise.then(queueSetup.setupForPublish(ch, config));
          }
          if (config.queues.consume && config.queues.consume.name) {
            promise = promise.then(queueSetup.setupForConsume(ch, config));
          }
          return promise;
        }).nodeify(cb);
      }
      catch (e) {
        console.log('Exception thrown in AMQP connection and setup.');
        cb(e);
      }
    },

    /**
     * Publish a message to one of the AMQP queues specified on connect.
     * @param {string} name The name of the queue to use.
     * @param {string} The message to publish.
     * @param {Function(err)} The callback to call when done.
     */
    publishToQueue: function(name, message, callback) {
      if (typeof message === 'object') message = JSON.stringify(message);
      var publishQueue = _.find(config.queues.publish, {'name': name});
      channel.publish(config.exchange, publishQueue.routingKey, new Buffer(message),
          {}, callback);
    },

    /**
     * Publish a message using the specified routing key.
     * @param {string} name The name of the queue to use.
     * @param {string} The message to publish.
     * @param {Object} options Any options to pass through to the underlying
     *                         publish.
     * @param {Function(err)} The callback to call when done.
     */
    publish: function(routingKey, message, options, callback) {
      if (typeof message === 'object') message = JSON.stringify(message);
      channel.publish(config.exchange, routingKey, new Buffer(message), options, callback);
    },

    /**
     * handleMessage() is expected to be of the form:
     * handleMessage(parsedMessage, callback).
     * If callback is called with a non-null error, then the message will be
     * nacked. You can call it like:
     * callback(err, requeue) in order
     * to instruct rabbit whether to requeue the message (or discard/dead letter).
     *
     * If not given, requeue is assumed to be false.
     *
     * cf http://squaremo.github.io/amqp.node/doc/channel_api.html#toc_34
     */
    consume: function(handleMessage) {
      function callback(message) {
        function done(err, requeue) {
          if (requeue === undefined) requeue = false;
          if (err) return channel.nack(message, false, requeue);
          channel.ack(message);
        }

        try {
          var messagePayload = message.content.toString();
          var parsedPayload = JSON.parse(messagePayload);
          handleMessage(parsedPayload, done);
        }
        catch (error) {
          console.log(error);
          // Do not requeue on exception - it means something unexpected (and prob.
          // non-transitory) happened.
          done(error, false);
        }
      }

      channel.consume(config.queues.consume.name, callback, {noAck: false});
    }
  };

  return ret;
};

// vim: set et sw=2 ts=2 colorcolumn=80:
