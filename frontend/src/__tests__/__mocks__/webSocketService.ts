// Manual mock for webSocketService / websocketService
// Used by moduleNameMapper to intercept both static and dynamic imports.
// Must use CommonJS exports so it works when Jest resolves the dynamic import().

const webSocketService = {
  disconnectAll: jest.fn(),
  reconnectAll: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
};

module.exports = webSocketService;
module.exports.default = webSocketService;