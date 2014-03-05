var amqp = require('amqplib'),
    Q = require('q');
var exchange,
    queueParams = {};
var PREFETCH = 10;

// When we connect, we will remember the channel here:
var channel;

/**
 * Passes the AMQP channel created to the callback.
 */
exports.connect = function(uri, exch, _queueParams, cb) {
  queueParams = _queueParams;
  exchange = exch;
  // amqp.connect throws on some error conditions, rather than resolving the
  // promise.  Hence the need for the try/catch.
  try {
    Q(amqp.connect(uri))
    .then(function(conn) {
      return conn.createConfirmChannel();
    })
    .then(function(ch) {
      channel = ch;

      var assert_exchange = ch.assertExchange(exchange, 'topic');
      // For publishing, we assert the queue is there and bind it to the routing
      // key we are going to use.
      function setupForPublish() {
        return ch.assertQueue(queueParams.publishQueue, queueParams.queueOptions)
        .then(function() {
          return ch.bindQueue(queueParams.publishQueue, exchange,
              queueParams.publishQueueRoutingKey);
        });
      }
      // For consuming, we only assert the queue is there.
      function setupForConsume() {
        ch.prefetch(PREFETCH);
        return ch.assertQueue(queueParams.consumeQueue, queueParams.queueOptions);
      }

      var todo = assert_exchange;
      if (queueParams.publishQueue && queueParams.publishQueueRoutingKey) {
        todo = todo.then(setupForPublish);
      }
      if (queueParams.consumeQueue) {
        todo = todo.then(setupForConsume);
      }
      return todo;
    }).nodeify(cb);
  }
  catch (e) {
    console.log('Exception thrown in AMQP connection and setup.');
    cb(e);
  }
};

/**
 * Submit a message on cached AMQP channel.
 * @param {Object} ch The channel passed to the callback in AMQP.connect.
 * @param {string} The message to publish.
 * @param {Function(err)} The callback to call when done.
 */
exports.publish = function(message, callback) {
  channel.publish(exchange, queueParams.publishQueueRoutingKey, new Buffer(message),
      {}, callback);
};

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
exports.consume = function(handleMessage) {
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

  channel.consume(queueParams.consumeQueue, callback, {noAck: false});
};

exports.prefetch = function(value) {
  channel.prefetch(value);
}

// vim: set et sw=2 ts=2 colorcolumn=80:
