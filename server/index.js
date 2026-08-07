// server.js
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
}); // <--- Socket.IO attached here

const rooms = {};

io.on("connection", (socket) => {
  console.log("✅ Server: Client connected with ID:", socket.id);

  // Listen for a test event from client
  socket.on("ping_server", (data) => {
    console.log("📩 Server received:", data);
    // Send a response back to this client
    socket.emit("pong_client", "Hello back from Server!");
  });

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    socket.data.roomId = roomId;

    if (!rooms[roomId]) rooms[roomId] = new Set();
    rooms[roomId].add(socket.id);

    const roomSize = rooms[roomId].size;
    console.log(roomSize);

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
