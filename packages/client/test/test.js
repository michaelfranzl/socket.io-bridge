/* eslint-disable prefer-arrow-callback, func-names */

import http from 'http';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

import SocketIoServer from 'socket.io';
import SocketIoClient from 'socket.io-client';

import 'colors';
// import getLogger from 'loglevel-colored-level-prefix';

import SocketIoBridgeClient from '../src/client.js';
import makeBridgeServer from '../../server/src/server.js';

const { expect } = chai;
chai.use(chaiAsPromised);

describe('client', function () {
  const clientLogger = undefined; // getLogger({ prefix: 'CLIENT'.green, 'debug' });

  // This is just an example of how authentication could be done
  const secretToken = 'Bearer authorization_token_here';
  const ioOpts = {
    extraHeaders: {
      authorization: secretToken,
    },
  };

  const serverHost = 'localhost';
  const serverPort = 3000;
  const bridgePath = 'bridges';
  const bridgeUri = `http://${serverHost}:${serverPort}/${bridgePath}`;

  let socketIoServer;
  let bridgeClient;

  before(function () {
    const server = http.createServer().listen(serverPort);
    socketIoServer = SocketIoServer(server);

    // This is just an example of how authentication could be done
    socketIoServer.use((sock, next) => {
      if (sock.handshake.headers.authorization === secretToken) {
        next();
      } else {
        sock.disconnect();
      }
    });

    const namespace = socketIoServer.of(`/${bridgePath}`);
    const logger = undefined; // getLogger({ prefix: 'SERVER'.red, 'debug' });
    makeBridgeServer({ namespace, logger });
  });

  beforeEach(function () {
    const socket = SocketIoClient(bridgeUri, ioOpts);
    bridgeClient = new SocketIoBridgeClient({ socket });
  });

  afterEach(async function () {
    bridgeClient.socket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  after(function () {
    socketIoServer.close();
  });

  context('when Alice wants to connect to Bob', function () {
    context('when Alice wants to emit a signal to Bob', function () {
      it('works when Alice connects later than Bob', function (done) {
        bridgeClient
          .make({ uid: 'Bob', logger: clientLogger })
          .then((peer) => {
            peer.on('add', (num1, num2, cb) => cb(num1 + num2));
          });

        const delayMs = 200;
        function startClient() {
          bridgeClient
            .make({ uid: 'Alice', peerUid: 'Bob', logger: clientLogger })
            .then(async (peer) => {
              // The other peer will receive this event at *roughly* the same time.
              // Allow typical network delays as tolerance (in the order of 10 to 100 milliseconds)
              // before sending the peer an event.
              await new Promise((resolve) => setTimeout(resolve, 100));

              peer.emit('add', 3, 4, (result) => {
                peer.disconnect();
                expect(result).to.equal(7);
                done();
              });
            });
        }
        setTimeout(startClient, delayMs);
      });

      it('works when Alice connects earlier than Bob', function (done) {
        bridgeClient
          .make({ uid: 'Alice', peerUid: 'Bob', logger: clientLogger })
          .then(async (peer) => {
            // The other peer will receive this event at *roughly* the same time.
            // Allow typical network delays as tolerance (in the order of 10 to 100 milliseconds)
            // before sending the peer an event.
            await new Promise((resolve) => setTimeout(resolve, 100));

            peer.emit('add', 7, 6, (result) => {
              peer.disconnect();
              expect(result).to.equal(13);
              done();
            });
          });

        const delayMs = 200;
        function start() {
          bridgeClient.make({
            uid: 'Bob',
            logger: clientLogger,
            onconnection: async (peer) => {
              peer.on('add', (num1, num2, cb) => cb(num1 + num2));
            },
          });
        }
        setTimeout(start, delayMs);
      });
    });
  });

  context('when Bob wants to connect to Alice', function () {
    context('when Alice wants to emit a signal to Bob', function () {
      it('works when Alice connects later than Bob', function (done) {
        bridgeClient
          .make({ uid: 'Bob', peerUid: 'Alice', logger: clientLogger })
          .then((peer) => {
            peer.on('add', (num1, num2, cb) => cb(num1 + num2));
          });

        const delayMs = 200;
        function start() {
          bridgeClient.make({
            uid: 'Alice',
            logger: clientLogger,
            onconnection: async (peer) => {
              // The other peer will receive this event at *roughly* the same time.
              // Allow typical network delays as tolerance (in the order of 10 to 100 milliseconds)
              // before sending the peer an event.
              await new Promise((resolve) => setTimeout(resolve, 100));

              peer.emit('add', 7, 6, (result) => {
                peer.disconnect();
                expect(result).to.equal(13);
                done();
              });
            },
          });
        }
        setTimeout(start, delayMs);
      });

      it('works when Alice connects earlier than Bob', function (done) {
        bridgeClient.make({
          uid: 'Alice',
          logger: clientLogger,
          onconnection: async (peer) => {
            // The other peer will receive this event at *roughly* the same time.
            // Allow typical network delays as tolerance (in the order of 10 to 100 milliseconds)
            // before sending the peer an event.
            await new Promise((resolve) => setTimeout(resolve, 100));

            peer.emit('add', 3, 4, (result) => {
              peer.disconnect();
              expect(result).to.equal(7);
              done();
            });
          },
        });

        const delayMs = 200;
        function start() {
          bridgeClient
            .make({ uid: 'Bob', peerUid: 'Alice', logger: clientLogger })
            .then((peer) => {
              peer.on('add', (num1, num2, cb) => cb(num1 + num2));
            });
        }
        setTimeout(start, delayMs);
      });
    });
  });

  specify('disconnects Bob\'s socket when Alice\'s socket is disconnected', function (done) {
    bridgeClient
      .make({ uid: 'Alice', peerUid: 'Bob', logger: clientLogger })
      .then((peer) => {
        peer.on('disconnect me!', () => peer.disconnect());
      });

    bridgeClient.make({
      uid: 'Bob',
      logger: clientLogger,
      onconnection: async (peer) => {
        // The other peer will receive this event at *roughly* the same time.
        // Allow typical network delays as tolerance (in the order of 10 to 100 milliseconds)
        // before sending the peer an event.
        await new Promise((resolve) => setTimeout(resolve, 100));

        peer.emit('disconnect me!');
        function checkIfDisconnected() {
          expect(peer.disconnected).to.eq(true);
          done();
        }
        setTimeout(checkIfDisconnected, 100);
      },
    });
  });

  specify('disconnects Alice\'s socket when Bob\'s socket is disconnected', function (done) {
    bridgeClient
      .make({ uid: 'Alice', peerUid: 'Bob', logger: clientLogger })
      .then(async (peer) => {
        // The other peer will receive this event at *roughly* the same time.
        // Allow typical network delays as tolerance (in the order of 10 to 100 milliseconds)
        // before sending the peer an event.
        await new Promise((resolve) => setTimeout(resolve, 100));

        peer.emit('disconnect me!');
        function checkIfDisconnected() {
          expect(peer.disconnected).to.eq(true);
          done();
        }
        setTimeout(checkIfDisconnected, 100);
      });

    bridgeClient.make({
      uid: 'Bob',
      logger: clientLogger,
      onconnection: async (peer) => {
        peer.on('disconnect me!', () => peer.disconnect());
      },
    });
  });

  it('is possible to reconnect to another peer', function (done) {
    let numConnects = 0;

    bridgeClient.make({
      uid: 'Bob',
      logger: clientLogger,
      onconnection: (peer) => {
        numConnects += 1;
        if (numConnects === 2) {
          peer.disconnect();
          done();
          return;
        }
        peer.emit('please reconnect');
      },
    });

    function aliceConnectToBob() {
      bridgeClient
        .make({ uid: `Alice${Date.now()}`, peerUid: 'Bob', logger: clientLogger })
        .then((socket) => {
          socket.on('please reconnect', () => {
            socket.disconnect();
            setTimeout(aliceConnectToBob, 100);
          });
        });
    }

    aliceConnectToBob();
  });

  it('returns a promise for the client requesting another client', function (done) {
    bridgeClient.make({
      uid: 'Bob',
      logger: clientLogger,
    });

    const promise = bridgeClient.make({ uid: 'Alice', peerUid: 'Bob', logger: clientLogger })
      .then((peer) => peer.disconnect());

    expect(promise).to.eventually.be.fulfilled.notify(done);
  });

  it('returns a promise for the client which is requested', function (done) {
    const promise = bridgeClient.make({
      uid: 'Bob',
      logger: clientLogger,
      onconnection: (peer) => {
        setTimeout(() => peer.disconnect(), 100);
      },
    });
    expect(promise).to.eventually.be.fulfilled.notify(done);

    bridgeClient.make({ uid: 'Alice', peerUid: 'Bob', logger: clientLogger })
      .then((peer) => peer.disconnect());
  });

  it('uses a callback for the client requesting another client', function (done) {
    bridgeClient.make({ uid: 'Bob', logger: clientLogger });

    bridgeClient.make({
      uid: 'Alice',
      peerUid: 'Bob',
      logger: clientLogger,
      onconnection: (peer) => {
        peer.disconnect();
        done();
      },
    });
  });

  it('uses a callback for the client which is requested', function (done) {
    bridgeClient.make({
      uid: 'Bob',
      logger: clientLogger,
      onconnection: (peer) => {
        peer.disconnect();
        done();
      },
    });

    bridgeClient.make({
      uid: 'Alice',
      peerUid: 'Bob',
      logger: clientLogger,
    });
  });

  specify('two clients connect to a third client', function (done) {
    let numConnections = 0;

    bridgeClient.make({
      uid: 'Bob',
      logger: clientLogger,
      onconnection: (peer) => {
        peer.disconnect();
        numConnections += 1;
        if (numConnections === 1) return;

        done(); // We have received two (from Alice and Sue) connections.
      },
    });

    bridgeClient.make({
      uid: 'Alice',
      peerUid: 'Bob',
      logger: clientLogger,
    });

    bridgeClient.make({
      uid: 'Sue',
      peerUid: 'Bob',
      logger: clientLogger,
    });
  });

  it('is not possible to re-use a currently used ID', async function () {
    bridgeClient.make({
      uid: 'Bob',
      logger: clientLogger,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const promise = bridgeClient.make({
      uid: 'Bob',
      logger: clientLogger,
    });

    expect(promise).to.eventually.be.rejectedWith('uid_taken');
  });

  it('is possible to re-use a no longer used ID', async function () {
    const uid = 'Bob';

    bridgeClient.make({
      uid,
      logger: clientLogger,
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    bridgeClient.socket.disconnect();

    // Same as in beforeEach: Start a completely new connection.
    const socket = SocketIoClient(bridgeUri, ioOpts);
    bridgeClient = new SocketIoBridgeClient({ socket });
    const promise = new Promise((resolve) => {
      bridgeClient.make({
        uid,
        logger: clientLogger,
        onconnection: (peer) => {
          peer.disconnect();
          resolve();
        },
      });
    });

    // Make a connection to resolve the promise.
    bridgeClient.make({
      peerUid: 'Bob',
      logger: clientLogger,
    });

    return promise;
  });
});
