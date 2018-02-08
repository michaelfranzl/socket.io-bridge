# socket.io-bridge

Client-client events.


On the server (Node.js):

````javascript
const io = require('socket.io');

require('@socket.io-bridge/server')({
  namespace: io.of('/bridge'),
});


````

On Client c1 (browser or Node.js):

````javascript

let bridgeclient = new SocketIoBridgeClient({
  io, // the imported socket.io-client module
  uri: 'https://localhost:50000/bridge'
});

bridgeclient.make({
  uid: 'c1',
  peer_uid: 'c2'
  onsocket: (socket) => {
    socket.on('event1', (arg, cb) => {
      cb(arg); // socket.io callbacks work too
    });
    socket.emit('event2', (arg) => {
      // socket.io callbacks work too
    });
    // etc.
  },
});
````

On Client c2 (browser or Node.js):

````javascript

let bridgeclient = new SocketIoBridgeClient({
  io, // the imported socket.io-client library
  uri: 'https://localhost:50000/bridge'
});

bridgeclient.make({
  uid: 'c2',
  onsocket: (socket) => {
    socket.on('event1', (arg, cb )=> {
      cb(arg); // socket.io callbacks work too
    });
    socket.emit('event2', (arg) => {
      // socket.io callbacks work too
    });
    // etc.
  },
});
````


## Protocol



CLIENT c1                     SERVER                      CLIENT c2
                              /bridge
---------connection----------->  | 
 <-------connected-------------- | 
---------login(c1)------------>  | 
 <------logged_in(c1)----------- | 
----request_bridge(c1,c2)----->  |
                                 |
                                 |  <--------connection-------------
                                 | ---------connected------------->
                                 |  <--------login(c2)--------------
                                 | --------logged_in(c2)---------->
<--- connect_to_bridge(name)---- | ----- connect_to_bridge(name)-->

                                etc.






CLIENT c1                     SERVER               CLIENT c2
                           /bridge/name
---------connection----------->  | 
 <--------connected------------- |
---------start(c1)------------>  |
                                 |
                                 |  <--------connection------------
                                 | ---------connected------------>
                                 |  <--------start(c2)-------------
 <--------peer_connected-------- | ---------peer_connected------->
                                 |
---------echo(txt, cb)-------->  | ---------echo(txt,cb)--------->
 <---------cb(txt)-------------- | -----------cb(txt)------------>
                                 |
 <---------------*---------------|-----------------*------------->