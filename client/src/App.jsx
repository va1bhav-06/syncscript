import { io } from 'socket.io-client';
import { useState, useEffect, useRef } from "react";
import "./App.css";

const SERVER_URL = 'http://localhost:5000'

function App() {
  const [roomSize, setRoomSize] = useState(1);
  const [status, setStatus] = useState('connecting...')
  const socketRef = useRef(null)

  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    // 👇 this is where the snippet I showed you goes
    socket.on("connect", () => {
      setStatus("connected")
      const roomId =
        new URLSearchParams(window.location.search).get("doc") ||
        "default-room";
      socket.emit("join-room", roomId);
    });

    socket.on("room-state", (roomSize) => {
      setRoomSize(roomSize);
    });

    socket.on("user-joined", (roomSize) => {
      setRoomSize(roomSize);
    });

    return () => socket.disconnect(); // cleanup — you likely already have this
  }, []);

  return (
    <>
      <p>Status: {status}</p>
      <p>Users in room: {roomSize}</p>
    </>
  );
}

export default App;
