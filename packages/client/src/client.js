import makeBridge from './make-bridge.js';

/**
 * @typedef Socket
 * @see {@link https://github.com/socketio/socket.io-client/blob/master/docs/API.md#socket}
 */

/**
 * @constructs BridgeClient
 *
 * @param {Object} opts
 * @param {Socket} opts.socket
  */
function BridgeClient({
  socket,
}) {
  this.socket = socket;
  this.clients = {};
  this.num_connections = 0;

  this.socket.on('bridge', (localId, bridgeId) => this.clients[localId].onbridge(bridgeId));
  this.socket.on('logged_in', (localId) => this.clients[localId].onloggedin());
}

BridgeClient.prototype.make = makeBridge;

export default BridgeClient;
