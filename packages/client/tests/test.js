/*jshint esversion: 6 */
var IOserver = require('socket.io')(3000);
var IOclient = require('socket.io-client');

require('colors');

var SocketIoBridgeClient = require('../dist/client.js').default;

var mylog_client, mylog_server;

mylog_client = mylog_server = {
  info: () => {},
  warn: () => {},
  debug: () => {},
  trace: () => {},
  error: () => {}
};

mylog_server = {
  info: (...args) => {console.log('SERVER'.blue, '[INFO]'.green, ...args);},
  warn: (...args) => {console.log('SERVER'.blue, '[WARN]'.yellow, ...args);},
  debug: (...args) => {console.log('SERVER'.blue, '[DEBUG]'.gray, ...args);},
  trace: (...args) => {console.log('SERVER'.blue, '[TRACE]'.purple, ...args);},
  error: (...args) => {console.log('SERVER'.blue, '[ERROR]'.red, ...args);},
};


mylog_client = {
  info: (...args) => {console.log('CLIENT'.cyan, '[INFO]'.green, ...args);},
  warn: (...args) => {console.log('CLIENT'.cyan, '[WARN]'.yellow, ...args);},
  debug: (...args) => {console.log('CLIENT'.cyan, '[DEBUG]'.gray, ...args);},
  trace: (...args) => {console.log('CLIENT'.cyan, '[TRACE]'.purple, ...args);},
  error: (...args) => {console.log('CLIENT'.cyan, '[ERROR]'.red, ...args);},
};


var io_opts = {
  rejectUnauthorized: false // permit self-signed cert
};

var bridge_mastersocket = IOclient('http://localhost:3000/bridge', io_opts);



var client = new SocketIoBridgeClient({
  socket: bridge_mastersocket,
  IO: IOclient,
});


var server = require('@socket.io-bridge/server')({
  namespace: IOserver.of('/bridge'),
  log: mylog_server,
});





// ------------------------------------------
// Client 2 comes late. Client 1 does math.
let test1 = () => {
  return new Promise((resolve, reject) => {
    client.make({
      uid: `client1`,
      peer_uid: 'client2',
      log: mylog_client,
      onresult: (socket, err) => {
        if (err) throw err;
        socket.on('add', (num1, num2, cb) => {
          cb(num1 + num2);
        });
      },
    });


    setTimeout(() => {
      client.make({
        uid: 'client2',
        log: mylog_client,
        onresult: (socket, err) => {
          if (err) throw err;
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
};





// ------------------------------------------
// Client4 comes late. Client4 does math.
let test2 = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      client.make({
        uid: `client3`,
        peer_uid: 'client4',
        log: mylog_client,
        onresult: (socket, err) => {
          if (err) throw err;
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
    }, 800);

    client.make({
      uid: 'client4',
      log: mylog_client,
      onresult: (socket, err) => {
        if (err) throw err;
        socket.on('add', (num1, num2, cb) => {
          cb(num1 + num2);
        });
      },
    });
  });
};







// ------------------------------------------
// If one peer socket is disconnected, it should disconnect the other socket too.
let test4 = () => {
  return new Promise((resolve, reject) => {

    client.make({
      uid: `client7`,
      peer_uid: 'client8',
      log: mylog_client,
      onresult: (socket, err) => {
        if (err) throw err;
        socket.on('hello', () => {
          socket.disconnect();
          // this should disconnect the other socket too.
          setTimeout(checkIfDisconnected, 200);
        });
      },
    });

    let client8_socket;

    client.make({
      uid: 'client8',
      log: mylog_client,
      onresult: (socket, err) => {
        if (err) throw err;
        socket.emit('hello');
        client8_socket = socket;
      },
    });
    
    function checkIfDisconnected() {
      if (client8_socket.disconnected == true) {
        console.log('test4 correct');
        resolve();
      } else {
        reject('test4');
      }
      resolve();
    }
  });
};



// ------------------------------------------
// Duplicate IDs should return an error
let test5 = () => {
  return new Promise((resolve, reject) => {
    client.make({
      uid: `duplicate!`,
      log: mylog_client,
      onresult: (socket, err) => {
        if (err) throw err;
      },
    });
    
    client.make({
      uid: `duplicate!`,
      log: mylog_client,
      onresult: (socket, err) => {
        if (err) throw err;
        if (err) {
          console.log('test5 correct');
          resolve();
        } else {
          reject('test5');
        }
      },
    });
  });
};



/*

// ------------------------------------------
// Duplicate IDs are OK when not used at the same time
let test6 = new Promise((resolve, reject) => {

  function makeTwoClients(cb=null) {

    
    client.make({
      uid: `doc`,
      log: mylog_client,
      onresult: (socket, err) => {
        if (err) throw err;
        console.log('doc connected');
        socket.disconnect();
        setTimeout(() => {
          if (cb) {
            console.log("CALLBACK");
            cb();
          } else {
            resolve();
          }
        }, 1000);
      },
    });
    
    client.make({
      uid: `marty`,
      peer_uid: 'doc',
      log: mylog_client,
      onresult: (socket, err) => {
        if (err) throw err;
        console.log('marty connected');
        socket.on('disconnect', () => {
          console.log('marty disconnected');
        });
      },
    });
  }
  makeTwoClients(makeTwoClients);
  
});
*/


// ------------------------------------------
var timeout = setTimeout(() => {
  console.log('Timeout. Fail.');
  process.exit(2);
}, 4000);


// test1(), test2(), test4(),
Promise.all([test5()])
//Promise.all([test6])
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