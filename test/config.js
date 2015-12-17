module.exports = {
  url: process.env.AMQP_URL || 'amqp://guest:guest@localhost',
  exchange: 'mytestexchange',
  queue: {
    name: 'myconsumequeue',
    routingKey: 'myRoutingQueue',
    options: {deadLetterExchange: 'wow'}
  }
};

// vim: set et sw=2:
