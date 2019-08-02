module.exports = {
  good: {
    url: process.env.AMQP_URL || 'amqp://guest:guest@localhost',
    exchange: 'mytestexchange',
    queue: {
      name: 'myconsumequeue',
      routingKey: 'myRoutingQueue',
      options: { deadLetterExchange: 'wow' }
    }
  },
  noRoutingKey: {
    url: process.env.AMQP_URL || 'amqp://guest:guest@localhost',
    exchange: 'hasone',
    queue: {
      name: 'myconsumequeue',
      options: {}
    }
  },
  routingKeyArray: {
    url: process.env.AMQP_URL || 'amqp://guest:guest@localhost',
    exchange: 'mytestexchange',
    queue: {
      name: 'myconsumequeue',
      routingKey: ['myRoutingKey', 'myRoutingKey2'],
      options: { deadLetterExchange: 'wow' }
    }
  }
};

// vim: set et sw=2:
