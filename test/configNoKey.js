module.exports = {
  url: 'amqp://guest:guest@localhost/amqp-wrapper-testing',
  exchange: 'hasone',
  queue: {
    name: 'myconsumequeue',
    options: {}
  }
};
