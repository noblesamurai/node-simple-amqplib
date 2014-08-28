var Q = require('q');

function declareDeadLetters(channel, queue) {
  console.log('declareDeadLetters', queue);
  if (queue.options && queue.options.deadLetterExchange) {
    console.log('declareDeadLetters - true');
    var dlName = queue.name + '-dead-letter';
    return Q(channel.assertQueue(dlName, {})).then(function() {
      console.log('asserted');
      return channel.bindQueue(dlName,
        queue.options.deadLetterExchange, 
        queue.options.deadLetterExchangeRoutingKey || queue.options.routingKey).
      then(function() {
        console.log('bound');
        return Q();
      });
    },
    function(reason) {
      console.log(reason);
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
exports.setupForPublish = function(channel, params) {
  var setupPublishes = params.queues.publish.map(function(queue) {
    console.log('setupForPublish()', queue);
    return Q(channel.assertQueue(queue.name, queue.options))
      .then(function() {
        console.log('bind 1:');
        return channel.bindQueue(queue.name, params.exchange, queue.routingKey);
      })
      .then(function() {
          return declareDeadLetters(channel, queue);
        }, function(reason) {
          console.error(reason);
          throw(reason);
      });
  });
  console.log(setupPublishes);
  return Q.all(setupPublishes);
};

// For consuming, we only assert the queue is there.
exports.setupForConsume = function(channel, params) {
  channel.prefetch(params.prefetch);
  return channel.assertQueue(params.queues.consume.name, params.queues.consume.options).
  then(function() {
    return declareDeadLetters(channel, params.queues.consume);
  });
};

// vim: set et sw=2 ts=2 colorcolumn=80:
