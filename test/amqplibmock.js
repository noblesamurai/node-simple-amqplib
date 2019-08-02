/**
 * This is a mock for the underlying amqplib library that we are wrapping.
 */
var Sinon = require('sinon');

module.exports = function (config) {
  var overrides = (config && config.overrides) || {};
  var messageToDeliver = (config && config.messageToDeliver) || '{}';

  var channelMock = {
    consume: Sinon.stub().callsArgWith(1, {
      content: {
        toString: function () { return messageToDeliver; }
      }
    }),
    assertExchange: Sinon.stub().resolves(),
    assertQueue: Sinon.stub().resolves(),
    bindQueue: Sinon.stub().resolves(),
    prefetch: Sinon.spy(),
    ack: overrides.ack || Sinon.spy(),
    nack: overrides.nack || Sinon.spy()
  };

  var amqpLibMock = {
    connect: Sinon.stub().resolves({
      createConfirmChannel: Sinon.stub().resolves(channelMock)
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
