/*jshint esversion: 6 */

/*

socket.io-bridge-client - Real-time bidirectional event-based communication between two socket.io clients.

Copyright 2018 Michael Karl Franzl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/



/**
 * @typedef IO
 * @see {@link https://github.com/socketio/socket.io-client}
 */
 
 
/**
 * @typedef Socket
 * @see {@link https://github.com/socketio/socket.io-client/blob/master/docs/API.md#socket}
 */



/**
 * Constructor to instantiate a socket.io-bridge client.
 * 
 * @param {Object} opts
 * @param {IO} opts.IO - The imported socket.io-client module
 * @param {Socket} opts.socket - A socket.io-client socket which is already connected to the [socket.io-bridge/server]{@link ../server}, e.g. created by `IO('http://localhost:3000/bridge')`
 * @param {Socket} [opts.io_opts={}] - Options to pass to `IO` when creating new bridge namespaces.
 * 
 */ 
function BridgeClient({
  IO,
  socket,
  io_opts = {},
}) {
  this.IO = IO;
  this.socket = socket;
  this.io_opts = io_opts;
  
  this.uri = this.socket.io.uri;
  this.clients = {};
  this.num_connections = 0;
  
  this.socket.on('internal_error', (uuid, msg) => {
    let client = this.clients[uuid];
    client.onInternalError(msg);
  });
  
  this.socket.on('connect_to_bridge', (uuid, bridgenum) => {
    let client = this.clients[uuid];
    client.onConnectToBridge(bridgenum);
  });
  
  this.socket.on('logged_in', (uuid) => {
    let client = this.clients[uuid];
    client.onLoggedIn();
  });
}



/**
 * Handler function for the result of the call to `make()`.
 * 
 * @callback BridgeClient~onresult
 * @param {(Socket|null)} socket - The transparent socket to the peer
 * @param {(Error|null)} err - If an error occurred
 */
 
 

/**
 * Make a bridge.
 *
 * @param {Object} opts - Options
 * @param {string} opts.uid - Our unique ID.
 * @param {BridgeClient~onresult} opts.onresult - Handler of the result of the operation.
 * @param {string} [opts.peer_uid] - The unique ID of the peer we want to establish a connection to.
 * @param {object} [opts.log] - The logger to use. Must support `info()`, `warn()`, `debug()` and `error()` methods.
 * 
 */ 
BridgeClient.prototype.make = function({
  uid,
  peer_uid,
  onresult,
  log = {
    info: console.info,
    warn: console.warn,
    debug: console.debug || console.log,
    error: console.error
  }
}) {
  
  // Reasonably unique
  let uuid = `${Date.now()}_${this.num_connections++}`;
  
  if (!uid)
    throw new Error('uid is required');
    
  if (typeof onresult != 'function')
    throw new Error('onresult handler must be a function');
    
    
  this.socket.emit('login', uuid, uid);
    
  this.clients[uuid] = {
    onInternalError: (msg) => {
      onresult(null, new Error(msg));
    },
    
    onConnectToBridge: (bridgenum) => {
      var uri = this.uri + '/' + bridgenum;

      log.debug(uid, 'connecting to bridge', uri);


      // From socket.io-client documentation: "By default, a single connection is used when connecting to different namespaces (to minimize resources)"
      var bridgesocket = this.IO(uri, this.io_opts);

      bridgesocket.once('disconnect', function () {
        log.debug(uid, 'disconnect');
      });
      
      bridgesocket.once('internal_error', (msg) => {
        onresult(null, new Error(msg));
      });

      bridgesocket.once('peer_connected', function () {
        log.debug(uid, 'peer_connected');
        
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
        log.debug(uid, 'requesting bridge to', peer_uid);
        this.socket.emit('request_bridge', uuid, uid, peer_uid);
      }
    },
  };
};

export default BridgeClient;