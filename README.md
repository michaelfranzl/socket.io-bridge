# socket.io-bridge

Real-time bidirectional event-based communication between two [socket.io](https://github.com/socketio) clients (rather than server-client).

Normally, to route an event from one client to the other, one has to do:

Client 1:

````javascript
socket.emit('event1');
````

Server:

````javascript
clientsocket1.on('event1', () => {
  clientsocket2.emit('event1');
});
````

Client 2:

````javascript
socket.on('event1', () => {
  console.log('client 1 called event1')
});
````

Note that the server has to have hard-coded event names.


With socket.io-bridge, the same can be accomplished like this:


On the server (Node.js):

````javascript
require('socket.io-bridge-server')({
  namespace: io.of('/bridge'),
});

````


On client 1 (browser or Node.js):


````javascript
bridge.make({
  uid: 'client1',      // our unique ID
  peer_uid: 'client2', // the peer's unique ID
  onresult: (socket, err) => {
    if (err) raise err;
    
    socket.emit('event1');
    
    socket.on('event2', (txt, cb) => {
      cb(txt); // socket.io callbacks work too
    });
    
    // etc.
  },
});
````

On client c2 (browser or Node.js):


````javascript
bridge.make({
  uid: 'client2',  // our unique ID
  onresult: (socket, err) => {
    if (err) raise err;
  
    socket.on('event1', () => {
      // client1 called event1
    });
    
    socket.emit('event2', 'hello', (txt) => {
      // client1 confirmed event2 (this implements an echo)
    });
    
    // etc.
  },
});
````

Note:

* The server doesn't need to hard-code event names.
* socket.io callbacks (functions as payload) work.
* There are no other event listeners except those which are specified by both clients (server passes through everything and has no reserved event names).
* If one client disconnects the socket, the other socket will be disconnected too.
* Only one client needs to specify the argument `peer_uid`, the other peer does not.
* The `uid` argument must be globally unique. This is a hard requirement. If not, the `err` argument in `onresult` is set and `socket` will be `null`. However, after a client has disconnected, its name can be re-used.
* Both clients can connect at different times (earlier or later than the other). Only as soon as the requested client, identified by `peer_id`, connects, the `onresult()` callback delivers the peer sockets on both clients.
* An arbitrary number of client-client bridges can be created in this way by calling `make()` as many times as needed.
* This method only supports client-client connections (no broadcasts or multicasts).


The [test file](packages/client/tests/test.js) provides working examples. Run the tests with `npm test` in the directory `packages/client`.


## Connection establishment protocol

This protocol is implemented by the packages `socket.io-bridge-server` and `socket.io-bridge-client`. The user does not need to know about it, it's working behind the scenes.

One master namespace on the server (here called `/bridge`) is used to negotiate the creation of new private namespaces (in below example called `bname`).

````
CLIENT c1                     SERVER                      CLIENT c2
                            nsp:/bridge
---------connection----------->  | 
-----------login-------------->  | 
 <--------logged_in------------- | 
-----request_bridge(c2)------->  |
                                 |
                                 |  <--------connection-------------
                                 |  <----------login----------------
                                 | ----------logged_in------------>
<--- connect_to_bridge(bname)--- | -----connect_to_bridge(bname)-->

````
... after which the clients connect to this new private namespace:

````

CLIENT c1                     SERVER                      CLIENT c2
                         nsp:/bridge/bname
---------connection----------->  | 
-----------start-------------->  |
                                 |
                                 |  <--------connection------------
                                 |  <----------start---------------
 <--------peer_connected-------- | ---------peer_connected------->
                                 |
--------------echo------------>  | --------------echo------------>
 <--------------echo------------ |  <-------------echo------------
                                 |
 <-------------echo------------- |  <--------------echo-----------
--------------echo------------>  | --------------echo------------->
````
After an echo test succeeds in both directions, all server-side and client-side event listeners are removed, and what remains is a transparent 'pipe' between the two clients, where the server forwards everything without discrimination:

````
 <---------------*---------------|-----------------*------------->
````

From socket.io-client documentation: *"By default, a single connection is used when connecting to different namespaces (to minimize resources)".* This means that all newly created namespaces are multiplexed over just one TCP connection.


# License

socket.io-bridge - Real-time bidirectional event-based communication between two socket.io clients.

Copyright 2018 Michael Karl Franzl

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.