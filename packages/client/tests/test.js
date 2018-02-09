/*jshint esversion: 6 */

/*
@socket.io-bridge/client - Real-time bidirectional event-based communication between two socket.io clients.

Copyright 2018 Michael Karl Franzl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


/* ===== TESTS ===== */


var IOserver = require('socket.io')(3000);
var IOclient = require('socket.io-client');

require('colors');

var SocketIoBridgeClient = require('../dist/client.js').default;

var mylog_client, mylog_server;

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


// silent logging
mylog_client = mylog_server = {
  info: () => {},
  warn: () => {},
  debug: () => {},
  trace: () => {},
  error: () => {}
};


var bridge_mastersocket = IOclient('http://localhost:3000/bridge', {
  rejectUnauthorized: false // permit self-signed cert
});


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
          setTimeout(() => {
            socket.emit('add', 3, 4, (result) => {
              if (result == 7) {
                console.log('test1 passed'.magenta);
                resolve();
              } else {
                reject('test1');
              }
              //socket.disconnect();
            });
          }, 100);
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
          setTimeout(() => {
            socket.emit('add', 7, 6, (result) => {
              if (result == 13) {
                console.log('test2 passed'.magenta);
                resolve();
              } else {
                reject('test2');
              }
              //socket.disconnect();
            });
          }, 100);
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
let test3 = () => {
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
        setTimeout(() => {
          socket.emit('hello');
        }, 100);
        client8_socket = socket;
      },
    });
    
    function checkIfDisconnected() {
      if (client8_socket.disconnected == true) {
        console.log('test3 passed'.magenta);
        resolve();
      } else {
        reject('test3');
      }
      resolve();
    }
  });
};



// ------------------------------------------
// Duplicate IDs should return an error
let test4 = () => {
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
        if (err) {
          console.log('test4 passed'.magenta);
          resolve();
        } else {
          reject('test4');
        }
      },
    });
  });
};



// ------------------------------------------
// Duplicate IDs are OK when not used at the same time
let test5 = () => {
  return new Promise((resolve, reject) => {

    function makeTwoClients(cb) {
      client.make({
        uid: `doc`,
        log: mylog_client,
        onresult: (socket, err) => {
          if (err) throw err;
          socket.disconnect();
          setTimeout(() => {
            if (cb) {
              cb();
            } else {
              console.log("test5 passed".magenta);
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
        },
      });
    }
    
    makeTwoClients(makeTwoClients); // twice
  });
};


// ------------------------------------------
var timeout = setTimeout(() => {
  console.log('Timeout. Fail.');
  process.exit(2);
}, 5000);


//test1() // do all tests serially
// .then(() => test2())
// .then(() => test3())
// .then(() => test4())
// .then(() => test4())
Promise.all([test1(), test2(), test3(), test4(), test5()]) // do all tests in parallel
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