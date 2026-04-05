# 🚀 MINI MISSION CONTROL (for kids!)

Welcome, tiny astronaut 🧑‍🚀✨

This project is a **mini “mission control” website** that lets **two devices** (like a laptop + a phone) do these superpowers:

- 📹 **Video + audio call** (so you can see/hear the other device)
- 🎮 **Send control commands** (a D‑pad: UP / DOWN / LEFT / RIGHT / STOP)
- ✉️ **Send text messages** (and even make a device *talk* out loud 🤖🔊)
- 🧩 **Optional micro:bit link** via Bluetooth (so your micro:bit can “feel” the commands)

Think of it like: **FaceTime + Game Controller + micro:bit walkie‑talkie**.

---

## 🧠 How it works (kid version)

Imagine there are two secret tunnels between your devices:

1. **Video Tunnel** 🎥
   - sends camera + microphone
2. **Message Tunnel** 📡
   - sends tiny data packets like:
     - `{"type":"cmd","cmd":"LEFT","pressed":true}`
     - `{"type":"text","text":"Hello"}`

The project uses **PeerJS** (a helper library) to build those tunnels.

⚠️ Important rule: **Both devices must type the SAME room code**.

---

## 🧰 What’s inside this project

- `index.html` — the page you open (the control center)
- `css/style.css` — makes it look cool 😎
- `js/app.js` — the brain 🧠 (camera, connect, buttons, logs, micro:bit bridge, BLE UART)
- `makecode.ts` — micro:bit program (MakeCode TypeScript)

---

## ✅ What you need

### For the website
- Two devices with browsers
  - Best: **Chrome** (desktop + Android)
  - Safari/iPhone: video usually works, but **Bluetooth micro:bit features won’t**

### For the micro:bit part (optional)
- A **BBC micro:bit** (v2 recommended)
- **Chrome** on a computer (Web Bluetooth is happiest there)
- The website must be opened on **HTTPS** (or sometimes `localhost`)

---

## ▶️ How to run it (3 easy ways)

### Option A — Open the GitHub Pages link (easiest)
If your teacher/friend published it on GitHub Pages, just open the link in both devices.

✅ The tiny original README pointed to:
- `https://abourdim.github.io/mission_control`

(If that link changes, use whatever link your teacher gives.)

---

### Option B — Run locally (computer only)

1. Download this project folder.
2. Open a terminal in the folder that contains `index.html`.
3. Start a tiny local server:

**Python (recommended):**
```bash
python -m http.server 8000
```

4. Open this in your browser:
- `http://localhost:8000`

✅ Camera & mic work on `localhost`.

⚠️ Web Bluetooth for micro:bit usually needs **HTTPS**, so Option A or C is better for micro:bit.

---

### Option C — Host on GitHub Pages (best for micro:bit)

If you know GitHub:
1. Put the files in a GitHub repo
2. Enable **GitHub Pages**
3. Open that **https://...github.io/...** link on both devices

✅ Camera works
✅ micro:bit Bluetooth works (in Chrome)

---

## 🕹️ How to use the app (step-by-step)

### 1) Open on TWO devices
Example:
- Device A: laptop
- Device B: phone

Open the same page on both.

### 2) Type the SAME room code
In the **Room** section, there is a box called “Room code”.

- Both devices must type the same thing (example: `demo` or `1234`).

### 3) Start camera
Press:
- **🎥 Start camera**

Allow permissions when it asks.

### 4) Connect
Press:
- **✅ Connect**

One device becomes the “host” automatically.
The other becomes the “guest” automatically.

### 5) Enjoy the powers
Now you can:
- see the other device’s video
- press the D‑pad to send commands
- send text
- try the talk buttons 🔊

---

## 🎮 Controls (what each button does)

### D‑pad
- Hold **▲ UP** → sends `{type:"cmd", cmd:"UP", pressed:true}`
- Release **▲ UP** → sends `{type:"cmd", cmd:"UP", pressed:false}`

Same for LEFT / RIGHT / DOWN.

### Stop
- **■ Stop** sends `STOP` so robots (or brains) can stop moving.

### Text
- Type in the text box → click **Send**

### Speak (text-to-speech)
- **🔊 Speak** → *this device* says the text out loud
- **📡 Remote speak** → asks the *other device* to speak the text

(Yes, you can make your friend’s phone say “I love broccoli” 🥦😈)

---

## 🧩 micro:bit Live Link (optional robot magic)

This app can forward commands **from the other device** to a micro:bit using **Bluetooth UART**.

### What “Bridge mode” means
Bridge mode =
> When the website receives commands from the other device, it forwards them to the micro:bit.

So the path is:

**Device B → (internet) → Device A → (Bluetooth) → micro:bit**

### How to connect micro:bit
1. Use **Chrome** on a computer.
2. Press **🔗 Connect** in “micro:bit Live Link”.
3. Pick your micro:bit (name starts with **BBC micro:bit**).
4. Press **🚀 Start sending** (Bridge ON).

Now D‑pad commands can arrive as lines like:
- `CMD LEFT 1`
- `CMD LEFT 0`
- `CMD STOP 1`

---

## 🤖 micro:bit code (makecode.ts) explained

The file `makecode.ts` is for **MakeCode**.

What it does:
- Starts the Bluetooth UART service
- Prints logs to USB serial
- Whenever it receives a line (ending with Enter/newline), it:
  1) prints it to serial
  2) sends back an **ACK** message
  3) shows arrows on the LED screen for `CMD UP/DOWN/LEFT/RIGHT 1`
  4) shows a square for stop

### Example
If the web app sends:
- `CMD RIGHT 1`

The micro:bit:
- shows a ➡️ arrow
- sends back:
- `ACK CMD RIGHT 1`

(That ACK helps the website know the message arrived.)

### How to load it on micro:bit
1. Open **MakeCode for micro:bit** in your browser
2. Create a new project
3. Switch to JavaScript
4. Paste the contents of `makecode.ts`
5. Download the `.hex` file
6. Copy it to your micro:bit

---

## 🧾 Logs (for detectives 🕵️)

Open **Logs** and you’ll see messages like:
- `[TX][DPAD] ...` = you sent something
- `[RX][DPAD] ...` = you received something
- `[RX][ACK] ...` = the other side said “yup, got it!”

If things feel haunted 👻, check Logs first.

---

## 🧼 “Clean cache” button

**🧽 Clean cache** clears saved settings and reloads the page.

Use it if:
- buttons look weird
- HUD acts silly
- you changed code but your browser is stubborn

---

## 🧯 Troubleshooting (aka “Why is my spaceship on fire?”)

### “Camera permission blocked”
- Use **HTTPS** (GitHub Pages) or **localhost**
- Allow camera/mic permissions in the browser settings

### “Not connected / stuck on waiting”
- Make sure both devices use the **same room code**
- Try refreshing both pages
- Some networks block peer connections (school Wi‑Fi sometimes does)

### micro:bit connect button does nothing
- Use **Chrome** (not Safari)
- Use **HTTPS**
- Turn on Bluetooth
- Keep micro:bit close

### Remote fullscreen doesn’t work
- The other device must accept the fullscreen popup
- Some browsers block fullscreen unless the user clicks

---

## 🧑‍🔧 For grown-ups (or super kids) — technical notes

- Uses **PeerJS** loaded from a CDN:
  - `https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js`
- Host/guest roles are automatic:
  - first device claims `<room>-host`
  - second device becomes `<room>-guest-<random>`
- Commands are sent over PeerJS **data connection** as JSON objects.
- micro:bit uses **Web Bluetooth** + Nordic UART Service UUID:
  - `6e400001-b5a3-f393-e0a9-e50e24dcca9e`

---

## 🏁 Mission ideas (fun things to build next)

- Add real robot actions on the micro:bit (motors/servo)
- Add buttons like “A”, “B”, “Laser”, “Dance” 💃
- Add a “secret emoji channel” 😺🚀🍕

---

## 📜 Safety & kindness

- Always ask before using someone’s camera.
- Don’t spam “Remote speak” to be annoying.
- Use your powers for good (like telling jokes). 🫡

---

Have fun, Commander! 🚀🧃

