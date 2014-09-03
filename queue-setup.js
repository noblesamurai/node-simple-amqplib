var async = require('async'),
    debug = require('debug')('amqp-wrapper');

function maybeDeclareDeadLetters(channel, queue, callback) {
  if (!queue.options || !queue.options.deadLetterExchange) {
    return callback();
  }

  var qName = queue.name + (queue.options.deadLetterQueueSuffix || '-dead-letter');
  async.series([
    channel.assertExchange.bind(channel, queue.options.deadLetterExchange, 'topic', {}),
    channel.assertQueue.bind(channel, qName, {}),
    channel.bindQueue.bind(channel, qName,
      queue.options.deadLetterExchange,
      queue.options.deadLetterExchangeRoutingKey || queue.options.routingKey,
      {}),
  ],  callback);
}

/**
 * For publishing, we assert the queue is there and bind it to the routing
 * key we are going to use.
 */
exports.setupForPublish = function(channel, params, callback) {
  async.each(
    params.queues.publish,
    function(queue, cb) {
      debug('setupForPublish()', queue);
      async.series([
        async.apply(maybeDeclareDeadLetters, channel, queue),
        channel.assertQueue.bind(channel, queue.name, queue.options),
        channel.bindQueue.bind(channel, queue.name, params.exchange, queue.routingKey, {})
      ], cb);
    }, callback);
};

// For consuming, we only assert the queue is there.
exports.setupForConsume = function(channel, params, callback) {
    debug('setupForConsume()');
  channel.prefetch(params.prefetch);
  channel.assertQueue(params.queues.consume.name,
      params.queues.consume.options, callback);
};

// vim: set et sw=2 ts=2 colorcolumn=80:
