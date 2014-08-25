var Q = require('q');
/**
 * For publishing, we assert the queue is there and bind it to the routing
 * key we are going to use.
 */
exports.setupForPublish = function(channel, params) {
  var setupPublishes = params.queues.publish.map(function(queue) {
    return channel.assertQueue(queue.name, queue.options)
    .then(function() {
      return channel.bindQueue(queue.name, params.exchange, queue.routingKey);
    });
  });
  return Q.all(setupPublishes);
};

// For consuming, we only assert the queue is there.
exports.setupForConsume = function(channel, params) {
  channel.prefetch(params.prefetch);
  return channel.assertQueue(params.queues.consume.name,
      params.queues.consume.options);
};
