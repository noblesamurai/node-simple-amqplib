var AMQP = require('../amqp'),
    expect = require('chai').expect;

describe('AMQP', function() {
  describe('#connect', function() {
    it('should call the callback successfully', function(done) {
      AMQP.connect({consume: true, publish: true}, function(err, res) {
        if (err) return done(err);
        done();
      });
    });
  });
  describe('#publish', function() {
    it('should call the callback successfully', function(done) {
      AMQP.connect({publish: true}, function(err, res) {
        if (err) return done(err);
        AMQP.publish(new Buffer('test'), function(err) {
          if (err) return done(err);
          done();
        });
      });
    });
  });
});


