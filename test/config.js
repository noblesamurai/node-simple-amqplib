module.exports = {
  url: process.env.AMQP_URL || '
  exchange: 'mytestexchange',
  queue: {
    name: 'myconsumequeue',
    routingKey: 'myRoutingQueue',
    options: {deadLetterExchange: 'wow'}
  }
};

// vim: set et sw=2:
