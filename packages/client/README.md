# socket.io-bridge-client

For more information and usage, see [../../README.md](../../README.md)


ES6 import:

    import BridgeClient from 'socket.io-bridge-client';



Until ES6 imports are widely supported...

... import in Node.js:

    const BridgeClient = require('socket.io-bridge-client/dist/client.js').default;

... import in browsers:

    <script src="socket.io-bridge-client/dist/client.js"></script>
    <script>
      window.addEventListener("load", function() {
        var BridgeClient = window.BridgeClient.default;
      });
    </script>

Run tests:

    npm test

Regenerate distribution files:

    npm install
    jspm install
    gulp build
    
Generate `README.md` with API documentation parsed from jsdoc sources:

    gulp readme

# API Reference

## Functions

<dl>
<dt><a href="#BridgeClient">BridgeClient(opts)</a></dt>
<dd><p>Constructor to instantiate a socket.io-bridge client.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#IO">IO</a></dt>
<dd></dd>
<dt><a href="#Socket">Socket</a></dt>
<dd></dd>
</dl>

<a name="BridgeClient"></a>

## BridgeClient(opts)
Constructor to instantiate a socket.io-bridge client.

**Kind**: global function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| opts | <code>Object</code> |  |  |
| opts.IO | [<code>IO</code>](#IO) |  | The imported socket.io-client module |
| opts.socket | [<code>Socket</code>](#Socket) |  | A socket.io-client socket which is already connected to the [socket.io-bridge/server](../server), e.g. created by `IO('http://localhost:3000/bridge')` |
| [opts.io_opts] | [<code>Socket</code>](#Socket) | <code>{}</code> | Options to pass to `IO` when creating new bridge namespaces. |


* [BridgeClient(opts)](#BridgeClient)
    * _instance_
        * [.make(opts)](#BridgeClient+make)
    * _inner_
        * [~onresult](#BridgeClient..onresult) : <code>function</code>

<a name="BridgeClient+make"></a>

### bridgeClient.make(opts)
Make a bridge.

**Kind**: instance method of [<code>BridgeClient</code>](#BridgeClient)  

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> | Options |
| opts.uid | <code>string</code> | Our unique ID. |
| opts.onresult | [<code>onresult</code>](#BridgeClient..onresult) | Handler of the result of the operation. |
| [opts.peer_uid] | <code>string</code> | The unique ID of the peer we want to establish a connection to. |
| [opts.log] | <code>object</code> | The logger to use. Must support `info()`, `warn()`, `debug()` and `error()` methods. |

<a name="BridgeClient..onresult"></a>

### BridgeClient~onresult : <code>function</code>
Handler function for the result of the call to `make()`.

**Kind**: inner typedef of [<code>BridgeClient</code>](#BridgeClient)  

| Param | Type | Description |
| --- | --- | --- |
| socket | [<code>Socket</code>](#Socket) \| <code>null</code> | The transparent socket to the peer |
| err | <code>Error</code> \| <code>null</code> | If an error occurred |

<a name="IO"></a>

## IO
**Kind**: global typedef  
**See**: [https://github.com/socketio/socket.io-client](https://github.com/socketio/socket.io-client)  
<a name="Socket"></a>

## Socket
**Kind**: global typedef  
**See**: [https://github.com/socketio/socket.io-client/blob/master/docs/API.md#socket](https://github.com/socketio/socket.io-client/blob/master/docs/API.md#socket)  
