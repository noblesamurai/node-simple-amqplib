'use strict';

const amqp = require('amqplib/callback_api');
const stringifysafe = require('json-stringify-safe');
const queueSetup = require('./lib/queue-setup');
const debug = require('debug')('amqp-wrapper');
const Deferred = require('deferential');

module.exports = function (config) {
  if (!config || !config.url || !config.exchange) {
    throw new Error('amqp-wrapper: Invalid config');
  }

  let connection;
  let channel;
  let consumerTag;

  var prefetch = config.prefetch || 10;

  /**
   * Connects and remembers the channel.
   */
  function connect (cb) {
    var d = Deferred();
    amqp.connect(config.url, createChannel);

    function createChannel (err, conn) {
      if (err) return d.reject(err);
      connection = conn;
      conn.createConfirmChannel(assertExchange);
    }

    function assertExchange (err, ch) {
      if (err) return d.reject(err);
      channel = ch;
      channel.prefetch(prefetch);
      channel.assertExchange(config.exchange, 'topic', {}, assertQueues);
    }

    function assertQueues (err) {
      if (err) return d.reject(err);
      if (!config.queue || !config.queue.name) return d.resolve();
      queueSetup.setupForConsume(channel, config, d.resolver(cb));
    }
    return d.nodeify(cb);
  }

  function requeueAll () {
    channel.cancel(consumerTag);
    channel.nackAll(true);
  }

  function close (cb) {
    if (!connection) return cb();
    return connection.close(cb);
  }

  /**
   * Publish a message using the specified routing key.
   * @param {string} routingKey The name of the queue to use.
   * @param {string} message The message to publish.
   * @param {Object} options Any options to pass through to the underlying
   *                         publish.
   * @param {Function(err)} callback The callback to call when done.
   */
  function publish (routingKey, message, options, cb) {
    debug('publish()');
    var d = Deferred();
    if (typeof message === 'object') {
      message = stringifysafe(message);
    }
    channel.publish(config.exchange, routingKey, Buffer.from(message),
      options, d.resolver(cb));

    return d.nodeify(cb);
  }

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
  function consume (handleMessage, options, cb) {
    const d = Deferred();
    debug('consume()');
    function onMessage (message) {
      function done (err, requeue) {
        if (err) return channel.nack(message, false, requeue || false);
        channel.ack(message);
      }

      try {
        var messagePayload = message.content.toString();
        var parsedPayload = JSON.parse(messagePayload);
        handleMessage(parsedPayload, done);
      } catch (error) {
        console.error(error);
        // Do not requeue on exception - it means something unexpected
        // (and prob. non-transitory) happened.
        done(error, false);
      }
    }

    channel.consume(config.queue.name, onMessage, options, consumeCb);

    function consumeCb (err, ok) {
      if (err) return d.reject(err);
      consumerTag = ok.consumerTag;
      return d.resolve();
    }
    return d.nodeify(cb);
  }

  return {
    connect,
    close,
    publish,
    consume,
    requeueAll
  };
};

// vim: set et sw=2:
