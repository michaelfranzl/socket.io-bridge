# socket.io-bridge-server

Server implementation for socket.io-bridge.

Please find the project documentation at https://github.com/michaelfranzl/socket.io-bridge .

# API Reference

## Functions

<dl>
<dt><a href="#makeBridgeServer">makeBridgeServer(opts)</a></dt>
<dd><p>Adds client-client bridging capability to a Socket.IO namespace.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Namespace">Namespace</a></dt>
<dd></dd>
</dl>

<a name="makeBridgeServer"></a>

## makeBridgeServer(opts)
Adds client-client bridging capability to a Socket.IO namespace.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> |  |
| opts.namespace | [<code>Namespace</code>](#Namespace) |  |
| [opts.logger] | <code>Object</code> | No logging by default |

<a name="Namespace"></a>

## Namespace
**Kind**: global typedef  
**See**: [https://github.com/socketio/socket.io/blob/master/docs/API.md#namespace](https://github.com/socketio/socket.io/blob/master/docs/API.md#namespace)  
