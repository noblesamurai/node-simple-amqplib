async function bindRoutingKeys (channel, exchange, queueName, keys = []) {
  const routingKeys = (typeof keys === 'string')
    ? [keys]
    : keys;
  for (let routingKey in routingKeys) {
    await channel.bindQueue(queueName, exchange, routingKey);
  }
}

async function maybeDeclareDeadLetters (channel, queue) {
  if (!queue.options || !queue.options.deadLetterExchange) return;

  var qName = queue.name + (queue.options.deadLetterQueueSuffix || '-dead-letter');
  await channel.assertExchange(queue.options.deadLetterExchange, 'topic', {});
  await channel.assertQueue(qName, {});
  await bindRoutingKeys(channel, queue.options.deadLetterExchange, qName, queue.options.deadLetterExchangeRoutingKey || queue.routingKey);
}

/**
 * For publishing, we assert the queue is there and bind it to the routing
 * key we are going to use.
 */
exports.setupForConsume = async function (channel, params) {
  var { queue } = params;
  await maybeDeclareDeadLetters(channel, queue);
  await channel.assertQueue(queue.name, queue.options);
  await bindRoutingKeys(channel, params.exchange, queue.name, queue.routingKey);
};
