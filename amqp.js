var amqp_uri, amqp_exchange;
var amqp_publish_queue, amqp_publish_queue_routing_key;
var amqp_consume_queue;

var amqp = require('amqplib'),
    Q = require('q');

// When we connect, we will remember the channel here:
var channel;

var AMQP = module.exports = {};

if(!(amqp_uri = process.env.AMQP_URL)) missing_env_var('AMQP_URL');
if(!(amqp_exchange = process.env.AMQP_EXCHANGE)) {
  missing_env_var('AMQP_EXCHANGE');
}

function missing_env_var(name) {
  throw new Error('node-amqp-wrapper: Env var  ' + name + ' not defined.');
}

/**
 * Passes the AMQP channel created to the callback.
 */
AMQP.connect = function(modes, cb) {
  if (modes.consume) {
    if(!(amqp_consume_queue = process.env.AMQP_CONSUME_QUEUE)) {
      missing_env_var('AMQP_CONSUME_QUEUE');
    }
  }

  if (modes.publish) {
    if(!(amqp_publish_queue = process.env.AMQP_PUBLISH_QUEUE)) {
      missing_env_var('AMQP_PUBLISH_QUEUE');
    }
    if(!(amqp_publish_queue_routing_key =
        process.env.AMQP_PUBLISH_QUEUE_ROUTING_KEY)) {
      missing_env_var('AMQP_PUBLISH_QUEUE_ROUTING_KEY');
    }
  }

  // amqp.connect throws on some error conditions, rather than resolving the
  // promise.  Hence the need for the try/catch.
  try {
    Q(amqp.connect(amqp_uri))
    .then(function(conn) {
      return conn.createConfirmChannel();
    })
    .then(function(ch) {
      channel = ch;

      var assert_exchange = ch.assertExchange(amqp_exchange, 'topic');
      // For publishing, we assert the queue is there and bind it to the routing
      // key we are going to use.
      function setup_for_publish() {
        return ch.assertQueue(amqp_publish_queue)
        .then(function() {
          return ch.bindQueue(amqp_publish_queue, amqp_exchange, amqp_publish_queue_routing_key);
        });
      }
      // For consuming, we only assert the queue is there.
      function setup_for_consume() {
        return ch.assertQueue(amqp_consume_queue);
      }

      var todo = assert_exchange;
      if (modes.publish) {
        todo = todo.then(setup_for_publish);
      }
      if (modes.consume) todo = todo.then(setup_for_consume);
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
AMQP.publish = function(message, cb) {
  channel.publish(amqp_exchange, amqp_publish_queue_routing_key, new Buffer(message),
      {}, cb);
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
AMQP.consume = function(handleMessage) {
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
    catch (e) {
      console.log(e);
      // Do not requeue on exception - it means something unexpected (and prob.
      // non-transitory) happened.
      done(e, false);
    }
  }

  channel.consume(amqp_consume_queue, callback, {noAck: false});
};

// vim: set et sw=2 ts=2 colorcolumn=80:
