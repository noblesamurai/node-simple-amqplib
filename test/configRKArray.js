module.exports = {
  url: process.env.AMQP_URL || '
  exchange: 'mytestexchange',
  queue: {
    name: 'myconsumequeue',
    routingKey: ['myRoutingKey', 'myRoutingKey2'],
    options: {deadLetterExchange: 'wow'}
  }
};

// vim: set et sw=2:
