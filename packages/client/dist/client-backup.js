/*jshint esversion: 6 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.SocketIoBridgeClient = global.SocketIoBridgeClient || {})));
}(this, (function (exports) { 'use strict';

/*jshint esversion: 6 */

function SocketIoBridgeClient() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      io = _ref.io,
      uri = _ref.uri;

  this.io = io;
  this.uri = uri;

  this.mastersocket = io(uri, {
    rejectUnauthorized: false // permit self-signed cert
  });
}

SocketIoBridgeClient.prototype.make = function () {
  var _this = this;

  var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      uid = _ref2.uid,
      peer_uid = _ref2.peer_uid,
      onsocket = _ref2.onsocket,
      _ref2$log = _ref2.log,
      log = _ref2$log === undefined ? console : _ref2$log;

  log.debug('logging in with uid ' + uid + ' to ' + this.uri);
  this.mastersocket.emit('login', uid);

  new Promise(function (resolve, reject) {
    _this.mastersocket.on('logged_in', function (id) {
      if (id != uid) return; // not for us
      log.debug('logged in OK');
      resolve();
    });
  }).then(function () {
    _this.mastersocket.on('connect_to_bridge', function (id, bridgenum) {

      if (id != uid) return;

      var uri = _this.mastersocket.io.uri + '/' + bridgenum;

      log.info('connect_to_bridge', id, uri);

      var bridgesocket = _this.io(uri, {
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
            if (cb) cb(bridgesocket);
          }
        });
      });

      bridgesocket.once('echo', function (txt, cb) {
        cb(txt);
      });
    }); // on connect_to_bridge


    if (peer_uid) {
      log.info('requesting bridge', uid, peer_uid);
      _this.mastersocket.emit('request_bridge', uid, peer_uid);
    }
  });
};

exports['default'] = SocketIoBridgeClient;

Object.defineProperty(exports, '__esModule', { value: true });

})));

//# sourceMappingURL=client.js.map