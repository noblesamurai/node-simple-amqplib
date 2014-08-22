var amqp = require('amqplib'),
    Q = require('q'),
    _ = require('lodash'),
    queueSetup = require('./queue-setup');

module.exports = function(params) {
  var channel;

  params.prefetch = params.prefetch || 10;

  var ret = {
    /**
     * Passes the AMQP channel created to the callback.
     */
    connect: function(cb) {
      // amqp.connect throws on some error conditions, rather than resolving the
      // promise.  Hence the need for the try/catch.
      try {
        Q(amqp.connect(params.url))
        .then(function(conn) {
          return conn.createConfirmChannel();
        })
        .then(function(ch) {
          channel = ch;

          var assert_exchange = ch.assertExchange(params.exchange, 'topic');
          var todo = assert_exchange;
          if (params.queues.publish && params.queues.publish instanceof Array) {
            todo = todo.then(queueSetup.setupForPublish(ch, params));
          }
          if (params.queues.consume && params.queues.consume.name) {
            todo = todo.then(queueSetup.setupForConsume(ch, params));
          }
          return todo;
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
      var publishQueue = _.find(params.queues.publish, {'name': name});
      channel.publish(params.exchange, publishQueue.routingKey, new Buffer(message),
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
      channel.publish(params.exchange, routingKey, new Buffer(message), options, callback);
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

      channel.consume(params.queues.consume.name, callback, {noAck: false});
    }
  };

  return ret;
};

// vim: set et sw=2 ts=2 colorcolumn=80:
