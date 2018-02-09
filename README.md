# socket.io-bridge

Client-client events.


## API

On the server (Node.js):

````javascript
const io = require('socket.io')(3000);

require('@socket.io-bridge/server')({
  namespace: io.of('/bridge'),
});


````


On client c1 (browser or Node.js):


````javascript
let bridgeclient = new SocketIoBridgeClient({
  io, // the imported socket.io-client module
  uri: 'https://localhost:3000/bridge'
});

bridgeclient.make({
  uid: 'c1',      // our unique ID
  peer_uid: 'c2', // the peer's unique ID
  onsocket: (socket) => {
    // Transparent events to/from c2.
    // This is called only once.
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


On client c2 (browser or Node.js). Note that, unlike client c1, `peer_uid` is not set.


````javascript

let bridgeclient = new SocketIoBridgeClient({
  io, // the imported socket.io-client library
  uri: 'https://localhost:3000/bridge'
});

bridgeclient.make({
  uid: 'c2',  // our unique ID
  onsocket: (socket) => {
    // Transparent events to/from whatever peer has requested us.
    // This function may be called several times.
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

This protocol is implemented by `socket.io-bridge/server` and `socket.io-bridge/client`. The user does not need to know about it.

One namespace on the server (here `/bridge`) serves to negotiate the creation of new private namespaces ('bridges', below `bname`).

````
CLIENT c1                     SERVER                       CLIENT c2
                            nsp:/bridge
---------connection----------->  | 
---------login(c1)------------>  | 
 <------logged_in(c1)----------- | 
----request_bridge(c1,c2)----->  |
                                 |
                                 |  <--------connection-------------
                                 |  <--------login(c2)--------------
                                 | --------logged_in(c2)---------->
<--- connect_to_bridge(bname)--- | -----connect_to_bridge(bname)-->

                                etc.
````




````
CLIENT c1                     SERVER                       CLIENT c2
                          nsp:/bridge/name
---------connection----------->  | 
---------start(c1)------------>  |
                                 |
                                 |  <--------connection------------
                                 |  <--------start(c2)-------------
 <--------peer_connected-------- | ---------peer_connected------->
                                 |
---------echo(txt, cb)-------->  | ---------echo(txt,cb)--------->
 <---------cb(txt)-------------- |  <----------cb(txt)-------------
onresult(socket)                 |
                                 |
 <--------echo(txt, cb)--------- |  <--------echo(txt,cb)----------
-----------cb(txt)------------>  | -----------cb(txt)------------>
                                                     onresult(socket)

 <---------------*---------------|-----------------*------------->
````