/*jshint esversion: 6 */
var io_server = require('socket.io')(3000);
var io_client = require('socket.io-client');


var log_devnull = {
  info: () => {},
  warn: () => {},
  debug: () => {},
  trace: () => {},
  error: () => {}
};


var server = require('@socket.io-bridge/server')({
  namespace: io_server.of('/bridge'),
  log: log_devnull,
});


var SocketIoBridgeClient = require('../dist/client.js').default;


// ------------------------------------------
let test1 = new Promise((resolve, reject) => {
  let client1 = new SocketIoBridgeClient({
    io: io_client,
    uri: 'http://localhost:3000/bridge'
  });

  client1.make({
    uid: `client1`,
    peer_uid: 'client2',
    log: log_devnull,
    onsocket: (socket) => {
      socket.on('add', (num1, num2, cb) => {
        cb(num1 + num2);
      });
    },
  });


  setTimeout(() => {
    let client2 = new SocketIoBridgeClient({
      io: io_client,
      uri: 'http://localhost:3000/bridge'
    });

    client2.make({
      uid: 'client2',
      log: log_devnull,
      onsocket: (socket) => {
        socket.emit('add', 3, 4, (result) => {
          if (result == 7) {
            console.log('test1 correct');
            resolve();
          } else {
            reject('test1');
          }
          //socket.disconnect();
        });
      },
    });
  }, 800);
});





// ------------------------------------------
let test2 = new Promise((resolve, reject) => {
  let client3 = new SocketIoBridgeClient({
    io: io_client,
    uri: 'http://localhost:3000/bridge'
  });

  setTimeout(() => {
    client3.make({
      uid: `client3`,
      peer_uid: 'client4',
      log: log_devnull,
      onsocket: (socket) => {
        socket.on('add', (num1, num2, cb) => {
          cb(num1 + num2);
        });
      },
    });
  }, 800);

  let client4 = new SocketIoBridgeClient({
    io: io_client,
    uri: 'http://localhost:3000/bridge'
  });

  client4.make({
    uid: 'client4',
    log: log_devnull,
    onsocket: (socket) => {
      socket.emit('add', 7, 6, (result) => {
        if (result == 13) {
          console.log('test2 correct');
          resolve();
        } else {
          reject('test2');
        }
        //socket.disconnect();
      });
    },
  });
});




// ------------------------------------------
let test3 = new Promise((resolve, reject) => {

  let client5 = new SocketIoBridgeClient({
    io: io_client,
    uri: 'http://localhost:3000/bridge'
  });

  let part1 =  new Promise((resolve, reject) => {
    client5.make({
      uid: `bob`,
      peer_uid: 'sue',
      log: log_devnull,
      onsocket: (socket) => {
        socket.emit('hello', 'bob');
        socket.on('hello', (msg) => {
          //socket.disconnect();
          if (msg == 'nice to meet you, bob') {
            console.log('test3 part1 correct');
            resolve();
          } else {
            reject();
          }
        });
      },
    });
  });

  let part2 =  new Promise((resolve, reject) => {
    client5.make({
      uid: `joe`,
      peer_uid: 'jane',
      log: log_devnull,
      onsocket: (socket) => {
        socket.emit('hello', 'joe');
        socket.on('hello', (msg) => {
          //socket.disconnect();
          if (msg == 'nice to meet you, joe') {
            console.log('test3 part2 correct');
            resolve();
          } else {
            reject();
          }
        });
      },
    });
  });


  let client6 = new SocketIoBridgeClient({
    io: io_client,
    uri: 'http://localhost:3000/bridge'
  });

  client6.make({
    uid: 'sue',
    log: log_devnull,
    onsocket: (socket) => {
      socket.on('hello', (name) => {
        socket.emit('hello', `nice to meet you, ${name}`);
      });
    },
  });

  client6.make({
    uid: 'jane',
    log: log_devnull,
    onsocket: (socket) => {
      socket.on('hello', (name) => {
        socket.emit('hello', `nice to meet you, ${name}`);
      });
    },
  });
  
  Promise.all([part1, part2])
  .then(() => {
    resolve();
  })
  .catch((str) => {
    reject('test3');
  });
});





// ------------------------------------------
var timeout = setTimeout(() => {
  console.log('Timeout. Fail.');
  process.exit(2);
}, 3000);

Promise.all([test1, test2, test3])
.then(() => {
  clearTimeout(timeout);
  console.log('All tests passed');
  process.exit(0);
})
.catch((str) => {
  clearTimeout(timeout);
  console.log('test failed', str);
  process.exit(1);
});