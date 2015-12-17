module.exports = {
  url: process.env.AMQP_URL || '
  exchange: 'hasone',
  queue: {
    name: 'myconsumequeue',
    options: {}
  }
};
