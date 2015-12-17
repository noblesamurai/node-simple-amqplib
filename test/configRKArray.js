module.exports = {
  url: process.env.AMQP_URL || 'amqp://guest:guest@localhost',
  exchange: 'mytestexchange',
  queue: {
    name: 'myconsumequeue',
    routingKey: ['myRoutingKey', 'myRoutingKey2'],
    options: {deadLetterExchange: 'wow'}
  }
};

// vim: set et sw=2:
