module.exports = {
  url: '
  exchange: 'mytestexchange',
  queue: {
    name: 'myconsumequeue',
    routingKey: 'myRoutingQueue',
    options: {deadLetterExchange: 'wow'}
  }
};
