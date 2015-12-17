module.exports = {
  url: process.env.AMQP_URL || 'amqp://guest:guest@localhost',
  exchange: 'hasone',
  queue: {
    name: 'myconsumequeue',
    options: {}
  }
};
