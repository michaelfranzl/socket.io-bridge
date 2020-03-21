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
console.log('Connecting to the backend with a random ID and requesting peer "Bob".');

bridgeClient
  .make({ peerUid: 'Bob', logger: console })
  .then((peer) => {
    console.log('Bob is connected. Socket to Bob is available in the console as window.bob');
    window.bob = peer;

    peer.on('disconnect', () => console.log('Peer disconnected'));
    setTimeout(() => {
      console.log('I\'m saying Hello to Bob!');
      peer.emit('say', 'Hello Bob! I am Alice!');
    }, 1000);
  });
