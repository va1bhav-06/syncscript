import { Awareness } from "y-protocols/awareness";
import { WebsocketProvider } from "y-websocket";
import { io } from "socket.io-client";
import { useState, useEffect, useRef } from "react";
import * as Y from "yjs";
import "./App.css";
import Navbar from "./Navbar";

const SERVER_URL = "http://localhost:5000";

const adjectives = ["Swift", "Cosmic", "Neon", "Silent", "Brave", "Clever"];
const nouns = ["Falcon", "Pixel", "Panther", "Wizard", "Voyager", "Echo"];

const getUsername = () => {
  const username =
    adjectives[Math.floor(Math.random() * adjectives.length)] +
    nouns[Math.floor(Math.random() * nouns.length)] +
    Math.floor(1000 + Math.random() * 9000);
  return username;
};

// utils/user.js
function generateUserId() {
  return {
    name: getUsername(),
    color:
      "#" +
      Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, "0"),
  };
}

function getOrCreateLocalUser() {
  // const cached = localStorage.getItem("syncscript-user");
  // if (cached) {
  //   return JSON.parse(cached);
  // }

  const user = generateUserId();
  // localStorage.setItem("syncscript-user", JSON.stringify(user));
  return user;
}

function App() {
  const [roomSize, setRoomSize] = useState(1);
  const [status, setStatus] = useState("connecting...");
  const [docText, setDocText] = useState("");
  const [isSynced, setIsSynced] = useState(false);
  const [usersData, setUsersData] = useState([]); // 👈 Added sync flag
  const [remoteCursors, setRemoteCursors] = useState({});

  const socketRef = useRef(null);
  const ydocRef = useRef(null);
  const ytextRef = useRef(null);
  const textareaRef = useRef(null);
  const cursorPosRef = useRef(null);
  const isLocalChangeRef = useRef(false);
  const providerRef = useRef(null);

  useEffect(() => {
    const roomId =
      new URLSearchParams(window.location.search).get("doc") || "default-room";

    // 1. Initialize Yjs
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    //Create awareness instance
    const awareness = new Awareness(ydoc);
    //Attach to provider

    const provider = new WebsocketProvider(
      "ws://localhost:1234",
      roomId,
      ydoc,
      {
        awareness,
      },
    );

    providerRef.current = provider;

    const ytext = ydoc.getText("shared-text");
    ytextRef.current = ytext;

    // 2. WAIT FOR INITIAL SYNC FROM SERVER BEFORE SETTING TEXT!
    provider.on("sync", (isSyncedSuccessfully) => {
      if (isSyncedSuccessfully) {
        console.log("Synced with server! Initial text:", ytext.toString());
        setDocText(ytext.toString());
        setIsSynced(true);
      }
    });

    // 3. Observe changes coming from other clients or late updates
    const handleYtextChange = () => {
      // Only update state if change came from outside or after sync
      const current = ytext.toString();
      setDocText(current);
    };

    ytext.observe(handleYtextChange);

    // 4. Socket.io Setup
    const socket = io(SERVER_URL);

    let user = {};

    socket.on("connect", () => {
      socketRef.current = socket;
      setStatus("connected");
      user = getOrCreateLocalUser();
      socket.emit("join-room", roomId, user, socketRef.current.id);

      socket.emit("get-user", roomId, socketRef.current.id);

      socket.on("change-username", () => {
        user = getOrCreateLocalUser();
        socket.emit("join-room", roomId, user, socketRef.current.id);
      });

      socket.on("update-awareness", (obj) => {
        provider.awareness.setLocalStateField("user", obj);
      });

      awareness.on("change", () => {
        const states = awareness.getStates();
        let usersArr = [];
        for (const [key, value] of states) {
          const socketId = value?.user?.socket_id;
          if (socketId && socketId !== socketRef.current?.id) {
            usersArr.push(value.user);
          }
        }
        setUsersData(usersArr);
        const cursors = {};
        states.forEach((state, clientId) => {
          if (clientId !== awareness.clientID && state.cursor !== undefined) {
            cursors[clientId] = {
              position: state.cursor,
              name: state.user?.username,
              color: state.user?.color,
            };
          }
        });
        setRemoteCursors(cursors);
      });

      socket.on("get-users-list", (listOfUser) => {
        setUsersData(listOfUser);
      });
    });

    socket.on("room-state", (size) => setRoomSize(size));
    socket.on("user-joined", (size) => setRoomSize(size));

    // Cleanup on unmount or refresh
    return () => {
      ydoc.destroy();
      socket.disconnect();
    };
  }, []);

  const updateCursorAwareness = () => {
    if (providerRef.current && textareaRef.current) {
      const pos = textareaRef.current.selectionStart;
      providerRef.current.awareness.setLocalStateField("cursor", pos);
    }
  };

  const handleChange = (e) => {
    if (!ytextRef.current) return;

    cursorPosRef.current = e.target.selectionStart;
    isLocalChangeRef.current = true;

    const newValue = e.target.value;
    const oldValue = ytextRef.current.toString();

    // 1. Find common prefix length
    let commonPrefix = 0;
    while (
      commonPrefix < oldValue.length &&
      commonPrefix < newValue.length &&
      oldValue[commonPrefix] === newValue[commonPrefix]
    ) {
      commonPrefix++;
    }

    // 2. Find common suffix length (ensuring we don't overlap with the prefix)
    let commonSuffix = 0;
    while (
      commonSuffix < oldValue.length - commonPrefix &&
      commonSuffix < newValue.length - commonPrefix &&
      oldValue[oldValue.length - 1 - commonSuffix] ===
        newValue[newValue.length - 1 - commonSuffix]
    ) {
      commonSuffix++;
    }

    // 3. Calculate deletion and insertion lengths
    const deleteCount = oldValue.length - commonPrefix - commonSuffix;
    const insertText = newValue.slice(
      commonPrefix,
      newValue.length - commonSuffix,
    );

    // 4. Apply cleanly inside a single Yjs transaction
    ydocRef.current.transact(() => {
      if (deleteCount > 0) {
        ytextRef.current.delete(commonPrefix, deleteCount);
      }
      if (insertText.length > 0) {
        ytextRef.current.insert(commonPrefix, insertText);
      }
    });
  };

  useEffect(() => {
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
    <div className="container">
      <Navbar usersData={usersData} />
      <p>Status: {status}</p>
      <p>Users in room: {roomSize}</p>

      {!isSynced ? (
        <p>Loading document from MongoDB...</p>
      ) : (
        <>
          <textarea
            placeholder="Enter the text"
            rows="10"
            cols="50"
            ref={textareaRef}
            value={docText}
            onChange={handleChange}
            onClick={updateCursorAwareness}
            onKeyUp={updateCursorAwareness}
          ></textarea>
          <div style={{ marginTop: "8px", fontSize: "13px" }}>
            {Object.entries(remoteCursors).map(([id, cursor]) => (
              <div key={id} style={{ color: cursor.color }}>
                {cursor.name} is at position {cursor.position}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default App;
