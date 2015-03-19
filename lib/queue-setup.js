'use strict';

var async = require('async');
var debug = require('debug')('amqp-wrapper');

function bindRoutingKeys(channel, exchange, queueName, keys, done) {
  var routingKeys;
  if (typeof keys === 'string') {
    routingKeys = [keys];
  } else {
    routingKeys = keys;
  }
  if (routingKeys) {
    console.log('routingKeys');
    console.log(routingKeys);
    async.map(routingKeys,
    function(key, callback) {
      channel.bindQueue(queueName, exchange, key, {}, callback);
    },
    done);
  } else {
    done();
  }
}

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
    bindRoutingKeys.bind(undefined, channel, queue.options.deadLetterExchange, qName,
      queue.options.deadLetterExchangeRoutingKey || queue.routingKey)
  ],  callback);
}

/**
 * For publishing, we assert the queue is there and bind it to the routing
 * key we are going to use.
 */
exports.setupForConsume = function(channel, params, callback) {
  var queue = params.queue;
  debug('setupForConsume()', queue);
    console.log('queue');
    console.log(queue);
  async.series([
    maybeDeclareDeadLetters.bind(undefined, channel, queue),
    channel.assertQueue.bind(channel, queue.name, queue.options),
    bindRoutingKeys.bind(undefined, channel, params.exchange, queue.name,
      queue.routingKey)
  ], callback);
};

// vim: set sw=2 et:
