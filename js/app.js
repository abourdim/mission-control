// Kid Telepresence (simple, single-page, no roles)
// How it works:
// - Both devices open the same page and enter the same room code
// - One device becomes "host" automatically (first to claim <room>-host ID)
// - The other becomes "guest" and calls the host
// - Both send+receive audio/video in a single PeerJS call

const $ = (id) => document.getElementById(id);

const roomInput = $("roomInput");
const startBtn = $("startBtn");
const muteMicBtn = $("muteMicBtn");
const switchCamBtn = $("switchCamBtn");
const flipBtn = $("flipBtn");
const flipRemoteBtn = $("flipRemoteBtn");
const connectBtn = $("connectBtn");
const hangupBtn = $("hangupBtn");
const localVideo = $("localVideo");
const remoteVideo = $("remoteVideo");
const videoStage = $("videoStage");
const remoteFsBtn = $("remoteFsBtn");
const askRemoteFsBtn = $("askRemoteFsBtn");
const cleanCacheBtn = $("cleanCacheBtn");
const remoteFsOverlay = $("remoteFsOverlay");
const remoteFsAcceptBtn = $("remoteFsAcceptBtn");
const remoteFsDenyBtn = $("remoteFsDenyBtn");
const statusPill = $("status");
const connPill = $("connPill");
const logEl = $("log");
const clearLogsBtn = $("clearLogsBtn");

const textInput = $("textInput");
const sendTextBtn = $("sendTextBtn");

// micro:bit Live Link UI
const mbStatus = $("mbStatus");
const mbConnectBtn = $("mbConnectBtn");
const mbDisconnectBtn = $("mbDisconnectBtn");
const mbSendTestBtn = $("mbSendTestBtn");
const mbBridgeOnBtn = $("mbBridgeOnBtn");
const mbBridgeOffBtn = $("mbBridgeOffBtn");
const mbMuteMbBtn = $("mbMuteMbBtn");

// Disable controls until data channel is open
function enableControls(on){
  const disabled = !on;
  document.querySelectorAll('[data-dir], [data-btn]').forEach(b => {
    b.disabled = disabled;
    b.classList.toggle('disabled', disabled);
  });
  // Text + TTS helpers
  if (sendTextBtn) sendTextBtn.disabled = disabled;
  if (textInput) textInput.disabled = disabled;

  // Remote speak should only be available when the data channel is open
  const remoteSpeakBtn = document.getElementById("remoteSpeakBtn");
  if (remoteSpeakBtn) remoteSpeakBtn.disabled = disabled;
}

enableControls(false);

// Keep "Connect" actions in a sensible state
function setRoomUiConnected(connected){
  if (connectBtn) connectBtn.disabled = !!connected;
  if (roomInput) roomInput.disabled = !!connected;
  // Hangup is meaningful while a call exists even if the data channel drops
  if (hangupBtn) hangupBtn.style.display = (connected || !!call) ? "" : "none";
}

// ---- Remote fullscreen ----
function updateFsButton(){
  if (!remoteFsBtn) return;
  const inFs = !!document.fullscreenElement;
  remoteFsBtn.innerHTML = inFs
    ? '<span class="btn-icon">⛶</span> Exit fullscreen'
    : '<span class="btn-icon">⛶</span> Remote fullscreen';
}

async function toggleRemoteFullscreen(){
  if (!videoStage) return;
  try{
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await videoStage.requestFullscreen();
    }
  } catch (e){
    log("Fullscreen failed:", e?.message || String(e));
  }
  updateFsButton();
}

remoteFsBtn?.addEventListener("click", toggleRemoteFullscreen);
document.addEventListener("fullscreenchange", updateFsButton);
updateFsButton();


function setStatus(t){
  // Keep the chip-dot span intact; only update the text span.
  if (!statusPill) return;
  const spans = statusPill.querySelectorAll("span");
  if (spans && spans.length >= 2) spans[1].textContent = t;
  else statusPill.textContent = t;
}

function setConnStatus(text, connected=false){
  if (!connPill) return;
  const spans = connPill.querySelectorAll("span");
  if (spans && spans.length >= 2) spans[1].textContent = text;
  else connPill.textContent = text;
  connPill.classList.toggle("connected", !!connected);
}

function _fmt(v){
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  if (typeof v === "string") return v;
  try { return JSON.stringify(v); } catch { return String(v); }
}

// Non-blocking in-page toast (replaces alert() calls which hang some
// browsers/headless environments and are an ugly UX).
function toast(message, kind="info", ms=4500){
  let host = document.getElementById("toastHost");
  if (!host){
    host = document.createElement("div");
    host.id = "toastHost";
    host.setAttribute("aria-live", "polite");
    host.style.cssText =
      "position:fixed;top:16px;left:50%;transform:translateX(-50%);" +
      "z-index:9999;display:flex;flex-direction:column;gap:8px;" +
      "pointer-events:none;max-width:92vw";
    document.body.appendChild(host);
  }
  const el = document.createElement("div");
  const bg = kind === "error" ? "#7f1d1d" : (kind === "warn" ? "#78350f" : "#064e3b");
  const border = kind === "error" ? "#f87171" : (kind === "warn" ? "#fbbf24" : "#34d399");
  el.textContent = message;
  el.style.cssText =
    `background:${bg};color:#fff;border:1px solid ${border};` +
    "border-radius:10px;padding:10px 14px;font:14px system-ui,sans-serif;" +
    "box-shadow:0 12px 30px rgba(0,0,0,.4);pointer-events:auto;" +
    "opacity:0;transform:translateY(-6px);transition:opacity .2s,transform .2s";
  host.appendChild(el);
  requestAnimationFrame(()=>{ el.style.opacity="1"; el.style.transform="translateY(0)"; });
  setTimeout(()=>{
    el.style.opacity="0"; el.style.transform="translateY(-6px)";
    setTimeout(()=>el.remove(), 220);
  }, ms);
}
function logEvent({dir="SYS", src="APP", msg=""} = {}){
  const logEl = $("log");
  const line = `[${dir}][${src}] ${msg}`;
  if (logEl) logEl.textContent += line + "\n";
  // keep log scrolled to bottom unless user has scrolled up a lot
  if (logEl && (logEl.scrollHeight - logEl.scrollTop - logEl.clientHeight) < 40) {
    logEl.scrollTop = logEl.scrollHeight;
  }
}

// Backwards-compatible helpers
function log(...args){ logEvent({dir:"SYS", src:"APP", msg: args.map(_fmt).join(" ")}); }

clearLogsBtn?.addEventListener("click", () => {
  if (logEl) logEl.textContent = "";
  // Also clear pending ACK diagnostics so log doesn't immediately refill with stale timeouts.
  _pending.clear();
  log("Logs cleared.");
});

function setDataConn(conn){
  if (!conn) return;
  try { dataConn?.close(); } catch {}
  dataConn = conn;

  conn.on("open", () => {
    log("Data channel open ✅");
    enableControls(true);
    setRoomUiConnected(true);
    if (askRemoteFsBtn) askRemoteFsBtn.disabled = false;
    setConnStatus("Connected", true);
  });

  // If the connection is already open before handlers were attached, enable immediately.
  if (conn.open) {
    log("Data channel already open ✅");
    enableControls(true);
    setRoomUiConnected(true);
    if (askRemoteFsBtn) askRemoteFsBtn.disabled = false;
    setConnStatus("Connected", true);
  }
  conn.on("data", (msg)=>{
    // RTT: parse ack (string form or {type:"ack", id})
    try {
      if (typeof msg === "string") {
        const mm = /ack\s+for\s+([^\s]+)/i.exec(msg);
        if (mm) rttOnAck(mm[1]);
      } else if (msg && typeof msg === "object" && msg.type === "ack") {
        rttOnAck(msg.id || msg._id);
      }
    } catch(e) {}

    try{ updateRxBar(msg); }catch(e){}

    // ACK handler
    if (msg && typeof msg === "object" && msg.type === "ack" && msg.id){
      if (_pending.has(msg.id)){
        _pending.delete(msg.id);
        logEvent({dir:"RX", src:"ACK", msg: "ack for " + msg.id});
      } else {
        logEvent({dir:"RX", src:"ACK", msg: "late/unknown ack " + msg.id});
      }
      return;
    }


    // UI messages (remote fullscreen)
    if (msg && typeof msg === "object" && msg.type === "ui"){
      // Remote SPEAK command: make the receiving device speak text locally
      if (msg.cmd === "SPEAK"){
        const reqId = msg._id || msg.id || msg.reqId || "";
        // Hard cap at 200 chars to prevent harassment / TTS flooding
        const t = (msg.text || msg.say || "").toString().slice(0, 200);
        try{ if (t && typeof window.__tpSpeakLocal === "function") window.__tpSpeakLocal(t); }catch(e){}
        logEvent({dir:"RX", src:"UI", msg:"SPEAK " + (t ? ("\"" + t.slice(0,40) + (t.length>40?"…":"") + "\"") : "")});
        // respond so the sender can log it
        if (reqId) sendUiMessage({type:"ui", cmd:"SPEAK_RESPONSE", reqId, status:"OK"});
        return;
      }
      if (msg.cmd === "REMOTE_FULLSCREEN_REQUEST"){
        const reqId = msg.reqId || msg.id || msg._id || "";
        if (!isViewerDevice()){
        sendUiMessage({type:"ui", cmd:"REMOTE_FULLSCREEN_RESPONSE", reqId: reqId, status:"DENIED_FULLSCREEN", reason:"not_viewer"});
        logEvent({dir:"RX", src:"UI", msg:"REMOTE_FULLSCREEN_REQUEST ignored (not_viewer)"});
        return;
      }
      showRemoteFsOverlay(reqId);
        return;
      }
      if (msg.cmd === "REMOTE_FULLSCREEN_RESPONSE"){
        const s = msg.status || "";
        const r = msg.reason ? (" (" + msg.reason + ")") : "";
        const rid = msg.reqId ? (" reqId=" + msg.reqId) : "";
        logEvent({dir:"RX", src:"UI", msg: s + r + rid});
        return;
      }
    }


    // Normal messages: log + reply ACK
    if (msg && typeof msg === "object"){
      const src = (msg.type === "cmd") ? "DPAD" :
                  (msg.type === "btn") ? "BUTTONS" :
                  (msg.type === "text") ? "TEXT" : (msg.type === "ui") ? "UI" : "PEER";
      logEvent({dir:"RX", src, msg: _fmt(msg)});

      // Forward received commands to micro:bit if bridge enabled
      if (mbBridgeEnabled) forwardToMicrobitFromPeer(msg);

      // ACK back for anything that has _id
      if (msg._id){
        try{ conn.send({ type:"ack", id: msg._id }); }catch{}
      }
    } else {
      logEvent({dir:"RX", src:"PEER", msg: _fmt(msg)});
    }
  });
  conn.on("close", () => {
    log("Data channel closed");
    enableControls(false);
    setRoomUiConnected(false);
    if (askRemoteFsBtn) askRemoteFsBtn.disabled = true;
    if (call) setConnStatus("No data channel", false);
    else setConnStatus("Not connected", false);
  });
  conn.on("error", (e) => {
    if (askRemoteFsBtn) askRemoteFsBtn.disabled = true;
    log("Data channel error:", e?.message || String(e));
    if (!call) setConnStatus("Not connected", false);
  });
}


// ---- DataChannel messaging + ACK ----
const _pending = new Map(); // id -> {t, msg}


function sendMsg(obj){
  const id = obj && (obj._id || obj.id) || ("m" + Date.now() + "-" + Math.random().toString(16).slice(2));
  const msg = Object.assign({}, obj, { _id: id });
  const src = (obj && obj._src) || (
    msg.type === "cmd" ? "DPAD" :
    msg.type === "btn" ? "BUTTONS" :
    msg.type === "text" ? "TEXT" :
    msg.type === "ack" ? "ACK" : "APP"
  );

  if (!dataConn || !dataConn.open){
    logEvent({dir:"TX", src, msg: "skipped (data channel not open): " + _fmt(msg)});
    return null;
  }
  try{
    rttMarkSent(msg);
    dataConn.send(msg);
    logEvent({dir:"TX", src, msg: _fmt(msg)});
    _pending.set(id, { t: Date.now(), msg });
    return id;
  } catch(e){
    logEvent({dir:"SYS", src:"APP", msg: "Send failed: " + (e && e.message ? e.message : e)});
    return null;
  }
}
setInterval(() => {
  const now = Date.now();
  for (const [id, info] of _pending){
    if (now - info.t > 1500){
      log("No ACK (yet):", id, info.msg?.type || "");
      _pending.delete(id);
    }
  }
  // Also GC the RTT pending map — entries without a matching ACK would
  // otherwise leak unbounded over a long session.
  if (typeof __rttPending !== "undefined"){
    const nowP = performance.now();
    for (const [id, t0] of __rttPending){
      if (nowP - t0 > 5000) __rttPending.delete(id);
    }
  }
}, 750);

let localStream = null;
let peer = null;
let call = null;
let dataConn = null;

// micro:bit BLE UART bridge
let microbit = null;
let mbBridgeEnabled = false;

let hostId = null;

// Camera switching / mirroring
let videoDevices = [];
let currentDeviceIndex = 0;
let currentFacing = "user"; // user | environment
let isMirrored = true;
let isRemoteFlipped = false;
let isMicMuted = false;

function setMicMuted(on){
  isMicMuted = !!on;
  const tracks = localStream?.getAudioTracks?.() || [];
  tracks.forEach(t => { t.enabled = !isMicMuted; });
  if (muteMicBtn){
    muteMicBtn.textContent = isMicMuted ? "Unmute mic 🎙️" : "Mute mic 🔇";
    muteMicBtn.classList.toggle("stop", isMicMuted);
  }
}

function setMirror(on){
  isMirrored = !!on;
  if (!localVideo) return;
  localVideo.classList.toggle("mirrored", isMirrored);
  if (flipBtn) flipBtn.textContent = isMirrored ? "Unmirror 🪞" : "Mirror self 🪞";
}

function setRemoteFlip(on){
  isRemoteFlipped = !!on;
  if (!remoteVideo) return;
  remoteVideo.classList.toggle("mirrored", isRemoteFlipped);
  if (flipRemoteBtn) flipRemoteBtn.textContent = isRemoteFlipped ? "Unflip remote ↔️" : "Flip remote ↔️";
}

async function refreshVideoDevices(){
  try{
    const devices = await navigator.mediaDevices.enumerateDevices();
    videoDevices = devices.filter(d => d.kind === "videoinput");
    // Keep index in range
    if (videoDevices.length && currentDeviceIndex >= videoDevices.length) currentDeviceIndex = 0;
  }catch(e){
    // Some browsers require permissions before enumerateDevices returns labels
    videoDevices = [];
  }
}

async function replaceOutgoingVideoTrack(newTrack){
  if (!localStream) return;
  const old = localStream.getVideoTracks()[0];
  if (old){
    try{ localStream.removeTrack(old); }catch{}
    try{ old.stop(); }catch{}
  }
  localStream.addTrack(newTrack);

  // If we're in a call, replace the sender's track without renegotiation.
  const pc = call?.peerConnection;
  const sender = pc?.getSenders?.().find(s => s.track && s.track.kind === "video");
  if (sender?.replaceTrack){
    try{ await sender.replaceTrack(newTrack); }catch(e){ log("replaceTrack failed:", e?.message || String(e)); }
  }
}

async function switchCamera(){
  if (!localStream){
    log("Switch camera: start camera first");
    return;
  }

  setStatus("Switching camera…");
  await refreshVideoDevices();

  try{
    let videoConstraint = null;

    if (videoDevices.length > 1){
      // Cycle actual camera devices when available (desktop + many Androids)
      currentDeviceIndex = (currentDeviceIndex + 1) % videoDevices.length;
      const deviceId = videoDevices[currentDeviceIndex].deviceId;
      videoConstraint = { deviceId: { exact: deviceId } };
      log("Switching to device:", videoDevices[currentDeviceIndex].label || deviceId);
    } else {
      // Fallback: try toggling facingMode (mobile)
      currentFacing = (currentFacing === "user") ? "environment" : "user";
      // Try exact first, then ideal
      videoConstraint = { facingMode: { exact: currentFacing } };
      log("Switching facingMode (exact):", currentFacing);
    }

    let s;
    try{
      s = await navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: false });
    }catch(e){
      // If facingMode exact fails, retry with ideal
      if (!videoDevices.length){
        log("Exact facingMode failed, retry ideal:", e?.name || "", e?.message || String(e));
        s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: currentFacing } }, audio: false });
      } else {
        throw e;
      }
    }

    const [newTrack] = s.getVideoTracks();
    if (!newTrack) throw new Error("No video track from camera");

    await replaceOutgoingVideoTrack(newTrack);
    // Keep local preview running (same MediaStream object)
    localVideo.srcObject = localStream;
    await localVideo.play().catch(()=>{});

    // Helpful default: mirror for front cam, unmirror for back cam
    if (!videoDevices.length) setMirror(currentFacing === "user");

    setStatus("Camera switched ✅");
    log("Camera switched. Track:", `${newTrack.label || "video"}`);
  } catch (e) {
    log("Switch camera failed:", e?.name || "", e?.message || String(e));
    setStatus("Switch failed ❌");
    toast("Could not switch camera on this device/browser.", "error");
  }
}

function randomId(n=6){
  return Math.random().toString(16).slice(2, 2+n);
}

async function ensureLocalStream(){
  if (localStream) return localStream;
  setStatus("Requesting camera/mic…");
  localStream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user" },
    audio: true
  });
  localVideo.srcObject = localStream;
  await localVideo.play().catch(()=>{});
  // Enable camera tools once permissions are granted
  muteMicBtn && (muteMicBtn.disabled = false);
  switchCamBtn && (switchCamBtn.disabled = false);
  flipBtn && (flipBtn.disabled = false);
  // Remote flip is a UI-only transform; enable once app is interactive
  flipRemoteBtn && (flipRemoteBtn.disabled = false);
  await refreshVideoDevices();
  setMirror(true);

  // Default: mic unmuted
  setMicMuted(false);

  // Default: do not flip remote
  setRemoteFlip(false);

  setStatus("Camera ON 🎥");
  log("Local stream tracks:", localStream.getTracks().map(t=>`${t.kind}:${t.readyState}`).join(", "));
  return localStream;
}

function stopLocalMedia(){
  if (!localStream) return;
  try {
    localStream.getTracks().forEach(t => {
      try { t.stop(); } catch {}
    });
  } finally {
    localStream = null;
    if (localVideo) localVideo.srcObject = null;
    // Disable camera tools until user starts again
    muteMicBtn && (muteMicBtn.disabled = true);
    switchCamBtn && (switchCamBtn.disabled = true);
    flipBtn && (flipBtn.disabled = true);
    flipRemoteBtn && (flipRemoteBtn.disabled = true);
  }
}

function cleanupPeer(){
  try { call?.close(); } catch {}
  call = null;
  try { peer?.destroy(); } catch {}
  peer = null;
  hostId = null;
  if (remoteVideo) remoteVideo.srcObject = null;
  if (remoteFsBtn) remoteFsBtn.disabled = true;
  if (askRemoteFsBtn) askRemoteFsBtn.disabled = true;
  // Keep flip state (UI preference) but ensure class is applied consistently
  setRemoteFlip(isRemoteFlipped);
  hangupBtn.style.display = "none";
  setConnStatus("Not connected", false);
}

function attachCallHandlers(c){
  call = c;
  hangupBtn.style.display = "";
  // Data channel and media may connect in either order; show a useful intermediate state.
  setConnStatus("Connecting…", false);

  // --- Data channel robustness ---
  // In practice, the media call and the data connection can open in either order.
  // Some environments also occasionally miss the "connection" event on the host
  // if the guest connects extremely quickly. To make delivery reliable, once we
  // know the remote peer id (from the media call), we proactively try to open a
  // data channel too (it will be deduplicated by our setDataConn()).
  const ensureDataTo = (remotePeerId) => {
    if (!remotePeerId) return;
    if (dataConn && dataConn.open) return;
    if (!peer) return;
    try {
      log("Opening data channel to:", remotePeerId);
      const dc = peer.connect(remotePeerId, { reliable: true });
      setDataConn(dc);
    } catch (e) {
      log("Failed to open data channel:", e?.message || String(e));
    }
  };
  c.on("stream", (remoteStream) => {
    log("Remote stream received:", remoteStream.getTracks().map(t=>`${t.kind}:${t.readyState}`).join(", "));
    remoteVideo.srcObject = remoteStream;
    remoteVideo.play().catch(()=>{});
    // Re-apply remote flip preference after the element starts rendering
    setRemoteFlip(isRemoteFlipped);
    setStatus("Connected ✅");
    setConnStatus("Connected", true);
    if (remoteFsBtn) remoteFsBtn.disabled = false;
    if (askRemoteFsBtn) askRemoteFsBtn.disabled = false;
  });

  // Once we know who we're connected to, try to ensure a data channel exists.
  // (The peer id is available immediately; no need to wait for stream.)
  ensureDataTo(c.peer);
  c.on("close", () => {
    log("Call closed");
    setStatus("Disconnected");
    setConnStatus("Not connected", false);
    if (remoteVideo) remoteVideo.srcObject = null;
    if (remoteFsBtn) remoteFsBtn.disabled = true;
  if (askRemoteFsBtn) askRemoteFsBtn.disabled = true;
    hangupBtn.style.display = "none";
  });
  c.on("error", (e) => {
    log("Call error:", e?.message || String(e));
    setStatus("Call error ❌");
  });
}

async function connect(){
  const roomCode = (roomInput.value || "").trim();
  if (!roomCode){
    toast("Enter a room code (same on both devices).", "warn");
    return;
  }

  await ensureLocalStream();

  // Reset any previous connection
  cleanupPeer();

  hostId = `${encodeURIComponent(roomCode)}-host`;
  setStatus("Connecting…");
  setConnStatus("Connecting…", false);
  log("Room:", roomCode, "Host ID:", hostId);

  // Try to become host first (no role selection).
  // If the ID is already taken, we'll become guest automatically.
  let triedGuest = false;

  function becomeGuest(){
    if (triedGuest) return;
    triedGuest = true;

    const guestId = `${encodeURIComponent(roomCode)}-guest-${randomId()}`;
    log("Host already exists -> becoming guest:", guestId);
    peer = new Peer(guestId, { debug: 2 });

    peer.on("open", (id) => {
      log("Peer open (guest):", id);
      setStatus("Calling other device…");
      setConnStatus("Calling…", false);
      const c = peer.call(hostId, localStream);
      attachCallHandlers(c);
      // Data channel to host
      log("Opening data channel to host…");
      const dc = peer.connect(hostId, { reliable: true });
      dc.on("error", (e) => log("Data channel (guest) error:", e?.message || String(e)));
      dc.on("close", () => log("Data channel (guest) closed"));
      setDataConn(dc);
    });

    peer.on("connection", (conn) => {
    log("Incoming data connection from:", conn.peer);
    setDataConn(conn);
  });

  peer.on("call", (incoming) => {
      // In case both sides race, still answer.
      log("Incoming call (guest) from:", incoming.peer);
      incoming.answer(localStream);
      attachCallHandlers(incoming);
    });

    peer.on("error", (e) => {
      log("Peer error (guest):", e?.type || "", e?.message || String(e));
      setStatus("Error ❌");
    });
  }

  peer = new Peer(hostId, { debug: 2 });

  peer.on("open", (id) => {
    log("Peer open (host):", id);
    setStatus("Waiting for other device…");
    setConnStatus("Waiting…", false);
  });

  peer.on("call", (incoming) => {
    log("Incoming call (host) from:", incoming.peer);
    incoming.answer(localStream);
    attachCallHandlers(incoming);
  });

  peer.on("connection", (conn) => {
    log("Incoming data connection (host) from:", conn.peer);
    setDataConn(conn);
  });

  peer.on("error", (e) => {
    log("Peer error (host attempt):", e?.type || "", e?.message || String(e));
    if (e?.type === "unavailable-id"){
      // Host already taken -> guest
      try { peer.destroy(); } catch {}
      peer = null;
      becomeGuest();
    } else {
      setStatus("Error ❌");
    }
  });
}

startBtn?.addEventListener("click", async () => {
  try {
    await ensureLocalStream();
  } catch (e) {
    log("getUserMedia failed:", e?.name || "", e?.message || String(e));
    setStatus("Permission blocked ❌");
    toast("Camera/mic blocked or not supported. Use HTTPS and allow permissions.", "error", 6000);
  }
});

connectBtn?.addEventListener("click", async () => {
  try {
    await connect();
  } catch (e) {
    log("Connect failed:", e?.message || String(e));
    setStatus("Connect failed ❌");
  }
});

hangupBtn?.addEventListener("click", () => {
  cleanupPeer();
  stopLocalMedia();
  enableControls(false);
  setStatus("Idle");
});

switchCamBtn?.addEventListener("click", () => {
  switchCamera();
});

flipBtn?.addEventListener("click", () => {
  setMirror(!isMirrored);
  log("Mirror:", isMirrored ? "ON" : "OFF");
});

flipRemoteBtn?.addEventListener("click", () => {
  setRemoteFlip(!isRemoteFlipped);
  log("Remote flip:", isRemoteFlipped ? "ON" : "OFF");
});

muteMicBtn?.addEventListener("click", () => {
  if (!localStream){
    log("Mute mic: start camera first");
    return;
  }
  setMicMuted(!isMicMuted);
  log("Mic:", isMicMuted ? "MUTED" : "ON");
});


sendTextBtn?.addEventListener("click", () => {
  const t = (textInput?.value || "").trim();
  if (!t) return;
  const mid = sendMsg({ type: "text", text: t, _src: "TEXT" });
  if (!mid){
    log("Text not sent (data channel not open yet).");
    return;
  }
  log("Text sent:", t, "(id:", mid + ")");
  textInput.value = "";
});

textInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendTextBtn?.click();
});

function bindVirtualControls(){
  // D-pad: send pressed true on down, false on up/leave
  document.querySelectorAll("[data-dir]").forEach((btn) => {
    const cmd = btn.getAttribute("data-dir");
    const down = (e) => { e.preventDefault(); sendMsg({ type: "cmd", cmd, pressed: true, _src: "DPAD" }); };
    const up = (e) => { e.preventDefault(); sendMsg({ type: "cmd", cmd, pressed: false, _src: "DPAD" }); };
    btn.addEventListener("pointerdown", down);
    btn.addEventListener("pointerup", up);
    btn.addEventListener("pointercancel", up);
    btn.addEventListener("pointerleave", up);
  });

  // Buttons: click sends a tap (down then up)
  document.querySelectorAll("[data-btn]").forEach((btn) => {
    const id = btn.getAttribute("data-btn");
    btn.addEventListener("pointerdown", (e) => { e.preventDefault(); sendMsg({ type: "btn", id, pressed: true, _src: "BUTTONS" }); });
    btn.addEventListener("pointerup", (e) => { e.preventDefault(); sendMsg({ type: "btn", id, pressed: false, _src: "BUTTONS" }); });
    btn.addEventListener("pointercancel", (e) => { e.preventDefault(); sendMsg({ type: "btn", id, pressed: false, _src: "BUTTONS" }); });
    btn.addEventListener("pointerleave", (e) => { e.preventDefault(); sendMsg({ type: "btn", id, pressed: false, _src: "BUTTONS" }); });
  });
}

bindVirtualControls();

// Nice default status


// === micro:bit BLE UART (adapted from ble-uart.js) ===
// ble-uart.js
const UART_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class MicrobitUart {
  constructor({ onLog = () => {}, onRx = () => {}, onConnectionChange = () => {} } = {}) {
    this.onLog = onLog;
    this.onRx = onRx;
    this.onConnectionChange = onConnectionChange;
    this.device = null;
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
  }

  get connected() {
    return !!(this.device && this.device.gatt && this.device.gatt.connected && this.writeChar);
  }

  async connect() {
    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BBC micro:bit" }],
      optionalServices: [UART_SERVICE],
    });

    this.device.addEventListener("gattserverdisconnected", () => {
      this._clear();
      this.onConnectionChange(false);
    });

    this.server = await this.device.gatt.connect();
    const service = await this.server.getPrimaryService(UART_SERVICE);
    const chars = await service.getCharacteristics();

    this.writeChar =
      chars.find((c) => c.properties.writeWithoutResponse) ||
      chars.find((c) => c.properties.write);

    this.notifyChar = chars.find((c) => c.properties.notify);

    if (this.notifyChar) {
      await this.notifyChar.startNotifications();
      this.notifyChar.addEventListener("characteristicvaluechanged", (e) => {
        const text = new TextDecoder().decode(e.target.value).trim();
        this.onRx(text);
      });
    }

    this.onConnectionChange(true);
  }

  async disconnect() {
    if (this.device?.gatt?.connected) this.device.gatt.disconnect();
    this._clear();
    this.onConnectionChange(false);
  }

  async sendLine(line) {
    const msg = line.endsWith("\n") ? line : line + "\n";
    const data = new TextEncoder().encode(msg);
    for (let i = 0; i < data.length; i += 20) {
      await this.writeChar.writeValueWithoutResponse(data.slice(i, i + 20));
      await sleep(15);
    }
  }

  _clear() {
    this.device = null;
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
  }
}


// UI + bridge helpers
async function mbSendLineWithId(line, id){
  // Option A protocol: send lines that micro:bit code understands directly
  // e.g. "CMD RIGHT 1" (micro:bit expects the line to start with CMD)
  const useId = id || ("mb" + Date.now());
  const payload = String(line || "").trim();
  await microbit.sendLine(payload);
  logEvent({dir:"TX", src:"MB", msg: payload});
  return useId;
}

function mbSetStatus(text, ok=false){
  if (!mbStatus) return;
  mbStatus.classList.toggle("connected", !!ok);
  const dot = '<span class="status-dot"></span>';
  mbStatus.innerHTML = dot + '<span>' + text + '</span>';
}

function mbSyncBridgeUi(){
  if (mbBridgeOnBtn) {
    mbBridgeOnBtn.disabled = !microbit?.connected || mbBridgeEnabled;
    mbBridgeOnBtn.textContent = mbBridgeEnabled ? "✅ Sending" : "🚀 Start sending";
  }
  if (mbBridgeOffBtn) {
    mbBridgeOffBtn.disabled = !microbit?.connected || !mbBridgeEnabled;
    mbBridgeOffBtn.textContent = "🛑 Stop";
  }
}

function encodeForMicrobit(msg){
  if (!msg || typeof msg !== "object") return "RAW " + _fmt(msg);
  if (msg.type === "cmd"){
    // e.g. CMD RIGHT 1
    return `CMD ${msg.cmd} ${msg.pressed ? 1 : 0}`;
  }
  if (msg.type === "btn"){
    // e.g. BTN A 1
    return `BTN ${msg.id} ${msg.pressed ? 1 : 0}`;
  }
  if (msg.type === "text"){
    return `TXT ${String(msg.text || "").slice(0, 40)}`;
  }
  return `MSG ${msg.type || "unknown"} ${JSON.stringify(msg).slice(0, 60)}`;
}

async function forwardToMicrobitFromPeer(msg){
  if (!microbit || !microbit.connected) {
    logEvent({dir:"SYS", src:"MB", msg:"bridge on but micro:bit not connected"});
    return;
  }
  const line = encodeForMicrobit(msg);
  try{
    const id = (msg && msg._id) ? msg._id : ("mb"+Date.now());
  await mbSendLineWithId(line, id);
    // logged by mbSendLineWithId

  } catch(e){
    logEvent({dir:"SYS", src:"MB", msg:"send failed: " + (e?.message || e)});
  }
}

// Fix the MicrobitUart initialization in app.js:
(function initMicrobit(){
  if (!mbConnectBtn) return;

  microbit = new MicrobitUart({
    onLog: (t) => logEvent({dir:"SYS", src:"MB", msg:String(t)}),
    onRx: (t) => {
      const s = String(t || "").trim();
      logEvent({dir:"RX", src:"MB", msg: s});
    },
    onConnectionChange: (ok) => {
      mbSetStatus(ok ? "Connected" : "Disconnected", ok);
      mbConnectBtn && (mbConnectBtn.disabled = !!ok);
      mbDisconnectBtn && (mbDisconnectBtn.disabled = !ok);
      mbSendTestBtn && (mbSendTestBtn.disabled = !ok);
      mbBridgeOnBtn && (mbBridgeOnBtn.disabled = !ok);
      mbBridgeOffBtn && (mbBridgeOffBtn.disabled = !ok);
      mbMuteMbBtn && (mbMuteMbBtn.disabled = !ok);
      if (!ok) mbBridgeEnabled = false;
      mbSyncBridgeUi();
    }
  });

  mbSetStatus("Disconnected", false);
  mbSyncBridgeUi();


  mbConnectBtn.addEventListener("click", async () => {
    try{
      mbSetStatus("Connecting…", false);
      await microbit.connect();
      logEvent({dir:"SYS", src:"MB", msg:"connected"});
    } catch(e){
      mbSetStatus("Disconnected", false);
      logEvent({dir:"SYS", src:"MB", msg:"connect failed: " + (e?.message || e)});
    }
  });

  mbDisconnectBtn?.addEventListener("click", async () => {
    try{
      await microbit.disconnect();
      logEvent({dir:"SYS", src:"MB", msg:"disconnected"});
    } catch(e){
      logEvent({dir:"SYS", src:"MB", msg:"disconnect failed: " + (e?.message || e)});
    }
  });

  mbSendTestBtn?.addEventListener("click", async () => {
    try{
      await mbSendLineWithId("TEST");
    } catch(e){
      logEvent({dir:"SYS", src:"MB", msg:"TEST failed: " + (e?.message || e)});
    }
  });

  // === Firmware modal: shows the MakeCode TypeScript and lets the user
  // copy it / open MakeCode. Code is fetched once on first open and
  // cached in the modal's <pre>, so subsequent opens are instant.
  (function initFirmwareModal(){
    const fwBtn    = document.getElementById("mbFirmwareBtn");
    const modal    = document.getElementById("fwModal");
    const code     = document.getElementById("fwCodePreview");
    const copyBtn  = document.getElementById("fwCopyBtn");
    const openBtn  = document.getElementById("fwOpenBtn");
    const closeBtn = document.getElementById("fwCloseBtn");
    const closeBtn2= document.getElementById("fwCloseBtn2");
    if (!fwBtn || !modal || !code) return;

    let loaded = false;

    async function loadCode(){
      if (loaded) return;
      // Prefer the inline <script type="text/plain" id="makecodeSource"> block.
      // This is bulletproof on every static host (some refuse to serve .ts
      // files — GitHub Pages returns 503 with a bad MIME). Fall back to
      // fetch only if the inline block is missing for some reason.
      const inline = document.getElementById("makecodeSource");
      const inlineTxt = inline ? (inline.textContent || "").replace(/^\n/, "") : "";
      if (inlineTxt && inlineTxt.trim()){
        code.textContent = inlineTxt;
        loaded = true;
        return;
      }
      try{
        const res = await fetch("makecode.ts", { cache: "no-store" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const txt = await res.text();
        if (!txt || !txt.trim()) throw new Error("empty file");
        code.textContent = txt;
        loaded = true;
      }catch(e){
        code.textContent = "// Failed to load MakeCode source: " + (e?.message || e);
        logEvent({dir:"SYS", src:"MB", msg:"firmware load failed: " + (e?.message || e)});
      }
    }

    function show(){
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
      loadCode();
      // Focus the Copy button so keyboard users can act immediately.
      setTimeout(() => copyBtn?.focus(), 0);
      document.addEventListener("keydown", onKey);
    }
    function hide(){
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", onKey);
      fwBtn?.focus();
    }
    function onKey(e){ if (e.key === "Escape") hide(); }

    fwBtn.addEventListener("click", show);
    closeBtn?.addEventListener("click", hide);
    closeBtn2?.addEventListener("click", hide);
    // Backdrop click (but not clicks inside the panel)
    modal.addEventListener("click", (e) => { if (e.target === modal) hide(); });

    copyBtn?.addEventListener("click", async () => {
      const txt = code.textContent || "";
      if (!txt || txt.startsWith("// Failed")){
        toast("Nothing to copy — code didn't load.", "error");
        return;
      }
      const original = copyBtn.textContent;
      try{
        if (!navigator.clipboard || !navigator.clipboard.writeText){
          throw new Error("clipboard API not available (needs HTTPS or localhost)");
        }
        await navigator.clipboard.writeText(txt);
        copyBtn.textContent = "✅ Copied";
        toast("Code copied — paste it into MakeCode (JavaScript mode).", "info", 4500);
        logEvent({dir:"SYS", src:"MB", msg:"firmware copied (" + txt.length + " chars)"});
        setTimeout(() => { copyBtn.textContent = original; }, 1800);
      }catch(e){
        // Fallback: select the <pre> contents so the user can Ctrl+C manually
        try{
          const range = document.createRange();
          range.selectNodeContents(code);
          const sel = window.getSelection();
          sel.removeAllRanges(); sel.addRange(range);
          toast("Clipboard blocked — code is selected, press Ctrl+C to copy.", "warn", 6000);
        }catch(_){}
        logEvent({dir:"SYS", src:"MB", msg:"firmware copy failed: " + (e?.message || e)});
      }
    });

    openBtn?.addEventListener("click", () => {
      window.open("https://makecode.microbit.org/#editor", "_blank", "noopener,noreferrer");
    });
  })();

  mbBridgeOnBtn?.addEventListener("click", () => {
    mbBridgeEnabled = true;
    mbSyncBridgeUi();
    logEvent({dir:"SYS", src:"MB", msg:"bridge enabled (peer → micro:bit)"});
  });
  mbBridgeOffBtn?.addEventListener("click", () => {
    mbBridgeEnabled = false;
    mbSyncBridgeUi();
    logEvent({dir:"SYS", src:"MB", msg:"bridge disabled"});
  });
})();
setStatus("Idle");
setConnStatus("Not connected", false);



// ---------- UI messaging: remote fullscreen request ----------
function _rid(){
  return Math.random().toString(36).slice(2) + "-" + Date.now().toString(36);
}

function sendUiMessage(obj){
  return sendMsg(Object.assign({ _src:"UI" }, obj));
}

let _remoteFsOverlayTimer = null;

function showRemoteFsOverlay(reqId){
  if (!remoteFsOverlay) return;
  remoteFsOverlay.style.display = "flex";
  remoteFsOverlay.setAttribute("aria-hidden", "false");

  // auto-hide after 10s
  if (_remoteFsOverlayTimer) clearTimeout(_remoteFsOverlayTimer);
  _remoteFsOverlayTimer = setTimeout(() => {
    hideRemoteFsOverlay();
    // timeout counts as denied
    sendUiMessage({type:"ui", cmd:"REMOTE_FULLSCREEN_RESPONSE", reqId: reqId, status:"DENIED_FULLSCREEN", reason:"timeout"});
    logEvent({dir:"TX", src:"UI", msg:"DENIED_FULLSCREEN (timeout)"});
  }, 10000);

  const cleanup = () => {
    if (_remoteFsOverlayTimer){ clearTimeout(_remoteFsOverlayTimer); _remoteFsOverlayTimer = null; }
    remoteFsAcceptBtn?.removeEventListener("click", onAccept);
    remoteFsDenyBtn?.removeEventListener("click", onDeny);
  };

  const onAccept = async () => {
    cleanup();
    hideRemoteFsOverlay();
    try{
      const stage = document.getElementById("videoStage") || document.documentElement;
      await stage.requestFullscreen();
      sendUiMessage({type:"ui", cmd:"REMOTE_FULLSCREEN_RESPONSE", reqId: reqId, status:"OK_FULLSCREEN", reason:""});
      logEvent({dir:"TX", src:"UI", msg:"OK_FULLSCREEN"});
    }catch(e){
      sendUiMessage({type:"ui", cmd:"REMOTE_FULLSCREEN_RESPONSE", reqId: reqId, status:"DENIED_FULLSCREEN", reason:"error"});
      logEvent({dir:"TX", src:"UI", msg:"DENIED_FULLSCREEN (error)"});
    }
  };

  const onDeny = () => {
    cleanup();
    hideRemoteFsOverlay();
    sendUiMessage({type:"ui", cmd:"REMOTE_FULLSCREEN_RESPONSE", reqId: reqId, status:"DENIED_FULLSCREEN", reason:"user"});
    logEvent({dir:"TX", src:"UI", msg:"DENIED_FULLSCREEN (user)"});
  };

  remoteFsAcceptBtn?.addEventListener("click", onAccept);
  remoteFsDenyBtn?.addEventListener("click", onDeny);

  logEvent({dir:"RX", src:"UI", msg:"REMOTE_FULLSCREEN requested (overlay shown)"});
}

function hideRemoteFsOverlay(){
  if (!remoteFsOverlay) return;
  remoteFsOverlay.style.display = "none";
  remoteFsOverlay.setAttribute("aria-hidden", "true");
}

function requestRemoteFullscreen(){
  const reqId = _rid();
  const mid = sendUiMessage({type:"ui", cmd:"REMOTE_FULLSCREEN_REQUEST", reqId});
  if (mid){
    logEvent({dir:"TX", src:"UI", msg:"REMOTE_FULLSCREEN_REQUEST reqId=" + reqId});
  }
}

askRemoteFsBtn?.addEventListener("click", () => {
  requestRemoteFullscreen();
});

cleanCacheBtn?.addEventListener("click", async () => {
  try{
    localStorage.clear();
    sessionStorage.clear();
    if ("caches" in window){
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
    if ("serviceWorker" in navigator){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    }
    logEvent({dir:"SYS", src:"CACHE", msg:"Cleared storage/cache; reloading..."});
  }catch(e){
    logEvent({dir:"SYS", src:"CACHE", msg:"Cache clear error: " + (e?.message || String(e))});
  }
  location.reload();
});

function isViewerDevice(){
  const v = $("remoteVideo");
  const s = v && v.srcObject;
  if (!s || !s.getVideoTracks) return false;
  const tracks = s.getVideoTracks();
  return tracks.some(t => t.readyState === "live" && t.enabled);
}

// Draggable thumb
(function(){
 const stage=document.getElementById("videoStage");
 const thumb=document.getElementById("localVideo");
 if(!stage||!thumb)return;
 let drag=false,sx=0,sy=0,l=0,t=0;
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
 thumb.addEventListener("pointerdown",e=>{
  drag=true;thumb.classList.add("dragging");
  const r=thumb.getBoundingClientRect(),sr=stage.getBoundingClientRect();
  l=r.left-sr.left; t=r.top-sr.top;
  sx=e.clientX; sy=e.clientY;
  // setPointerCapture can throw if the pointer is synthetic or already
  // released (seen on Safari mobile and in headless test environments).
  try{ thumb.setPointerCapture(e.pointerId); }catch(_){}
 });
 window.addEventListener("pointermove",e=>{
  if(!drag)return;
  const sr=stage.getBoundingClientRect();
  const tr=thumb.getBoundingClientRect();
  const nl=clamp(l+e.clientX-sx,0,sr.width-tr.width);
  const nt=clamp(t+e.clientY-sy,0,sr.height-tr.height);
  thumb.style.left=nl+"px"; thumb.style.top=nt+"px";
  thumb.style.right="auto"; thumb.style.bottom="auto";
 });
 window.addEventListener("pointerup",()=>{drag=false;thumb.classList.remove("dragging");});
})();

// === RX bar counter ===
let rxCount = 0;

function updateRxBar(msg){
  try{
    const el = document.getElementById("rxBar");
    if(!el) return;

    // Decide if this message is "important" enough for the on-video bar.
    // Everything else remains in Logs.
    let text = null;

    // If msg is string, try parse JSON
    let m = msg;
    if (typeof msg === "string"){
      try { m = JSON.parse(msg); } catch(e) { m = msg; }
    }

    // UI responses (fullscreen OK/DENIED)
    if (m && typeof m === "object" && m.type === "ui" && m.cmd === "REMOTE_FULLSCREEN_RESPONSE"){
      text = `UI: ${m.status || "RESPONSE"}${m.reason ? " ("+m.reason+")" : ""}`;
    }

    // Safety / system important strings
    if (!text && typeof m === "string"){
      const s = m.toLowerCase();
      if (s.includes("safety") || s.includes("auto-stop") || s.includes("cmd stop")){
        text = "SAFETY: " + m;
      }
    }

    // Micro:bit traffic
    if (!text && m && typeof m === "object" && (m.type === "mb" || m.type === "microbit")){
      const line = (m.line || m.msg || "").toString();
      if (line) text = "MB: " + line;
    }

    // D-pad and buttons: show PRESSES only (pressed !== false)
    if (!text && m && typeof m === "object" && m.type === "cmd"){
      const pressed = (m.pressed === undefined) ? true : !!m.pressed;
      if (pressed){
        const c = (m.cmd || m.dir || m.key || "").toString().toUpperCase();
        const icon = ({UP:"↑",DOWN:"↓",LEFT:"←",RIGHT:"→",STOP:"■"})[c] || "🎮";
        text = `${icon} ${c || "CMD"}`;
      }
    }
    if (!text && m && typeof m === "object" && (m.type === "btn" || m.type === "button")){
      const pressed = (m.pressed === undefined) ? true : !!m.pressed;
      if (pressed){
        const b = (m.id || m.button || m.key || "").toString().toUpperCase();
        text = `● ${b || "BTN"}`;
      }
    }

    // If not important, do nothing (keep noise out)
    if (!text) return;

    rxCount++;
    if (text.length > 120) text = text.slice(0,120) + "…";
    el.textContent = `RX #${rxCount}: ${text}`;
    el.classList.add("show");

    // auto-dim after 1.2s
    el.classList.add("show");
    clearTimeout(window.__rxBarT);
    window.__rxBarT = setTimeout(()=> el.classList.remove("show"), 1200);
  }catch(e){}
}


// RTT tracking moved to the single log-only implementation below.

// === Snapshot & Recording ===
const snapBtn=document.getElementById("snapBtn");
const recBtn=document.getElementById("recBtn");
let recorder=null, recChunks=[];

snapBtn?.addEventListener("click",()=>{
 const v=document.getElementById("remoteVideo");
 if(!v||!v.videoWidth)return;
 const c=document.createElement("canvas");
 c.width=v.videoWidth; c.height=v.videoHeight;
 c.getContext("2d").drawImage(v,0,0);
 const a=document.createElement("a");
 a.href=c.toDataURL("image/png");
 a.download="snapshot.png"; a.click();
});

recBtn?.addEventListener("click",()=>{
 const v=document.getElementById("remoteVideo");
 if(!v||!v.srcObject)return;
 if(recorder && recorder.state==="recording"){
  recorder.stop(); recBtn.textContent="⏺️ Record"; return;
 }
 recorder=new MediaRecorder(v.srcObject,{mimeType:"video/webm"});
 recChunks=[];
 recorder.ondataavailable=e=>recChunks.push(e.data);
 recorder.onstop=()=>{
  const blob=new Blob(recChunks,{type:"video/webm"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="remote_recording.webm";
  a.click();
 };
 recorder.start();
 recBtn.textContent="⏹️ Stop";
});

// === RTT tracking (log-only) ===
const __rttPending = new Map(); // _id -> t0
let __rttSamples = [];

function __rttLog(line){
  try{
    if (typeof logLine === "function") logLine("SYS", line);
    else if (typeof logEvent === "function") logEvent({dir:"SYS", src:"RTT", msg: line});
    else console.log(line);
  }catch(e){}
}
function rttMarkSent(msg){
  if (msg && msg._id) __rttPending.set(msg._id, performance.now());
}
function rttOnAck(id){
  const t0 = __rttPending.get(id);
  if (t0 == null) return;
  __rttPending.delete(id);
  const ms = Math.max(0, performance.now() - t0);
  __rttSamples.push(ms);
  if (__rttSamples.length > 40) __rttSamples.shift();
  const avg = __rttSamples.reduce((a,b)=>a+b,0)/__rttSamples.length;
  __rttLog(`[RTT] ${Math.round(ms)}ms (avg ${Math.round(avg)}) id=${id}`);
}

// === HUD toggle -> rxBar (bottom overlay) ===
(function(){
  const btn = document.getElementById("hudBtn");
  const bar = document.getElementById("rxBar");
  if (!btn || !bar) return;

  // default OFF
  let on = false;
  try{
    const v = localStorage.getItem("tp_rxbar_on");
    if (v === "1") on = true;
  }catch(e){}

  function sync(){
    bar.classList.toggle("is-hidden", !on);
    btn.classList.toggle("is-on", on);
    btn.textContent = on ? "👁️ Hide HUD" : "👁️ Show HUD";
  }
  sync();

  btn.addEventListener("click", ()=>{
    on = !on;
    try{ localStorage.setItem("tp_rxbar_on", on ? "1":"0"); }catch(e){}
    sync();
  });
})();


/* === SPEAK BUTTONS === */
(function(){
  const speakBtn = document.getElementById("speakBtn");
  const remoteSpeakBtn = document.getElementById("remoteSpeakBtn");
  const input = document.getElementById("textInput");

  function logSys(line){
    try{
      if (typeof logLine === "function") logLine("SYS", line);
      else if (typeof logEvent === "function") logEvent({dir:"SYS", src:"TTS", msg: line});
      else console.log(line);
    }catch(e){}
  }

  function speakLocal(text){
    if (!text) return;
    if (!("speechSynthesis" in window)){
      logSys("[TTS] not supported");
      return;
    }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = navigator.language || "en-US";
    speechSynthesis.speak(u);
    logSys("[TTS] speak local: " + text);
  }

  speakBtn?.addEventListener("click", ()=>{
    const t = (input?.value || "").trim();
    if (!t) return;
    speakLocal(t);
  });

  // Send a command to the OTHER device to speak this text locally on that device.
  remoteSpeakBtn?.addEventListener("click", ()=>{
    const t = (input?.value || "").trim().slice(0, 200);
    if (!t) return;

    const mid = sendMsg({ type:"ui", cmd:"SPEAK", text:t, _src:"TTS" });
    if (!mid){
      logSys("[TTS] remote speak not sent (data channel not open yet).");
      return;
    }
    logSys("[TTS] remote speak requested (id: " + mid + ")");
  });

  // Expose for receiver handler
  window.__tpSpeakLocal = speakLocal;
})();
