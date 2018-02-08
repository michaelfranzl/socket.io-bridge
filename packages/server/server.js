/*jshint esversion: 6 */


const MAX_NUM_BRIDGES = 100;


function SocketIoBridgeServer({
  namespace,
  log = {
    info: console.info,
    warn: console.warn,
    debug: console.log,
    error: console.error
  }
} = {}) {
  
  if (!this.console) {
    // We must be in the global scope.
    throw(new Error('Do not instantiate this function with the `new` keyword.'));
  }
  
  // bookkeeping
  let socks_by_bridgenum = {};
  let bridges_by_num = {};
  
  
  /*
   * Patch for a socket.io socket to also call a
   * wildcard event handler.
   */
  function addWilcardHandler(sock) {
    // See https://stackoverflow.com/questions/10405070/socket-io-client-respond-to-all-events-with-one-handler
    let onevent_orig = sock.onevent;
    sock.onevent = function (packet) {
      let args = packet.data || [];
      
      // wildcard must come first, otherwise double callback functions
      packet.data = ['*'].concat(args);
      onevent_orig.call(this, packet);
      
      packet.data = args;
      onevent_orig.call(this, packet);
    };
  }

  /*
   * Library function.
   * 
   * Given an object with exactly 2 key:value pairs,
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
  
  
  /*
   * Each master socket will set one UID via `login`.
   * 
   * Each master socket may request several bridges to another UID via `request_bridge`.
   * 
  */
  function runBridgeNamespace() {
    let clients = {};
    let clients_waiting = {};
    
    let num_bridges = 0;
    
    namespace.on('connection', socket => {
      
      log.info('SERVER Connection to /bridge');
      
      socket.emit('connected');
      
      socket.on('login', (myid) => {
        log.info('SERVER Login to bridge with UID', myid);
        
        if (clients[myid]) {
          log.warn(`SERVER Already logged in with UID ${myid}. Is this a reconnect?`);
        }
        
        let myinfo = clients[myid] = {
          socket,
          myid,
        };
        
        socket.emit('logged_in', myid);
        
        let waiting_clientids = [];
        
        if (clients_waiting[myid]) {
          waiting_clientids = Object.keys(clients_waiting[myid]);
        }
        
        //log.info('Waiting waiting_clientids', waiting_clientids);
        
        for (let wid of waiting_clientids) {
          let waiting_client_info = clients_waiting[myid][wid];
          
          if (!waiting_client_info) {
            log.error('SERVER  NO OTHER waiting_client_info ERROR');
            return;
          }
          
          let bridgenum = waiting_client_info.bridgenum;
          
          makeBridge(bridgenum);
          
          // client needs a bit of time between logged_in and connect_to_bridge
          setTimeout(() => {
            socket.emit('connect_to_bridge', myid, bridgenum);
          }, 100);
          
          waiting_client_info.socket.emit('connect_to_bridge', wid, bridgenum);
          
          
          log.info('SERVER Late connect_to_bridge', bridgenum, wid);
          
          delete clients_waiting[myid][wid];
        } // for
        
        socket.on('disconnect', () => {
          log.warn('DISCONNECT MASTER SOCKET', myid);
          delete clients[myid];
          delete clients_waiting[myid];
        });
        
      }); // on login
      
      
      
      socket.on('request_bridge', (myid, otherid) => {
        
        let myinfo = clients[myid];
        let bridgenum = num_bridges++;
        let otherclientinfo = clients[otherid];
        
        log.info('SERVER request_bridge', myid, otherid);
        
        if (!otherclientinfo) {
          log.warn(`request_bridge: Other client ${otherid} not yet connected`.yellow, myid, otherid, bridgenum);
          
          if (!clients_waiting[otherid]) {
            clients_waiting[otherid] = {};
          }
          
          clients_waiting[otherid][myid] = {
            id: myid,
            socket: socket,
            bridgenum,
          };
          return;
        }
        
        
        let res = makeBridge(bridgenum);
        if (res instanceof Error) {
          // This is the fault of server logic.
          // It should never happen.
          socket.emit('internal_error', res.message);
          log.error('internal_error');
          
        } else {
          socket.emit('connect_to_bridge', myid, bridgenum);
          otherclientinfo.socket.emit('connect_to_bridge', otherid, bridgenum);
        }
      }); // on request_bridge
      
      
      
    }); // on connection
    
  } // makeMiddleman
  
  
  
  /*
   * After connection to the bridge, clients need to send the
   * `start` event and supply a label which must stay unique
   * across reconnects to the same bridge.
   * 
   * Security considerations: This is called internally, and since one needs collaboration of another client, it cannot be called as fast as possible.
  */
  function makeBridge(bridgenum) {
    log.info('SERVER makeBridge()', bridgenum);
    
    let bridge;
    
    //console.log(namespace);
    
    if (bridges_by_num[bridgenum]) {
      // fault of caller. bridgenum must be unique
      let msg = `SERVER  ${bridgenum} already existing`;
      log.error(msg);
      return new Error(msg);
      
    } else {
      
      let ns = `${namespace.name}/${bridgenum}`;

      bridge = bridges_by_num[bridgenum] = namespace.server.of(ns);
      
      log.info(`SERVER  Creating bridge ${ns}`);
    }
    
    bridge.on('error', (err) => {
      log.error(err);
    });
      
    bridge.on('connection', (mysock) => {
      let socks_by_label;
      // can be repeated, that's why we have to use labels

      log.info(`SERVER Connection to bridge ${bridgenum}`);
      
      if (!socks_by_bridgenum[bridgenum]) {
        // first connect
        socks_by_bridgenum[bridgenum] = socks_by_label = {};
        
      } else {
        // second connect
        socks_by_label = socks_by_bridgenum[bridgenum];
      }
      
      let num_active_bridges = Object.keys(socks_by_bridgenum).length;
      
      if (num_active_bridges > MAX_NUM_BRIDGES) {
        // safety
        log.error(`Number of active bridges reached safety limit. This is either a DOS attack or bad cleanup logic.`);
        mysock.emit('internal_error', 'Safety limit reached');
        mysock.disconnect();
        delete socks_by_bridgenum[bridgenum];
        delete bridges_by_num[bridgenum];
        return;
      }
      
      log.info(`SERVER Now ${num_active_bridges} bridges active.`);
      
      mysock.emit('connected');

      mysock.once('start', (mylabel) => {
        
        mysock.__mylabel = mylabel;
        
        addWilcardHandler(mysock);
        
        log.info(`SERVER bridge start by`, mylabel);
        
        socks_by_label[mylabel] = mysock;

        let [otherlabel, othersock] = getOtherKeyVal(socks_by_label, mylabel);
        if (othersock) {
          mysock.emit('peer_connected');
          othersock.emit('peer_connected');
        }
        
        mysock.on('*', (...args) => {
          let [otherlabel, othersock] = getOtherKeyVal(socks_by_label, mylabel);
          if (othersock) {
            log.debug(`${mylabel}--->${otherlabel}`, args[0]);
          
            othersock.emit(...args);
          } else {
            log.warn(`SERVER  Cannot bridge, other socket not yet connected`);
          }
        });
      }); // bridge once start
      
      
      mysock.on('disconnect', () => {
        log.warn(`SERVER  Bridge socket with label ${mysock.__mylabel} disconnected.`);
        
        // Close all other sockets (just one but we make sure)
        Object.keys(bridge.sockets).forEach(key =>  {
          let sock = bridge.sockets[key];
          if (sock) sock.disconnect();
        });
        
        // cleanup
        delete socks_by_bridgenum[bridgenum];
        delete socks_by_label[mysock.__mylabel];
        
        let num_active_bridges = Object.keys(socks_by_bridgenum).length;
        
        log.info(`SERVER Now ${num_active_bridges} active bridges remaining.`);
        
        delete bridges_by_num[bridgenum];
      });
      

    }); // bridge on connections
    
    return bridge;
  } // makeBridge
  
  
  runBridgeNamespace();
}


module.exports = SocketIoBridgeServer;