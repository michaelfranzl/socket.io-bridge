# socket.io-bridge

Real-time, bidirectional, event-based communication between two [Socket.IO](https://github.com/socketio) clients.

There are no dependencies on message queue or pub/sub servers. The Node.js server creates client-client 'bridges' (private namespaces used by two clients) using just Socket.IO.

![Test](https://github.com/michaelfranzl/socket.io-bridge/workflows/Test/badge.svg)

## Features

* Client library works with Node.js and browsers
* Works through firewalls and with NAT (because clients connect to the server)
* Addressing using self-assigned string IDs (locally unique, communicated via some other channel)
* Real-time peer connection and disconnection notification
* Private namespaces ('bridges') have random names
* The server is transparent to event names; clients can emit any signal (using `.emit` and `.on`) without the need to change the server
* Promise and/or callback-based peer connection notification
* Connection multiplexing over just one TCP connection (this is a Socket.IO feature)

## Example

See a working demo at [packages/client/demo](packages/client/demo).

Without socket.io-bridge, with only plain Socket.IO, to route an event from one client to another client, one has to do:

Client 1:

```javascript
socket.emit('event');
```

Server:

```javascript
client1.on('event', () => client2.emit('event'));
```

Client 2:

```javascript
socket.on('event', () => console.log('event'));
```

Disadvantages in this approach:

* Three separate implementations are tighly coupled (server, client1, client2)
* client1 does not know if client2 is currently connected to the server
* client1 does not know when client2 disconnects
* client1 does not know *who* client2 is

These issues can be solved using the present library, and are illustrated below.

On the backend (assuming a server at `http://localhost:3000`), adding the client-client briging behavior to an already existing Socket.IO server just requires one additional line:

```javascript
import http from 'http';
import SocketIoServer from 'socket.io';
import makeBridgeServer from 'socket.io-bridge-server';

const server = http.createServer().listen(3000);
const socketIoServer = SocketIoServer(server);
const namespace = socketIoServer.of('/bridge');

makeBridgeServer({ namespace }); // <-- that's it
```

On client "Alice" (running in a browser or in Node.js):

```javascript
import SocketIoClient from 'socket.io-client';

// setup
const socket = SocketIoClient('http://localhost:3000/bridge');
const bridgeClient = new SocketIoBridgeClient({ socket });

// usage
bridgeClient
  .make({ id: 'Alice', peerId: 'Bob' }) // We are "Alice", and we want to talk to "Bob".
  .then((peer) => { // Bob is now connected. `peer` is a regular Socket.IO client socket.
    // Application-specific implementation.
    peer.emit('hello');
    peer.on('concatenate two words', (txt1, txt2) => callback(`${txt1} ${txt2}!`));
  });
```

On client "Bob" (running in a browser or in Node.js):

```javascript
import SocketIoClient from 'socket.io-client';

// setup
const socket = SocketIoClient('http://localhost:3000/bridge');
const bridgeClient = new SocketIoBridgeClient({ socket });

// usage
bridgeClient.make({
  // We are "Bob". We don't want to talk to anybody specific, but others may want to talk to us.
  id: 'Bob',
  onconnection: (peer) => {
    console.log('someone connected to us');
    socket.on('hello', () => { console.log('someone said hello') });

    socket.emit('concatenate two words', 'Hello', 'world', (answer) => {
      console.log(answer); // This prints "Hello world!" if the peer implements this event.
    });
  },
});
```

Advantages of this approach:

* Only the client implementations are coupled, the server is decoupled.
* There are no event listeners on all the used sockets except those set by the clients themselves.
* Socket.IO callbacks work (i.e. functions as payload).
* If one client disconnects, the other socket will be disconnected too.
* Only one client needs to provide the argument `peerId`, the other peer does not. The peer who is
    not providing `peerId` expects that other peers connect to it (it is loosely equivalent to a
    'server').
* The order in which the clients connect to the server does not matter.
* Two mechanisms are provided for when a peer connects, which can be used interchangeably: a
    Promise, and a callback function `onconnection`. Note that a Promise can resolve only once. For
    multiple connections to one peer, you can only use the callback on this peer.
* For one connection to the server, an arbitrary number of client-client connections can be
    established (by calling `make` repeatedly).
* Because Socket.IO connections are multiplexed over just one TCP connection, even multiple connections between two endpoints established in such a way are multiplexed too.


## Connection establishment protocol

This custom protocol is implemented by the packages `socket.io-bridge-server` and `socket.io-bridge-client`. The user does not need to know about it, it's working behind the scenes and ends when the `onconnection` callback is called, or when the connection promise resolves.

In the example below, client "c1" wants to connect to client "c2".

One namespace on the server (under the path `/bridge`) is used to negotiate the creation of new private sub-namespaces (in the example below called `nname`)

```
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
<--- connect_to_bridge(nname)--- | -----connect_to_bridge(nname)-->

```

Both clients will receive the `connect_to_bridge` event at the same time (disregarding network delays) and will connect to the new namespace, the name of which is known only to the clients:


```

CLIENT c1                     SERVER                      CLIENT c2
                         nsp:/bridge/nname
---------connection----------->  |
-----------start-------------->  |
                                 |
                                 |  <--------connection------------
                                 |  <----------start---------------
 <--------peer_connected-------- | ---------peer_connected------->
```

At this point, the server removes all event listeners from the sockets, and the clients perform an echo test to test connectivity without the active participation of the server:

```
CLIENT c1                     SERVER                      CLIENT c2
                         nsp:/bridge/nname
                                 |
--------------echo------------>  | --------------echo------------>
 <--------------echo------------ |  <-------------echo------------
                                 |
 <-------------echo------------- |  <--------------echo-----------
--------------echo------------>  | --------------echo------------->
```

After this succeeds, the clients remove the `echo` event listener from the sockets, which now are a 'transparent pipe' to the other peer, and pass them to the user code using a resolving promise and the `onconnection` callback.


# Development and testing

The [test file](packages/client/tests/test.js) is also a documentation on various use cases.

Run the tests:

```sh
npm test
```

To use the debugger during testing, run:

```sh
npm test -- --inspect
```
