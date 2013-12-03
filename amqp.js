var amqp_uri = process.env.AMQP_URL,
    amqp_exchange = process.env.AMQP_EXCHANGE,
    amqp_queue = process.env.AMQP_QUEUE,
    amqp_routing_key = process.env.AMQP_ROUTING_KEY;

var amqp = require('amqplib'),
    Q = require('q');

// When we connect, we will remember the channel here:
var channel;

var AMQP = module.exports = {};

/**
 * Passes the AMQP channel created to the callback.
 */
AMQP.connect = function(cb) {
  // amqp.connect throws on some error conditions, rather than resolving the
  // promise.  Hence the need for the try/catch.
  try {
    Q(amqp.connect(amqp_uri))
    .then(function(conn) {
      return conn.createConfirmChannel();
    })
    .then(function(ch) {
      channel = ch;
      return ch.assertQueue(amqp_queue)
      .then(function() {
        return ch.assertExchange(amqp_exchange, 'topic');
      })
      .then(function() {
        return ch.bindQueue(amqp_queue, amqp_exchange, amqp_routing_key);
      });
    }).nodeify(cb);
  }
  catch (e) {
    console.log('Exception thrown in AMQP connection and setup.');
    cb(e);
  }
};

/**
 * Passes the AMQP channel created to the callback.
 */
AMQP.connect_for_consuming = function(cb) {
  // amqp.connect throws on some error conditions, rather than resolving the
  // promise.  Hence the need for the try/catch.
  try {
    Q(amqp.connect(amqp_uri))
    .then(function(conn) {
      return conn.createChannel();
    })
    .then(function(ch) {
      channel = ch;
      return ch.assertQueue(amqp_queue);
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
AMQP.publish = function(message, cb) {
  console.log('AMQP.publish()');
  console.log('message');
  console.log(message);
  channel.publish(amqp_exchange, amqp_routing_key, new Buffer(message), {}, cb);
};

AMQP.consume = function(handleMessage) {
  channel.consume(amqp_queue, handleMessage, {noAck: false});
};

AMQP.ack_consumed_message = function(message) {
      channel.ack(message);
};

AMQP.ack_consumed_message = function(message) {
      channel.ack(message);
};

AMQP.nack_consumed_message = function(message) {
      channel.nack(message);
};

// vim: set et sw=2 ts=2 colorcolumn=80:
