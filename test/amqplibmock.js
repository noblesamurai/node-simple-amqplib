/**
 * This is a mock for the underlying amqplib library that we are wrapping.
 */
var Q = require('q'),
    Sinon = require('sinon');

module.exports = function(config) {
  var overrides = (config && config.overrides) || {};
  var messageToDeliver = (config && config.messageToDeliver) || '{}';

  var amqpLibMock = {
    connect: connectMock
  };

  function connectMock(url) {
    return Q.promise(function(resolve) {
      resolve({
        createConfirmChannel: createConfirmChannelMock
      });
    });
  }

  var channelMock = {
    consume: function (a, handleMessage, b) {
      handleMessage({
        content: {
          toString: function() {return messageToDeliver;}
        }
      });
    },
    assertExchange: function() {
      return Q.promise(function(resolve) {
        resolve();
      });
    },
    assertQueue: Sinon.spy(function() {
      return Q.promise(function(resolve) {
        resolve();
      });
    }),
    bindQueue: Sinon.spy(function() {
      return Q.promise(function(resolve) {
        resolve();
      });
    }),
    prefetch: function() {
      return Q.promise(function(resolve) {
        resolve();
      });
    },
    ack: overrides.ack || Sinon.spy(),
    nack: overrides.nack || Sinon.spy()
  };

  function createConfirmChannelMock() {
    return Q.promise(function(resolve) {
      resolve(channelMock);
    });
  }

  return {
    mock: amqpLibMock,
    assertQueueSpy: channelMock.assertQueue,
    bindQueueSpy: channelMock.bindQueue,
    ackSpy: channelMock.ack,
    nackSpy: channelMock.nack
  };
};

// vim: set et sw=2 ts=2 colorcolumn=80:
