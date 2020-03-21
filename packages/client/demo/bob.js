/* eslint-disable import/extensions */

import SocketIoClient from 'socket.io-client';
import SocketIoBridgeClient from '../src/client.js';

const serverHost = 'localhost';
const serverPort = 3003;
const bridgePath = 'bridges';
const bridgeUri = `http://${serverHost}:${serverPort}/${bridgePath}`;

const socket = SocketIoClient(bridgeUri);
const bridgeClient = new SocketIoBridgeClient({ socket });

console.warn('Make sure the demo backend is running.');
console.log('Connecting to the backend with ID "Bob" and waiting for incoming connections.');

let numPeers = 0;

bridgeClient
  .make({
    uid: 'Bob',
    logger: console,
    onconnection: (peer) => {
      peer.on('disconnect', () => console.log('Peer disconnected'));
      peer.on('say', (text) => console.log(`Peer says: "${text}"`));

      console.log(`Peer is connected. Socket to the peer is available in the console as window.peer${numPeers}`);
      window[`peer${numPeers}`] = peer;
      numPeers += 1;
    },
  });
