// server.js
import express from "express";
import {createServer} from "http";
import {Server} from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
}); // <--- Socket.IO attached here

const rooms = {};
const documents = new Map();

io.on("connection", (socket) => {
  console.log("✅ Server: Client connected with ID:", socket.id);

  // Listen for a test event from client
  socket.on("ping_server", (data) => {
    console.log("📩 Server received:", data);
    // Send a response back to this client
    socket.emit("pong_client", "Hello back from Server!");
  });

  socket.on("text-change", (docText) => {
    documents.set(socket.data.roomId, docText);
    socket.to(socket.data.roomId).emit("text-change", docText);
    console.log(documents);
  });

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.data.roomId = roomId;

    if (!rooms[roomId]) rooms[roomId] = new Set();
    rooms[roomId].add(socket.id);

    if (documents.get(socket.data.roomId) == undefined) {
      documents.set(socket.data.roomId, "");
      socket.emit("get-text", "");
    } else {
      socket.emit("get-text", documents.get(socket.data.roomId));
    }

    const roomSize = rooms[roomId].size;

    socket.emit("room-state", roomSize); // back to just this user
    socket.to(roomId).emit("user-joined", roomSize); // to everyone else in the room
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (roomId && rooms[roomId]) {
      rooms[roomId].delete(socket.id);
      socket.to(roomId).emit("user-left", rooms[roomId].size);
    }
  });
});

httpServer.listen(5000, () => console.log("Server running on port 5000"));
