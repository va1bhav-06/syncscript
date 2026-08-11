import { WebSocketServer } from "ws";
import pkg from "y-websocket/bin/utils.js";
const { setupWSConnection } = pkg;

const wss = new WebSocketServer({ port: 1234 });

wss.on("connection", (ws, req) => {
  setupWSConnection(ws, req);
});

console.log("Yjs sync server listening on port 1234");
