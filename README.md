# socket.io-bridge

Real-time bidirectional event-based communication between two socket.io clients (rather than server-client)


## Why?

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
require('@socket.io-bridge/server')({
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
      cb(arg); // socket.io callbacks work too
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
    
    socket.emit('event2', 'hello', () => {
      // client1 confirmed event2
    });
    
    // etc.
  },
});
````

Note:

* The server doesn't need to hard-code event names
* socket.io callbacks (functions as payload) work
* There are no other event listeners except those which are specified by both clients (server passes through everything and has no reserved event names).
* If one client disconnects the socket, the other socket is disconnected too.
* Only one client needs to specify the argument `peer_uid`, the peer does not.
* The `uid` argument must be globally unique. This is a hard requirement. If not, the `err` argument in `onresult` is set and `socket` will be `null`. However, after a client has disconnected, its name can be re-used.



## Connection establishment protocol

This protocol is implemented by `socket.io-bridge/server` and `socket.io-bridge/client`. The user does not need to know about it.

One master namespace on the server (here `/bridge`) serves to negotiate the creation of new private namespaces (in below example `bname`).

````
CLIENT c1                     SERVER                       CLIENT c2
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
After which the clients connect to this new private namespace:

````

CLIENT c1                     SERVER                       CLIENT c2
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

From socket.io-client documentation: "By default, a single connection is used when connecting to different namespaces (to minimize resources)". This means that all newly created namespaces are multiplexed over just one TCP connection.