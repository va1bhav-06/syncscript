import { io } from 'socket.io-client';
import { useState, useEffect, useRef } from "react";
import "./App.css";

const SERVER_URL = 'http://localhost:5000'

function App() {
  const [roomSize, setRoomSize] = useState(1);
  const [status, setStatus] = useState('connecting...')
  const[docText, changeDocText] = useState("")
  const socketRef = useRef(null)

  const changeText = e => {
    const newValue = e.target.value
    changeDocText(newValue)
    socketRef.current.emit('text-change', newValue)
  }

  
  useEffect(() => {
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on('get-text', text => {
      changeDocText(text)
    })

    socket.on('text-change', docText => {
      changeDocText(docText)
    })

    const roomId =
      new URLSearchParams(window.location.search).get("doc") ||
      "default-room";
    // 👇 this is where the snippet I showed you goes
    socket.on("connect", () => {
      setStatus("connected")
      socket.emit("join-room", roomId);
    });

    socket.on("room-state", (roomSize) => {
      setRoomSize(roomSize);
    });

    socket.on("user-joined", (roomSize) => {
      setRoomSize(roomSize);
    });

    socket.emit('user-joined', roomId);

    return () => socket.disconnect(); // cleanup — you likely already have this
  }, []);
  
  

  return (
    <>
      <p>Status: {status}</p>
      <p>Users in room: {roomSize}</p>
      <textarea placeholder="Enter the text" wrap rows="5" cols="33" value={docText} onChange={changeText}></textarea>
    </>
  );
}

export default App;
