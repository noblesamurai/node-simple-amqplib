'use strict';

var async = require('async');
var debug = require('debug')('amqp-wrapper');

function maybeDeclareDeadLetters(channel, queue, callback) {
  if (!queue.options || !queue.options.deadLetterExchange) {
    return callback();
  }

  var qName = queue.name +
    (queue.options.deadLetterQueueSuffix || '-dead-letter');
  async.series([
    channel.assertExchange.bind(channel,
      queue.options.deadLetterExchange, 'topic', {}),
    channel.assertQueue.bind(channel, qName, {}),
    channel.bindQueue.bind(channel, qName,
      queue.options.deadLetterExchange,
      queue.options.deadLetterExchangeRoutingKey || queue.routingKey,
      {}),
  ],  callback);
}

/**
 * For publishing, we assert the queue is there and bind it to the routing
 * key we are going to use.
 */
exports.setupForConsume = function(channel, params, callback) {
  var queue = params.queue;
  debug('setupForConsume()', queue);
  async.series([
    maybeDeclareDeadLetters.bind(undefined, channel, queue),
    channel.assertQueue.bind(channel, queue.name, queue.options),
    function(callback) {
      if (queue.routingKey) {
        channel.bindQueue(queue.name, params.exchange, queue.routingKey, {},
          callback);
      } else {
        callback();
      }
    }
  ], callback);
};

// vim: set sw=2 et:
