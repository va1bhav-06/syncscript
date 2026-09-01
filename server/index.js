// server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { isSymbolObject } from "util/types";

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
  });

  socket.on("join-room", (roomId, user, socket_id) => {
    socket.join(roomId);
    socket.data.roomId = roomId;

    if (!rooms[roomId]) rooms[roomId] = new Set();
    const mySet = rooms[roomId];
    for (const value of mySet) {
      for (const key in value)
        if (value.username == user.name || value.color == user.color)
          socket.emit("change-username");
    }
    const avtar_url = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${user.name}`;
    
    const obj = {
      socket_id,
      username: user.name,
      avtar_url,
      color: user.color
    }
    rooms[roomId].add(obj);

    socket.emit("update-awareness", obj);

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

  // socket.on("get-user", (roomId, socket_id) => {
  //   const roomSet = rooms[roomId];
  //   const listOfUser = Array.from(roomSet)
  //   socket.emit("get-users-list", listOfUser);
  // });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId;
    if (roomId && rooms[roomId]) {
      for (const obj of rooms[roomId]) {
        if (obj.socket_id == socket.id) rooms[roomId].delete(obj);
      }
      socket.to(roomId).emit("user-left", rooms[roomId].size);
    }
    if (rooms[roomId]) if (rooms[roomId].size == 0) delete rooms[roomId];
  });
});

httpServer.listen(5000, () => console.log("Server running on port 5000"));
