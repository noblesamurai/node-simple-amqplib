amqp-wrapper
----------------

A simple wrapper to https://github.com/squaremo/amqp.node.

Allows you to have any number of publish queues, one consume queue and to perform
consume and publish operations.

Handles assert/declare of queues.

# Example usage
```javascript
var AMQP = require('amqp-wrapper');

var config = {
  url: process.env.AMQP_URL,
  exchange: process.env.AMQP_EXCHANGE,
  queues: {
    consume: {
      name: process.env.AMQP_CONSUME,
      options: {deadLetterExchange: process.env.AMQP_DEAD_LETTER_EXCHANGE}
    },
    publish: [
      {
        name: process.env.AMQP_RESPONSE,
        routingKey: process.env.AMQP_RESPONSE_ROUTING_KEY,
        options: {/* ... */} // options passed to ch.assertQueue() in wrapped lib.
      },
      { // ...
      }
    ]
  },
  // Set the QOS/prefetch.
  prefetch: 100
};

var amqp = AMQP(config);

// Must call this before you consume/publish/etc...
amqp.connect(amqpConnectDone);

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
amqp.consume(handleMessage);

// Publishing to one of the queues declared on connect.
amqp.publishToQueue(name, payload, done);

// Publishing to arbitrary routing key.
amqp.publish(routingKey, payload, options, done);

If `payload` is an object, it will be turned into JSON.
```

# License

(The MIT License)

Copyright (c) 2014 Noble Samurai

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
