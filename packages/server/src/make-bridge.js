import socketIoWildcard from 'socketio-wildcard';

const namespaces = {};
const sockets = {};

export default function makeBridge({ name, server }, bridgeUuid, logger) {
  function debugPrintNumBridges() {
    const numActiveBridges = Object.keys(sockets).length;
    logger.debug(`Now ${numActiveBridges} active bridges remaining.`);
  }

  /*
   * Given an object obj with exactly 2 key:value pairs, and given one key out of the two, return
   * the other key:value pair as an array.
   *
   * @param {Object} obj - Contains exactly 2 key-value pairs.
   * @param {String} key
   * @return {Array}
   */
  function getOtherKeyVal(obj, key) {
    const keys = Object.keys(obj);
    const idx = keys.indexOf(key);
    const otherkey = idx === 0 ? keys[1] : keys[0];
    let otherval;
    if (otherkey) otherval = obj[otherkey];
    return [otherkey, otherval];
  }

  const namespace = server.of(`${name}/${bridgeUuid}`);
  namespaces[bridgeUuid] = namespace;
  namespace.use(socketIoWildcard());

  namespace.on('connection', (socket) => {
    logger.debug(`connection to bridge ID ${bridgeUuid}`);
    let socketsByLabel;

    if (!sockets[bridgeUuid]) { // first connect
      socketsByLabel = {};
      sockets[bridgeUuid] = socketsByLabel;
    } else { // subsequent connects
      socketsByLabel = sockets[bridgeUuid];
    }
    debugPrintNumBridges();

    socket.once('start', (label) => {
      logger.debug(label, 'bridge start');
      socketsByLabel[label] = socket;

      // Transparently forward all events.
      socket.on('*', (packet) => {
        const [event, ...args] = packet.data;
        const [otherId, otherSocket] = getOtherKeyVal(socketsByLabel, label);
        logger.debug(label, `--->${otherId}`, event);
        otherSocket.emit(event, ...args);
      });

      socket.on('disconnect', (reason) => {
        logger.debug(label, 'disconnected', reason);

        // Close the other socket too if still connected.
        const otherSocket = Object.values(namespace.sockets)[0];
        if (otherSocket) otherSocket.disconnect();

        delete namespaces[bridgeUuid];
        delete sockets[bridgeUuid];

        debugPrintNumBridges();
      });

      const [, otherSocket] = getOtherKeyVal(socketsByLabel, label);
      if (otherSocket) {
        socket.emit('peer_connected');
        otherSocket.emit('peer_connected');
      }
    });
  });
}
