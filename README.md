node-amqp-wrapper
----------------

A simple wrapper to https://github.com/squaremo/amqp.node.

Allows you to have one publish queue, one consume queue and to perform
consume and publish operations.

Can pass queue options in that will be used when the queue is
asserted/declared.

# Example usage
```javascript
var AMQP = require('node-amqp-wrapper');

var queueOptions = {
  consumeQueue: process.env.AMQP_CONSUME,
  publishQueue: process.env.AMQP_RESPONSE,
  publishQueueRoutingKey: process.env.AMQP_RESPONSE_ROUTING_KEY
};

AMQP.connect(process.env.AMQP_URL, process.env.AMQP_EXCHANGE,
    queueOptions, amqpConnectDone);

// Set the QOS/prefetch.
AMQP.prefetch(100);

// Consuming
var handleMessage = function(message, callback) {
	//...
};
// You must call:
callback(err, requeue)
// in your handleMessage. If `err` !== `null` then the message will be `nack`ed.
// Requeueing will be requeue iff `requeue` is `true`.
// If `err` is `null` then the message is `ack`ed.
// If an exception occurs in handleMessage, then the message is `nack`ed and not requeued.

// Start consuming:
AMQP.consume(handleMessage);

// Publishing
AMQP.publish(payload, done);
