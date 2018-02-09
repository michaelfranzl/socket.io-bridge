/*jshint esversion: 6 */

/*

@socket.io-bridge/client - Real-time bidirectional event-based communication between two socket.io clients.

Copyright 2018 Michael Karl Franzl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/



/**
 * @typedef IO
 * @see {@link https://github.com/socketio/socket.io-client/blob/master/docs/API.md#socket}
 */
 
 
/**
 * @typedef io.Socket
 * @see {@link https://github.com/socketio/socket.io-client}
 */



/**
 * Constructor to instantiate a socket.io-bridge client.
 * 
 * Sets up one connection to the socket.io-bridge server which is re-used for several calls to {@link make} All clients behave the same, so one per application is enough.
 * 
 * @param {IO} IO
 * @param {string} uri - URI of the socket.io-bridge server plus namespace, e.g. 'https://localhost:3000/bridge'
 * @param {string} [io_opts={}] - Options for the IO constructor.
 * 
 */ 
function SocketIoBridgeClient({
  IO,
  socket,
} = {}) {
  this.IO = IO;
  this.mastersocket = socket;
  this.uri = this.mastersocket.io.uri;
}



/**
 * Handler function for the result of the call to {@link make}.
 * 
 * @callback SocketIoBridgeClient~onresult
 * @param {io.Socket} socket - The transparent socket to the peer
 * @param {?Error} err - If an error occurred
 */
 
 

/**
 * Sets up a socket to the requested which can be used for transparent events (.emit(), on()) to the other peer.
 *
 * @param {string} uid - Our unique ID. No two clients can use the same UID at the same time.
 * @param {string} [peer_uid] - The unique ID of the peer we want to establish a connection to.
 * @callback SocketIoBridgeClient~onresult onresult - Handler of the result of the operation.
 * @param {object} log - The logger to use. Must support info(), warn(), debug() and error() methods.
 * 
 */ 
SocketIoBridgeClient.prototype.make = function({
  uid,
  peer_uid,
  onresult,
  log = {
    info: console.info,
    warn: console.warn,
    debug: console.debug || console.log,
    error: console.error
  }
} = {}) {
  
  let disconnected = false;
  
  if (!uid)
    throw new Error('uid is required');
    
  if (typeof onresult != 'function')
    throw new Error('onresult handler must be a function');
  
  this.mastersocket.emit('login', uid);
  
  this.mastersocket.once('internal_error', (id, msg) => {
    if (disconnected || id != uid) return;
    onresult(null, new Error(msg));
  });
  
  this.mastersocket.on('connect_to_bridge', (id, bridgenum) => {
    if (disconnected || id != uid) return;

    var uri = this.uri + '/' + bridgenum;

    
    log.debug('connect_to_bridge', uid, uri);

    var bridgesocket = this.IO(uri, this.mastersocket.io.opts);

    bridgesocket.once('disconnect', function () {
      disconnected = true;
      log.debug('disconnect', uid);
    });
    
    bridgesocket.once('internal_error', (msg) => {
      onresult(null, new Error(msg));
    });

    bridgesocket.once('peer_connected', function () {
      log.debug('peer_connected', uid);

      log.debug('echotest', uid);
      var testtext = 'testtext';
      bridgesocket.emit('echo', testtext, function (echoed) {
        if (testtext == echoed) {
          log.debug('echo works. bridge successfully established', uid);
          onresult(bridgesocket, null);
        }
      });
    });

    bridgesocket.once('echo', function (txt, cb) {
      cb(txt);
    });
    
    bridgesocket.emit('start', uid);
  });
  
  new Promise((resolve, reject) => {
    this.mastersocket.on('logged_in', (id) => {
      if (id != uid) return;
      log.debug('CLIENT logged_in', uid);
      resolve();
    });
  })
  .then(() => {
    if (peer_uid) {
      log.info('CLIENT requesting bridge', uid, peer_uid);
      this.mastersocket.emit('request_bridge', uid, peer_uid);
    }
    
  });
};

export default SocketIoBridgeClient;