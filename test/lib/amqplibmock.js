'use strict';

/**
 * This is a mock for the underlying amqplib library that we are wrapping.
 */
var Sinon = require('sinon');

module.exports = function(config) {
  var overrides = (config && config.overrides) || {};
  var messageToDeliver = (config && config.messageToDeliver) || '{}';

  var channelMock = {
    consume: Sinon.stub().yields({
      content: {
        toString: function() {return messageToDeliver;}
      }
    }),
    assertExchange: Sinon.stub().callsArg(3),
    assertQueue: Sinon.stub().callsArg(2),
    bindQueue: Sinon.stub().callsArg(4),
    prefetch: Sinon.spy(),
    ack: overrides.ack || Sinon.spy(),
    nack: overrides.nack || Sinon.spy()
  };

  var amqpLibMock = {
    connect: Sinon.stub().yields(null, {
      createConfirmChannel: Sinon.stub().yields(null, channelMock)
    })
  };

  return {
    mock: amqpLibMock,
    assertQueueSpy: channelMock.assertQueue,
    bindQueueSpy: channelMock.bindQueue,
    ackSpy: channelMock.ack,
    nackSpy: channelMock.nack,
    channelMock: channelMock
  };
};
