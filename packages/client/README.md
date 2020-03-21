# socket.io-bridge-client

Client implementation for socket.io-bridge.

Please find the project documentation at https://github.com/michaelfranzl/socket.io-bridge .

# API Reference

## Classes

<dl>
<dt><a href="#BridgeClient">BridgeClient</a></dt>
<dd></dd>
</dl>

## Typedefs

<dl>
<dt><a href="#Socket">Socket</a></dt>
<dd></dd>
</dl>

<a name="BridgeClient"></a>

## BridgeClient
**Kind**: global class  

* [BridgeClient](#BridgeClient)
    * [new BridgeClient(opts)](#new_BridgeClient_new)
    * _static_
        * [.make(opts)](#BridgeClient.make) ⇒ <code>Promise</code>
    * _inner_
        * [~onconnection](#BridgeClient..onconnection) : <code>function</code>

<a name="new_BridgeClient_new"></a>

### new BridgeClient(opts)

| Param | Type |
| --- | --- |
| opts | <code>Object</code> | 
| opts.socket | [<code>Socket</code>](#Socket) | 

<a name="BridgeClient.make"></a>

### BridgeClient.make(opts) ⇒ <code>Promise</code>
Make a Socket.IO bridge to another client.

**Kind**: static method of [<code>BridgeClient</code>](#BridgeClient)  
**Returns**: <code>Promise</code> - - Promise resolving with a Socket.IO client socket connecting to the
requested peer/client. The Promise can be used only for a single connection, e.g. when `peerUid`
is set and there will be no incoming connections.  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| opts | <code>Object</code> |  |  |
| [opts.uid] | <code>string</code> | <code>&quot;globally unique&quot;</code> | Our ID. |
| [opts.peerUid] | <code>string</code> |  | The ID of the peer we want to establish a connection to. |
| [opts.onconnection] | [<code>onconnection</code>](#BridgeClient..onconnection) |  | Called for each incoming connection. |
| [opts.logger] | <code>object</code> |  | No logging by default |

<a name="BridgeClient..onconnection"></a>

### BridgeClient~onconnection : <code>function</code>
Called as soon as the peer identified by peerUid is available for a connection.

**Kind**: inner typedef of [<code>BridgeClient</code>](#BridgeClient)  

| Param | Type | Description |
| --- | --- | --- |
| socket | [<code>Socket</code>](#Socket) | Socket.IO client socket connecting to the requested peer/client. |

<a name="Socket"></a>

## Socket
**Kind**: global typedef  
**See**: [https://github.com/socketio/socket.io-client/blob/master/docs/API.md#socket](https://github.com/socketio/socket.io-client/blob/master/docs/API.md#socket)  
