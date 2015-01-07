module.exports = {
  url: 'amqp://guest:guest@localhost/amqp-wrapper-testing',
  exchange: 'mytestexchange',
  queue: {
    name: 'myconsumequeue',
    routingKey: 'myRoutingQueue',
    options: {deadLetterExchange: 'wow'}
  }
};
