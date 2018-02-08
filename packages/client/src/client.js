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
  log = console
} = {}) {
  
  log.debug('logging in with uid ' + uid + ' to ' + this.uri);
  
  this.mastersocket.emit('login', uid);
  
  new Promise((resolve, reject) => {
    
    this.mastersocket.on('logged_in', (id) => {
      if (id != uid) return; // not for us
      log.debug('logged in OK');
      resolve();
    });
    
  })
  .then(() => {
    this.mastersocket.on('connect_to_bridge', (id, bridgenum) => {
      if (id != uid) return;

      var uri = this.mastersocket.io.uri + '/' + bridgenum;

      log.info('connect_to_bridge', id, uri);

      var bridgesocket = this.io(uri, {
        rejectUnauthorized: false // permit self-signed cert
      });

      bridgesocket.on('connected', function () {
        // can be repeated!!!
        log.debug('connected');
        bridgesocket.emit('start', uid);
      });

      bridgesocket.on('disconnect', function () {
        log.debug('disconnect');
      });

      bridgesocket.on('peer_connected', function () {
        log.debug("peer_connected");

        log.debug("trying to get echo...");
        var echotxt = 'hello';
        bridgesocket.emit('echo', echotxt, function (echoed) {
          if (echotxt == echoed) {
            log.debug('echo works. bridge successfully established');
            if (onsocket) onsocket(bridgesocket);
          }
        });
      });

      bridgesocket.once('echo', function (txt, cb) {
        cb(txt);
      });
    }); // on connect_to_bridge


    if (peer_uid) {
      log.info('requesting bridge', uid, peer_uid);
      this.mastersocket.emit('request_bridge', uid, peer_uid);
    }
  });
};

export default SocketIoBridgeClient;