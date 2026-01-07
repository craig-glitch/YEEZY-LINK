import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, onValue, off, set, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyACPz5aLolmlooYyp4ZYz3qH4hQnJxODY0",
  authDomain: "mini-whatsapp-fe8bd.firebaseapp.com",
  databaseURL: "https://mini-whatsapp-fe8bd-default-rtdb.firebaseio.com",
  projectId: "mini-whatsapp-fe8bd",
  storageBucket: "mini-whatsapp-fe8bd.firebasestorage.app",
  messagingSenderId: "177968152040",
  appId: "1:177968152040:web:fc483829f765fb7950f85d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

/* STATE */
let username = null;
let currentPath = null;
let messagesRef = null;
let typingRef = null;
let myUid = "anon_" + Math.floor(Math.random()*10000);

/* DOM */
const messagesDiv = document.getElementById("messages");
const typingDiv = document.getElementById("typing");
const header = document.getElementById("chatHeader");

/* LOGIN */
window.login = () => {
  const input = document.getElementById("usernameInput").value.trim();
  if (!input) return alert("Enter display name");
  username = input;
  document.getElementById("loginDiv").style.display = "none";
};

/* JOIN PUBLIC */
window.joinPublic = async () => {
  if (!username) return alert("Set display name first");
  currentPath = "publicChat";
  header.innerText = "🌍 Public Chat";
  messagesDiv.innerHTML = "";

  // CLEAR ALL messages in public chat
  const messagesRefPublic = ref(db, `${currentPath}/messages`);
  remove(messagesRefPublic);

  attachListeners();
};

/* JOIN PRIVATE */
window.joinPrivate = () => {
  if (!username) return alert("Set display name first");
  const room = document.getElementById("privateRoomInput").value.trim();
  if (!room) return alert("Enter private room number");
  currentPath = `rooms/${room}`;
  header.innerText = `🔒 Private Room ${room}`;
  messagesDiv.innerHTML = "";
  attachListeners();
};

/* LISTENERS */
function cleanupListeners() {
  if (messagesRef) off(messagesRef);
  if (typingRef) off(typingRef);
}

function attachListeners() {
  cleanupListeners();
  if (!currentPath) return;

  messagesRef = ref(db, `${currentPath}/messages`);
  typingRef = ref(db, `${currentPath}/typing`);

  onChildAdded(messagesRef, snap => {
    const m = snap.val();
    displayMessage(m, snap.key);
  });

  onValue(typingRef, snap => {
    const t = snap.val() || {};
    typingDiv.innerText = Object.keys(t).some(u => u !== myUid && t[u]) ? "Someone is typing..." : "";
  });
}

/* DISPLAY MESSAGE */
function displayMessage(m, msgKey) {
  const div = document.createElement("div");
  div.className = "msg " + (m.user === username ? "me" : "other");

  const ts = new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  div.innerHTML = `<b>${m.user}</b><br>${m.text||''}`;
  if (m.imageBase64) div.innerHTML += `<br><img src="${m.imageBase64}">`;
  if (m.videoBase64) div.innerHTML += `<br><video controls src="${m.videoBase64}"></video>`;
  if (m.audioBase64) div.innerHTML += `<br><audio controls src="${m.audioBase64}"></audio>`;
  div.innerHTML += `<small>${ts}</small>`;

  // FIXED reactions
  div.innerHTML += `<div class="reactions">`;
  const reactions = m.reactions || {};
  for (const uid in reactions) {
    if (reactions[uid]) div.innerHTML += `<span>${reactions[uid]}</span>`;
  }
  div.innerHTML += `
    <button class="reaction-btn" onclick="react('${msgKey}','❤️')">❤️</button>
    <button class="reaction-btn" onclick="react('${msgKey}','👍')">👍</button>
    <button class="reaction-btn" onclick="react('${msgKey}','😂')">😂</button>
  </div>`;

  messagesDiv.appendChild(div);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

/* SEND MESSAGE */
window.sendMessage = () => {
  if (!currentPath) return alert("Join a room first");
  const text = document.getElementById("message").value.trim();
  if (!text) return;
  push(ref(db, `${currentPath}/messages`), { user: username, text, reactions:{}, timestamp: Date.now() });
  document.getElementById("message").value = "";
};

/* TYPING */
window.setTyping = () => {
  if (!currentPath) return;
  set(ref(db, `${currentPath}/typing/${myUid}`), true);
  setTimeout(()=>set(ref(db, `${currentPath}/typing/${myUid}`), false), 1000);
};

/* IMAGE / VIDEO */
document.getElementById("imageBtn").onclick = () => document.getElementById("imageInput").click();
window.sendImage = (input) => {
  if (!currentPath || !input.files[0]) return;
  const reader = new FileReader();
  reader.onloadend = ()=>push(ref(db, `${currentPath}/messages`), { user: username, imageBase64: reader.result, reactions:{}, timestamp: Date.now() });
  reader.readAsDataURL(input.files[0]);
};

document.getElementById("videoBtn").onclick = () => document.getElementById("videoInput").click();
window.sendVideo = (input) => {
  if (!currentPath || !input.files[0]) return;
  const reader = new FileReader();
  reader.onloadend = ()=>push(ref(db, `${currentPath}/messages`), { user: username, videoBase64: reader.result, reactions:{}, timestamp: Date.now() });
  reader.readAsDataURL(input.files[0]);
};

/* VOICE NOTES */
let recorder, audioChunks=[];
window.startRecording = async ()=>{
  if(!currentPath) return alert("Join room first");
  const stream = await navigator.mediaDevices.getUserMedia({audio:true});
  recorder = new MediaRecorder(stream);
  audioChunks=[];
  recorder.ondataavailable = e=>audioChunks.push(e.data);
  recorder.onstop = ()=>{
    const blob = new Blob(audioChunks,{type:"audio/webm"});
    const reader = new FileReader();
    reader.onloadend = ()=>push(ref(db,`${currentPath}/messages`),{user:username,audioBase64:reader.result,reactions:{},timestamp:Date.now()});
    reader.readAsDataURL(blob);
  };
  recorder.start();
  setTimeout(()=>recorder.stop(),5000);
};

/* REACTIONS */
window.react = (msgKey, emoji)=>{
  if(!currentPath) return;
  const reactRef = ref(db,`${currentPath}/messages/${msgKey}/reactions/${myUid}`);
  set(reactRef, emoji);
};

/* DARK / LIGHT */
window.toggleTheme = () => document.body.classList.toggle("dark");
