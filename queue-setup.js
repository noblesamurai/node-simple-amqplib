var Q = require('q'),
    async = require('async'),
    debug = require('debug')('amqp-wrapper');

function declareDeadLetters(channel, queue) {
  if (queue.options && queue.options.deadLetterExchange) {
    var dlName = queue.name + '-dead-letter';
    return Q(channel.assertQueue(dlName, {})).then(function() {
      return channel.bindQueue(dlName,
        queue.options.deadLetterExchange,
        queue.options.deadLetterExchangeRoutingKey || queue.options.routingKey).
      then(function() {
        return Q();
      });
    },
    function(reason) {
      throw(reason);
    });
  } else {
    return Q();
  }
}

/**
 * For publishing, we assert the queue is there and bind it to the routing
 * key we are going to use.
 */
exports.setupForPublish = function(channel, params, callback) {
  var tasks = params.queues.publish.map(function(queue) {
    debug('setupForPublish()', queue);
    return function(callback) {
      return channel.assertQueue(queue.name, queue.options, bindQueue);

      function bindQueue(err) {
        if (err) return callback(err);
        return channel.bindQueue(queue.name,
          params.exchange, queue.routingKey, {}, callback);
      }
    };
  });
  return async.series(tasks, callback);
};

// For consuming, we only assert the queue is there.
exports.setupForConsume = function(channel, params, callback) {
    debug('setupForConsume()');
  channel.prefetch(params.prefetch);
  channel.assertQueue(params.queues.consume.name,
      params.queues.consume.options, callback);
};

// vim: set et sw=2 ts=2 colorcolumn=80:
