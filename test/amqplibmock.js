/**
 * This is a mock for the underlying amqplib library that we are wrapping.
 */
const Sinon = require('sinon');

module.exports = function (config) {
  const overrides = (config && config.overrides) || {};
  const messageToDeliver = (config && config.messageToDeliver) || '{}';

  const channelMock = {
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

  const connectionMock = {
    createConfirmChannel: Sinon.stub().resolves(channelMock),
    close: Sinon.stub().resolves()
  };

  const amqpLibMock = {
    connect: Sinon.stub().resolves(connectionMock)
  };

  return {
    mock: amqpLibMock,
    assertQueueSpy: channelMock.assertQueue,
    bindQueueSpy: channelMock.bindQueue,
    ackSpy: channelMock.ack,
    nackSpy: channelMock.nack,
    channelMock: channelMock,
    closeConnectionSpy: connectionMock.close
  };
};
