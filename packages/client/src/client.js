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
  this.clients = {};
  this.num_connections = 0;
  
  this.mastersocket.on('internal_error', (uuid, msg) => {
    let client = this.clients[uuid];
    client.onInternalError(msg);
  });
  
  this.mastersocket.on('connect_to_bridge', (uuid, bridgenum) => {
    let client = this.clients[uuid];
    client.onConnectToBridge(bridgenum);
  });
  
  this.mastersocket.on('logged_in', (uuid) => {
    let client = this.clients[uuid];
    client.onLoggedIn();
  });
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
  
  let uuid = `${Date.now()}_${this.num_connections++}`;
  
  let disconnected = false;
  
  if (!uid)
    throw new Error('uid is required');
    
  if (typeof onresult != 'function')
    throw new Error('onresult handler must be a function');
    
    
  this.mastersocket.emit('login', uuid, uid);
    
    
  this.clients[uuid] = {
    onInternalError: (msg) => {
      onresult(null, new Error(msg));
    },
    
    onConnectToBridge: (bridgenum) => {
      var uri = this.uri + '/' + bridgenum;

      log.debug(uid, 'connect_to_bridge', uri);

      var bridgesocket = this.IO(uri, this.mastersocket.io.opts);

      bridgesocket.once('disconnect', function () {
        disconnected = true;
        log.debug(uid, 'disconnect');
      });
      
      bridgesocket.once('internal_error', (msg) => {
        onresult(null, new Error(msg));
      });

      bridgesocket.once('peer_connected', function () {
        log.debug(uid, 'peer_connected');

        log.debug(uid, 'echotest');
        var testtext = 'testtext';
        bridgesocket.emit('echo', testtext, function (echoed) {
          if (testtext == echoed) {
            log.debug(uid, 'echo works. bridge successfully established');
            onresult(bridgesocket, null);
          }
        });
      });

      bridgesocket.once('echo', function (txt, cb) {
        cb(txt);
      });
      
      bridgesocket.emit('start', uid);
    },
    
    onLoggedIn: () => {
      if (peer_uid) {
        log.debug(uid, 'requesting bridge', peer_uid);
        this.mastersocket.emit('request_bridge', uuid, uid, peer_uid);
      }
    },
    
  };
  
  
};

export default SocketIoBridgeClient;