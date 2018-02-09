/*jshint esversion: 6 */

/*
@socket.io-bridge/server - Real-time bidirectional event-based communication between two socket.io clients.

Copyright 2018 Michael Karl Franzl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


const MAX_NUM_BRIDGES = 100; // safety limit



/**
 * @typedef Namespace
 * @see {@link https://github.com/socketio/socket.io/blob/master/docs/API.md#namespace}
 */
 
 
/**
 * Run a socket.io-bridge server.
 * 
 * Do not instantiate.
 * 
 * @param {Object} opts
 * @param {Namespace} opts.namespace - For example: `require('socket.io')(3000).of('/bridge');`
 * @param {Object} opts.log - The logger to use. Must support `info()`, `warn()`, `debug()` and `error()` methods.
 * 
 */ 
function BridgeServer({
  namespace,
  log = {
    info: console.info,
    warn: console.warn,
    debug: console.debug || console.log,
    error: console.error
  }
} = {}) {
  
  if (!this.console) {
    // We must be in the global scope.
    throw(new Error('Do not instantiate this function with the `new` keyword.'));
  }
  
  if (!namespace) {
    // We must be in the global scope.
    throw(new Error('namespace required'));
  }
  
  // bookkeeping
  let sockets_by_bridgenum = {};
  let nsps_by_bridgenum = {}; // namespaces
  let clients_by_id = {};
  let waiting_conns = {};
  
  /*
   * Patch for a socket.io socket to also call a
   * wildcard event handler.
   */
  function addWilcardHandler(sock) {
    // See https://stackoverflow.com/questions/10405070/socket-io-client-respond-to-all-events-with-one-handler
    let onevent_orig = sock.onevent;
    sock.onevent = function (packet) {
      let args = packet.data || [];
      
      packet.data = ['*'].concat(args);
      onevent_orig.call(this, packet);
      
      packet.data = args;
      onevent_orig.call(this, packet);
    };
  }

  /*
   * Library function.
   * 
   * Given an object obj with exactly 2 key:value pairs,
   * and given one key out of the two, return the other
   * key:value pair as an array.
  */
  function getOtherKeyVal(obj, key) {
    let otherval;
    let otherkey;
    
    let keys = Object.keys(obj);
    
    if (keys.length != 1 && keys.length != 2) {
      throw(new Error(`getOtherKeyVal(): Incorrect usage. There can ever be only 1 or 2 keys, but have ${keys.length} keys: ${keys}`));
    }
    
    let idx = keys.indexOf(key);
    if (idx != 0 && idx != 1) { // sanity check
      throw(new Error(`getOtherKeyVal(): Incorrect usage. key ${key} must always be found in the object`));
    }
    
    otherkey = idx == 0 ? keys[1] : keys[0];
    
    if (otherkey) {
      otherval = obj[otherkey];
    }
    return [otherkey, otherval];
  }
  
  
  
  function serve() {
    let num_bridges = 0;
    
    namespace.on('connection', socket => {

      log.info('Connection to /bridge');
      
      socket.on('login', (uuid, myid) => {
        log.info(myid, 'login');
        
        if (clients_by_id[myid]) {
          let msg = `Another client is already logged in with uid ${myid}`;
          log.error(msg);
          socket.emit('internal_error', uuid, msg);
          return;
        }
        
        clients_by_id[myid] = {
          socket,
          uuid,
        };
        
        socket.emit('logged_in', uuid);
        
        // Rest of this function: If other peers have requested our uid
        // but we are late, notify them that we are ready.
        let waiting_clientids = [];
        let conns_waiting_for_me = waiting_conns[myid];
        if (conns_waiting_for_me) {
          waiting_clientids = Object.keys(conns_waiting_for_me);
        }
        
        log.debug(myid, 'waiting_clientids', waiting_clientids);
        
        for (let wid of waiting_clientids) {
          let waiting_conn = conns_waiting_for_me[wid];
          
          if (!waiting_conn) {
            // Sanity check. This should never happen.
            let msg = 'Server logic screwed up and must be revised';
            log.error(msg);
            socket.emit('internal_error', uuid, msg);
            return;
          }
          
          let bridgenum = waiting_conn.bridgenum;
          makeBridge(bridgenum);
          socket.emit('connect_to_bridge', uuid, bridgenum);
          waiting_conn.socket.emit('connect_to_bridge', waiting_conn.uuid, bridgenum);
          
          delete conns_waiting_for_me[wid];
        } // for waiting clients
      }); // on login
      
      socket.on('disconnect', () => {
        log.debug(myid, 'master socket disconnected');
      });
      
      socket.on('request_bridge', (uuid, myid, otherid) => {
        let bridgenum = num_bridges++;
        
        log.debug(myid, 'request_bridge', otherid);
        
        let otherclient = clients_by_id[otherid];

        if (!otherclient) {
          // other socket is not yet connected
          if (!waiting_conns[otherid]) waiting_conns[otherid] = {};
          
          waiting_conns[otherid][myid] = {
            uuid: uuid,
            socket: socket,
            bridgenum,
          };
          
          log.debug(myid, 'other socket is not yet connected', otherid);
          
        } else {
          // other socket is already connected.
          let res = makeBridge(bridgenum);
          if (res instanceof Error) {
            // This is the fault of logic.
            // It should never happen.
            socket.emit('internal_error', uuid, res.message);
            log.error(res.message);
            
          } else {
            socket.emit('connect_to_bridge', uuid, bridgenum);
            otherclient.socket.emit('connect_to_bridge', otherclient.uuid, bridgenum);
          }
        }
      }); // on request_bridge
    }); // on connection
  } // serve()
  
  
  
  function makeBridge(bridgenum) {
    let bridge_nsp;
    
    if (nsps_by_bridgenum[bridgenum]) {
      // Fault of caller of this function. bridgenum must be unique.
      // This should never happen.
      let msg = `Server logic error: ${bridgenum} already existing`;
      log.error(msg);
      return new Error(msg);
      
    } else {
      let ns = `${namespace.name}/${bridgenum}`;
      log.debug(`creating namespace ${ns}`);
      bridge_nsp = nsps_by_bridgenum[bridgenum] = namespace.server.of(ns);
    }
      
    bridge_nsp.on('connection', mysock => {
      addWilcardHandler(mysock);
      
      let sockets_by_label;
      
      log.debug(`connection to bridge number ${bridgenum}`);
      
      if (!sockets_by_bridgenum[bridgenum]) {
        // first connect
        sockets_by_bridgenum[bridgenum] = sockets_by_label = {};
        
      } else {
        // subsequent connects
        sockets_by_label = sockets_by_bridgenum[bridgenum];
      }
      
      let num_active_bridges = Object.keys(sockets_by_bridgenum).length;
      
      if (num_active_bridges > MAX_NUM_BRIDGES) {
        // Don't bring the server down!
        let msg = 'Number of active bridges exceeded safety limit';
        log.error(msg);
        mysock.disconnect();
        delete sockets_by_bridgenum[bridgenum];
        delete nsps_by_bridgenum[bridgenum];
        return;
      }
      
      log.debug(`now ${num_active_bridges} bridges active.`);

      mysock.once('start', (myid) => {
        log.info(myid, `bridge start by`);
        
        sockets_by_label[myid] = mysock;
        
        mysock.on('*', (...args) => {
          // transparent forwarding of all events, including callbacks
          let [otherid, othersock] = getOtherKeyVal(sockets_by_label, myid);
          if (othersock) {
            log.debug(myid, `--->${otherid}`, args[0]);
            othersock.emit(...args);
          } else {
            let msg = `Other socket not yet connected. You should wait for the peer_connected event.`;
            mysock.emit('internal_error', myid, msg);
            log.warn(myid, msg);
          }
        });
        
        mysock.on('disconnect', () => {
          log.debug(myid, 'disconnected');
          
          // Close all other sockets (just one, but we are thorough)
          Object.keys(bridge_nsp.sockets).forEach(key =>  {
            let sock = bridge_nsp.sockets[key];
            if (sock) sock.disconnect();
          });
          
          // cleanup
          delete sockets_by_bridgenum[bridgenum];
          
          let num_active_bridges = Object.keys(sockets_by_bridgenum).length;
          
          log.debug(myid, `Now ${num_active_bridges} active bridges remaining.`);
          
          delete nsps_by_bridgenum[bridgenum];
          delete sockets_by_bridgenum[bridgenum];
          
          delete clients_by_id[myid];
          delete waiting_conns[myid];
        }); // on disconnect
        
        
        
        let [otherid, othersock] = getOtherKeyVal(sockets_by_label, myid);
        if (othersock) {
          mysock.emit('peer_connected');
          othersock.emit('peer_connected');
          // At this point, the clients will do a bi-directional echo test.
        }
        
      }); // bridge once start
    }); // bridge on connection
    return bridge_nsp;
  } // makeBridge
  
  
  serve();
}

module.exports = BridgeServer;