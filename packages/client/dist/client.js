(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.SocketIoBridgeClient = global.SocketIoBridgeClient || {})));
}(this, (function (exports) { 'use strict';

/*jshint esversion: 6 */

function SocketIoBridgeClient(_ref) {
  var io = _ref.io,
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
      log = _ref2$log === undefined ? {
    info: console.info,
    warn: console.warn,
    debug: console.log,
    error: console.error
  } : _ref2$log;

  log.info('make()');

  this.mastersocket.emit('login', uid);

  new Promise(function (resolve, reject) {

    _this.mastersocket.on('logged_in', function (id) {
      if (id != uid) return; // called as many times as make() was called, but with different ids
      log.debug('CLIENT logged_in', id);
      resolve();
    });
  }).then(function () {
    _this.mastersocket.on('connect_to_bridge', function (id, bridgenum) {
      if (id != uid) return;

      var uri = _this.mastersocket.io.uri + '/' + bridgenum;

      log.info('CLIENT connect_to_bridge', id, uri);

      var bridgesocket = _this.io(uri, {
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
      _this.mastersocket.emit('request_bridge', uid, peer_uid);
    }
  });
};

exports['default'] = SocketIoBridgeClient;

Object.defineProperty(exports, '__esModule', { value: true });

})));

//# sourceMappingURL=client.js.map