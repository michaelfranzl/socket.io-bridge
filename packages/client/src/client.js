/*jshint esversion: 6 */

function SocketIoBridgeClient({
  io,
  uri,
}) {
  this.io = io;
  this.uri = uri;

  this.mastersocket = io(uri, {
    rejectUnauthorized: false // permit self-signed cert
  });
}


SocketIoBridgeClient.prototype.make = function({
  uid,
  peer_uid,
  onsocket,
  log = {
    info: console.info,
    warn: console.warn,
    debug: console.log,
    error: console.error
  }
} = {}) {
  
  log.info('make()');
  
  this.mastersocket.emit('login', uid);
  
  new Promise((resolve, reject) => {
    
    this.mastersocket.on('logged_in', (id) => {
      if (id != uid) return; // called as many times as make() was called, but with different ids
      log.debug('CLIENT logged_in', id);
      resolve();
    });
    
  })
  .then(() => {
    this.mastersocket.on('connect_to_bridge', (id, bridgenum) => {
      if (id != uid) return;

      var uri = this.mastersocket.io.uri + '/' + bridgenum;

      log.info('CLIENT connect_to_bridge', id, uri);

      var bridgesocket = this.io(uri, {
        rejectUnauthorized: false // permit self-signed cert
      });

      bridgesocket.once('connected', function () {
        // can be repeated!!!
        log.debug('CLIENT connected', uid);
        bridgesocket.emit('start', uid);
      });

      bridgesocket.once('disconnect', function () {
        log.debug('CLIENT disconnect', uid);
      });

      bridgesocket.once('peer_connected', function () {
        log.debug("peer_connected", uid);

        log.debug("CLIENT trying to get echo...");
        var echotxt = 'hello';
        bridgesocket.emit('echo', echotxt, function (echoed) {
          if (echotxt == echoed) {
            log.debug('CLIENT echo works. bridge successfully established', uid);
            if (onsocket) onsocket(bridgesocket);
          }
        });
      });

      bridgesocket.once('echo', function (txt, cb) {
        cb(txt);
      });
    }); // on connect_to_bridge


    if (peer_uid) {
      log.info('CLIENT requesting bridge', uid, peer_uid);
      this.mastersocket.emit('request_bridge', uid, peer_uid);
    }
  });
};

export default SocketIoBridgeClient;