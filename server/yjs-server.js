import "dotenv/config";
import { WebSocketServer } from "ws";
import pkg from "y-websocket/bin/utils.js";
const { setupWSConnection, setPersistence } = pkg;
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Y = require("yjs");
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
console.log("Connected to MongoDB");

const collection = client.db("syncscript").collection("documents");
const saveTimeouts = {};

setPersistence({
  bindState: async (docName, ydoc) => {
    const saved = await collection.findOne({ docName });
    if (saved && saved.state) {
      const update = new Uint8Array(saved.state.buffer);
      Y.applyUpdate(ydoc, update);
      console.log(`Loaded '${docName}' from MongoDB, ${update.length} bytes`);
    } else {
      console.log(`No saved data for '${docName}' yet`);
    }

    ydoc.on("update", () => {
      clearTimeout(saveTimeouts[docName]);
      saveTimeouts[docName] = setTimeout(async () => {
        const state = Y.encodeStateAsUpdate(ydoc);
        await collection.updateOne(
          { docName },
          { $set: { docName, state: Buffer.from(state) } },
          { upsert: true }
        );
        console.log(`Saved '${docName}' to MongoDB, ${state.length} bytes`);
      }, 1500);
    });
  },
  writeState: async () => {},
});

const wss = new WebSocketServer({ port: 1234 });
wss.on("connection", (ws, req) => {
  setupWSConnection(ws, req);
});

console.log("Yjs WebSocket server running on port 1234");