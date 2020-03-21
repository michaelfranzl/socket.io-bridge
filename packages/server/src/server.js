import uuid from 'uuid-random';

import makeBridge from './make-bridge.js';

/**
 * @typedef Namespace
 * @see {@link https://github.com/socketio/socket.io/blob/master/docs/API.md#namespace}
 */

/**
 * Adds client-client bridging capability to a Socket.IO namespace.
 *
 * @param {Object} opts
 * @param {Namespace} opts.namespace
 * @param {Object} [opts.logger] No logging by default.
 * Should implement info(), warn(), debug() and error().
 */
function makeBridgeServer({
  namespace,
  logger = {
    info() {},
    warn() {},
    debug() {},
    error() {},
  },
} = {}) {
  const clientsById = {};
  const waitingConnections = {};

  namespace.on('connection', (socket) => {
    logger.debug('Connection');

    socket.on('login', (clientLocalId, uid, otherid, callback) => {
      logger.debug(uid, 'login');

      if (clientsById[uid]) {
        logger.debug(`uid ${uid} already taken`);
        callback('uid_taken');
        return;
      }

      clientsById[uid] = { socket, clientLocalId };

      // If other peers have requested our uid but we are late, notify them that we are ready.
      let waitingClientIds = [];
      const connectionsWaitingForMe = waitingConnections[uid];
      if (connectionsWaitingForMe) waitingClientIds = Object.keys(connectionsWaitingForMe);

      logger.debug(uid, 'waitingClientIds', waitingClientIds);

      waitingClientIds.forEach((waitingClientId) => {
        const connection = connectionsWaitingForMe[waitingClientId];
        const { bridgeId } = connection;

        makeBridge(namespace, bridgeId, logger);

        socket.emit('bridge', clientLocalId, bridgeId);
        connection.socket.emit('bridge', connection.clientLocalId, bridgeId);

        delete connectionsWaitingForMe[waitingClientId];
      });

      socket.on('disconnect', () => {
        logger.debug('master socket disconnected');
        delete clientsById[uid];
      });

      callback('success');
    });

    socket.on('request_bridge', (clientLocalId, uid, otherid) => {
      logger.debug(uid, 'request_bridge', otherid);

      const bridgeId = uuid();
      const otherclient = clientsById[otherid];

      if (!otherclient) { // other socket is not yet connected
        if (!waitingConnections[otherid]) waitingConnections[otherid] = {};
        waitingConnections[otherid][uid] = { clientLocalId, socket, bridgeId };
        logger.debug(uid, 'other socket is not yet connected', otherid);
      } else { // other socket is already connected.
        makeBridge(namespace, bridgeId, logger);
        socket.emit('bridge', clientLocalId, bridgeId);
        otherclient.socket.emit('bridge', otherclient.clientLocalId, bridgeId);
      }
    });
  });

  logger.debug(`Attached socket.io-bridge-server to namespace ${namespace.name}`);
}

export default makeBridgeServer;
