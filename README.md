amqp-wrapper
----------------

A simple wrapper to https://github.com/squaremo/amqp.node.

Allows you to have any number of publish queues, one consume queue and to perform
consume and publish operations.

- You can specify a queue which will be declared (made to exist). This will be
  the queue from which you will consume.
- If you specify a routing key for the queue, then a binding will be set up
  (I.e. a mapping that tells AMQP to route message with that routing key to that
  queue on the exchange you have specified).
- Any options you specify at the per-queue level are passed directly through to
  ch.assertQueue in the underlying library.  If you want to set up dead lettering,
  for example, then pass the `deadLetterExchange` option which will cause the queue
  to be declared with that dead letter exchange.
- `deadLetterExchange` and `deadLetterRoutingKey` are special options, in that
  as well as being passed through to `ch.assertQueue()` to ensure the dead
  lettering behaviour occurs, a queue will be declared of the same name with
  the `-dead-letter` suffix, with a binding declared on the dead letter
  exchange for the dead letter routing key.  This means that when a message is dead
  lettered on that queue it will have somewhere to go without you having to set up
  a dead lettering queue manually.

# Example usage
```javascript
var AMQP = require('amqp-wrapper');

var config = {
  url: process.env.AMQP_URL,
  exchange: process.env.AMQP_EXCHANGE,
  queue: {
    name: process.env.AMQP_CONSUME,
    routingKey: process.env.AMQP_ROUTING_KEY, // If supplied, queue is bound to
    // this key (or keys) on the exchange. NB Can be an array of string or just
    // a string.
    options: {/* ... */} // options passed to ch.assertQueue() in wrapped lib.
  },
  // Set the QOS/prefetch.
  prefetch: 100
};

var amqp = AMQP(config);

async function main () {
  // Must call this before you consume/publish/etc...
  await amqp.connect();

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

  // Publishing to arbitrary routing key.
  await amqp.publish(routingKey, payload, options);
}
```

If `payload` is an object, it will be turned into JSON.

# Tests
Start a rabbit server, preferably a 'throw away' one with fresh state.  You can
do this like so if you have docker:
```bash
docker run -d --rm -p 5672:5672 rabbitmq
```
Wait for it to finish starting up, then:
```
npm test
```

Note that `tests/config.js` currently assumes you are using `boot2docker` (on a
Mac) so you may need to hack that stuff (or it may just work as it should just
use localhost if it's not there... unproven though.)

# API

> amqp-wrapper@6.0.0 docs /Users/tim/git/node-amqp-wrapper
> jsdoc2md amqp.js

<a name="AMQPWrapper"></a>

## AMQPWrapper
Class to contain an instantiated connection/channel to AMQP with a given
config.

**Kind**: global class  

* [AMQPWrapper](#AMQPWrapper)
    * [new AMQPWrapper(config)](#new_AMQPWrapper_new)
    * [.connect()](#AMQPWrapper+connect) ⇒ <code>Promise</code>
    * [.close()](#AMQPWrapper+close) ⇒ <code>Promise</code>
    * [.publish(routingKey, message, options)](#AMQPWrapper+publish) ⇒ <code>Promise</code>
    * [.consume(handleMessage, options)](#AMQPWrapper+consume) ⇒ <code>Promise</code>

<a name="new_AMQPWrapper_new"></a>

### new AMQPWrapper(config)
Instantiate an AMQP wrapper with a given config.


| Param | Type |
| --- | --- |
| config | <code>object</code> | 
| config.url | <code>string</code> | 
| config.exchange | <code>string</code> | 
| config.queue | <code>object</code> | 
| config.queue.name | <code>string</code> | 
| config.queue.routingKey | <code>Array.&lt;string&gt;</code> \| <code>string</code> | 
| config.queue.options | <code>object</code> | 

<a name="AMQPWrapper+connect"></a>

### amqpWrapper.connect() ⇒ <code>Promise</code>
Connects, establishes a channel, sets up exchange/queues/bindings/dead
lettering.

**Kind**: instance method of [<code>AMQPWrapper</code>](#AMQPWrapper)  
<a name="AMQPWrapper+close"></a>

### amqpWrapper.close() ⇒ <code>Promise</code>
Closes connection.

**Kind**: instance method of [<code>AMQPWrapper</code>](#AMQPWrapper)  
<a name="AMQPWrapper+publish"></a>

### amqpWrapper.publish(routingKey, message, options) ⇒ <code>Promise</code>
Publish a message to the given routing key, with given options.

**Kind**: instance method of [<code>AMQPWrapper</code>](#AMQPWrapper)  

| Param | Type |
| --- | --- |
| routingKey | <code>string</code> | 
| message | <code>object</code> \| <code>string</code> | 
| options | <code>object</code> | 

<a name="AMQPWrapper+consume"></a>

### amqpWrapper.consume(handleMessage, options) ⇒ <code>Promise</code>
handleMessage() is expected to be of the form:
handleMessage(parsedMessage, callback).
If callback is called with a non-null error, then the message will be
nacked. You can call it like:
callback(err, requeue) in order
to instruct rabbit whether to requeue the message
(or discard/dead letter).

If not given, requeue is assumed to be false.

cf http://squaremo.github.io/amqp.node/doc/channel_api.html#toc_34

**Kind**: instance method of [<code>AMQPWrapper</code>](#AMQPWrapper)  

| Param | Type |
| --- | --- |
| handleMessage | <code>function</code> | 
| options | <code>object</code> | 

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
