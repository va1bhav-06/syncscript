import { io } from "socket.io-client";
import { useState, useEffect, useRef } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import "./App.css";

const SERVER_URL = "localhost:5000";

function App() {
  const [roomSize, setRoomSize] = useState(1);
  const [status, setStatus] = useState("connecting...");
  const [docText, setDocText] = useState("");
  const socketRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const textareaRef = useRef(null);
  const cursorPosRef = useRef(null);
  const isLocalChangeRef = useRef(false);

  useEffect(() => {
    const roomId =
      new URLSearchParams(window.location.search).get("doc") || "default-room";

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider("ws://localhost:1234", roomId, ydoc);

    const ytext = ydoc.getText("shared-text");
    ytextRef.current = ytext;

    setDocText(ytext.toString());

    ytext.observe(() => {
      setDocText(ytext.toString());
    });

    const socket = io(SERVER_URL);
    socketRef.current = socket;

    // 👇 this is where the snippet I showed you goes
    socket.on("connect", () => {
      setStatus("connected");
      socket.emit("join-room", roomId);
    });

    socket.on("room-state", (roomSize) => {
      setRoomSize(roomSize);
    });

    socket.on("user-joined", (roomSize) => {
      setRoomSize(roomSize);
    });

    socket.emit("user-joined", roomId);

    return () => {
      provider.destroy();
      socket.disconnect();
    }; // cleanup — you likely already have this
  }, []);

  const handleChange = (e) => {
    cursorPosRef.current = e.target.selectionStart;
    isLocalChangeRef.current = true;

    const newValue = e.target.value;
    const oldValue = ytextRef.current.toString();

    // Find where the change starts (first differing character from the left)
    let start = 0;
    while (
      start < oldValue.length &&
      start < newValue.length &&
      oldValue[start] === newValue[start]
    ) {
      start++;
    }

    // Find where the change ends (first differing character from the right)
    let oldEnd = oldValue.length;
    let newEnd = newValue.length;
    while (
      oldEnd > start &&
      newEnd > start &&
      oldValue[oldEnd - 1] === newValue[newEnd - 1]
    ) {
      oldEnd--;
      newEnd--;
    }

    // Apply only the actual change: delete the differing chunk, insert the new chunk
    ytextRef.current.delete(start, oldEnd - start);
    ytextRef.current.insert(start, newValue.slice(start, newEnd));
  };

  useEffect(() => {
    console.log("restoring cursor to:", cursorPosRef.current);
    if (
      isLocalChangeRef.current &&
      textareaRef.current &&
      cursorPosRef.current !== null
    ) {
      textareaRef.current.selectionStart = cursorPosRef.current;
      textareaRef.current.selectionEnd = cursorPosRef.current;
    }
    isLocalChangeRef.current = false;
  }, [docText]);

  return (
    <>
      <p>Status: {status}</p>
      <p>Users in room: {roomSize}</p>
      <textarea
        placeholder="Enter the text"
        wrap
        rows="5"
        cols="33"
        ref={textareaRef}
        value={docText}
        onChange={handleChange}
      ></textarea>
    </>
  );
}

export default App;
