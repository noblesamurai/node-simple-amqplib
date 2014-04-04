var amqp = require('amqplib'),
    Q = require('q'),
    _ = require('lodash');
var exchange,
    queueParams = {};
var PREFETCH = 10;

// When we connect, we will remember the channel here:
var channel;

/**
 * For publishing, we assert the queue is there and bind it to the routing
 * key we are going to use.
 */
var setupForPublish = function(channel, queueParams) {
  var setupPublishes = queueParams.publish.map(function(queue) {
    return channel.assertQueue(queue.name, queue.options)
    .then(function() {
      return channel.bindQueue(queue.name, exchange, queue.routingKey);
    });
  });
  return Q.all(setupPublishes);
};

// For consuming, we only assert the queue is there.
var setupForConsume = function(channel, queueParams) {
  channel.prefetch(PREFETCH);
  return channel.assertQueue(queueParams.consume.name,
      queueParams.consume.options);
};

if (process.env.NODE_ENV === 'test') {
  exports.replaceSetupFuncs = function(consume, publish) {
    setupForPublish = publish;
    setupForConsume = consume;
  };
  exports.getSetupFuncs = function() {
    return {publish: setupForPublish, consume: setupForConsume};
  };
}

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
      var todo = assert_exchange;
      if (queueParams.publish && queueParams.publish instanceof Array) {
        todo = todo.then(setupForPublish(ch, queueParams));
      }
      if (queueParams.consume && queueParams.consume.name) {
        todo = todo.then(setupForConsume(ch, queueParams));
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
 * Publish a message to one of the AMQP queues specified on connect.
 * @param {string} name The name of the queue to use.
 * @param {string} The message to publish.
 * @param {Function(err)} The callback to call when done.
 */
exports.publishToQueue = function(name, message, callback) {
  var publishQueue = _.find(queueParams.publish, {'name': name});
  channel.publish(exchange, publishQueue.routingKey, new Buffer(message),
      {}, callback);
};

/**
 * Publish a message using the specified routing key.
 * @param {string} name The name of the queue to use.
 * @param {string} The message to publish.
 * @param {Function(err)} The callback to call when done.
 */
exports.publish = function(routingKey, message, callback) {
  channel.publish(exchange, routingKey, new Buffer(message), {}, callback);
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

  channel.consume(queueParams.consume.name, callback, {noAck: false});
};

exports.prefetch = function(value) {
  channel.prefetch(value);
};

if (process.env.NODE_ENV == 'test') {
  exports.queueParams = function(_queueParams) {
    queueParams = _queueParams;
  };
}

// vim: set et sw=2 ts=2 colorcolumn=80:
