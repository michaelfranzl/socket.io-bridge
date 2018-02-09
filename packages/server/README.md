# socket.io-bridge/server

For more information and usage, see [../../README.md](../../README.md)

# API Reference

## Functions

<dl>
<dt><a href="#BridgeServer">BridgeServer(opts)</a></dt>
<dd><p>Run a socket.io-bridge server.</p>
<p>Do not instantiate.</p>
</dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Namespace">Namespace</a></dt>
<dd></dd>
</dl>

<a name="BridgeServer"></a>

## BridgeServer(opts)
Run a socket.io-bridge server.

Do not instantiate.

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| opts | <code>Object</code> |  |
| opts.namespace | [<code>Namespace</code>](#Namespace) | For example: `require('socket.io')(3000).of('/bridge');` |
| [opts.log] | <code>Object</code> | The logger to use. Must support `info()`, `warn()`, `debug()` and `error()` methods. |

<a name="Namespace"></a>

## Namespace
**Kind**: global typedef  
**See**: [https://github.com/socketio/socket.io/blob/master/docs/API.md#namespace](https://github.com/socketio/socket.io/blob/master/docs/API.md#namespace)  
