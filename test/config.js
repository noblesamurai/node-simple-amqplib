var execSync = require('exec-sync');

var response = execSync('boot2docker ip', true);
var dockerhost = response.stderr ? 'localhost' : response.stdout;

module.exports = {
  url: '
  exchange: 'mytestexchange',
  queue: {
    name: 'myconsumequeue',
    routingKey: 'myRoutingQueue',
    options: {deadLetterExchange: 'wow'}
  }
};

// vim: set et sw=2:
