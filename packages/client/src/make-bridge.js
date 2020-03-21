import SocketIoClient from 'socket.io-client';
import uuid from 'uuid-random';

/**
 * Called as soon as the peer identified by peerUid is available for a connection.
 *
 * @callback BridgeClient~onconnection
 * @param {Socket} socket - Socket.IO client socket connecting to the requested peer/client.
 */

/**
 * Make a Socket.IO bridge to another client.
 *
 * @memberof BridgeClient
 *
 * @param {Object} opts
 * @param {string} [opts.uid] - Our ID. By default a UUID v4.
 * @param {string} [opts.peerUid] - The ID of the peer we want to establish a connection to.
 * @param {BridgeClient~onconnection} [opts.onconnection] - Called for each incoming connection.
 * @param {object} [opts.logger] - No logging by default.
 * Should implement info(), warn(), debug() and error().
 * @returns {Promise} - Promise resolving with a Socket.IO client socket connecting to the
 * requested peer/client. The Promise can be used only for a single connection, e.g. when `peerUid`
 * is set and there will be no incoming connections.
 */
function make({
  peerUid,
  onconnection,
  uid = uuid(),
  logger = {
    info() {},
    warn() {},
    debug() {},
    error() {},
  },
}) {
  const localId = `${Date.now()}_${this.num_connections}`;
  this.num_connections += 1;

  return new Promise((resolve, reject) => {
    this.clients[localId] = {
      onbridge: (bridgeId) => {
        const bridgeUri = `${this.socket.io.uri}/${bridgeId}`;
        logger.debug(uid, 'connecting to bridge', bridgeUri);
        const socket = SocketIoClient(bridgeUri, this.socket.io.opts);
        socket.once('disconnect', () => logger.debug(uid, 'disconnect'));
        socket.once('echo', (txt, cb) => cb(txt));
        socket.once('peer_connected', () => {
          logger.debug(uid, 'peer_connected');

          const testtext = uuid();
          socket.emit('echo', testtext, (echoed) => {
            if (testtext !== echoed) throw new Error('Echo test did not succeed.');

            logger.debug(uid, 'Echo test succeeded. Bridge successfully established.');
            if (onconnection) onconnection(socket);
            resolve(socket);
          });
        });
        socket.emit('start', uid);
      },
    };

    this.socket.emit('login', localId, uid, peerUid, (status) => {
      if (status === 'success') {
        this.socket.emit('request_bridge', localId, uid, peerUid);
      } else {
        reject(new Error(status));
      }
    });
  });
}

export default make;
