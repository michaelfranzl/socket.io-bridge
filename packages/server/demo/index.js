import http from 'http';

import SocketIoServer from 'socket.io';
import makeBridgeServer from '../src/server.js';

const serverPort = 3003;
const bridgePath = 'bridges';

const server = http.createServer().listen(serverPort);
const socketIoServer = SocketIoServer(server);
const namespace = socketIoServer.of(`/${bridgePath}`);

makeBridgeServer({ namespace, logger: console });
