var Q = require('q');

module.exports = function(config) {
  var amqp = require('amqp')(config);
  return {
    connect: Q.denodeify(amqp.connect),
    publish: Q.denodeify(amqp.publish),
    consume: amqp.consume
  };
};
