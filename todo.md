# TODO — Audit Findings

Full audit of `index.html`, `css/style.css`, `js/app.js`, `js/ble-uart.js`, `makecode.ts`, `README.md`.
Ordered by severity. Check items off as they're fixed.

---

## 🔴 Bugs (broken or dead code)

- [ ] **`loadHudPref` is called but never defined** — `js/app.js:3` throws `ReferenceError` on every page load (DOMContentLoaded).
- [ ] **`logEvent` has a misplaced closing brace** — `js/app.js:125–153`. The `showCmdHud` function and `_cmdHudTimer` are declared *inside* `logEvent`, making them local + dead, and everything after the stray inner `}` is unreachable logic within `logEvent`'s body.
- [ ] **`showCmdHud` defined twice** — once inside `logEvent` (dead), once at `js/app.js:1173`. The second version references a module-level `cmdHud` variable that is **never assigned a DOM element**, so the HUD is effectively a no-op.
- [ ] **HUD DOM elements don't exist** — code references `#cmdHud`, `#cmdHudText`, `#cmdHudIcon`, `#hudToggle` (`js/app.js:139, 26, 1170`). None are in `index.html`. Entire HUD subsystem is dead.
- [ ] **`rttMarkSent(msg)` called 3× in a row** — `js/app.js:346–349` (copy-paste).
- [ ] **`rttMarkSent` / `rttOnAck` defined twice** — `js/app.js:1260` and again `1340`. Second set silently overrides.
- [ ] **Ack-parsing block duplicated 3×** in `conn.on("data")` handler — `js/app.js:187–207`.
- [ ] **HUD trigger block duplicated** — `js/app.js:212–231` and `276–291` run the same logic twice per received message.
- [ ] **Two IIFEs bind `#hudBtn`** — `js/app.js:1308` and `1355`. Each adds its own click handler, so every click toggles two different flags out of sync.
- [ ] **`mbMarkSent` is never called** → `bleRttPending` map is write-only, BLE RTT measurement never fires.
- [ ] **`setRxDebug` is a stub** (`js/app.js:1186`) but called earlier (line 210). Works because it does nothing, but it's leftover.
- [ ] **`js/ble-uart.js` is an orphan** — uses `export class`, isn't imported by `index.html`, and its content is already duplicated inline in `app.js`. Dead file.
- [ ] **`_pending` retry never happens** — interval at `js/app.js:358` sets `tries: 1` on send but the timeout block just deletes. Either remove `tries` or implement retry.

---

## 🟠 Security / privacy concerns

- [ ] **No room authentication** — Anyone who guesses the room code joins the call, sends commands, and hears/sees streams. README defaults to `demo`. Biggest concern for a children's app.
- [ ] **Remote SPEAK with no confirmation** — any peer can make the other device read arbitrary text via `speechSynthesis` with no rate limit or length cap (`js/app.js:247`). Add a length cap (e.g. 200 chars) and/or an accept prompt.
- [ ] **PeerJS loaded from CDN without SRI** — `unpkg.com/peerjs@1.5.4/dist/peerjs.min.js` has no `integrity=` hash (`index.html:173`). Supply-chain risk.
- [ ] **No CSP meta tag** — trivial to add for defense in depth on a static page.
- [ ] **Received message data is unvalidated** — `msg.text`, `msg.cmd`, etc. consumed without type/length checks before being logged, spoken, or forwarded to BLE.
- [ ] **Host-ID squatting** — `${room}-host` is deterministic on the default PeerJS broker, so someone can pre-claim common room names (`demo`, `1234`) and intercept.

---

## 🟡 Repo hygiene

- [ ] **`conversation.log` (132 KB) committed** — looks like an AI chat transcript, almost certainly shouldn't be in the repo.
- [ ] **No `.gitignore`** — nothing excluded; risk of accidentally committing local artifacts. At minimum: `*.log`, `node_modules/`, `.DS_Store`, `.vscode/`.
- [ ] **No `package.json`, no linter, no formatter** — an ESLint pass would have caught half the bugs above.
- [ ] **Single commit "V1.0"** — no history to bisect against.

---

## 🟢 What's good (keep)

- Clean single-file architecture, no framework bloat, easy to serve.
- README is well-aimed at the actual audience (kids).
- Sensible cleanup paths (`cleanupPeer`, `stopLocalMedia`), and data-channel fallback that proactively dials the peer both ways.
- `makecode.ts` is short, readable, and matches the protocol in `encodeForMicrobit`.

---

## Recommended order (quick wins first)

1. Delete the stray `loadHudPref()` call on line 3 (or define the function).
2. Fix the misplaced `}` in `logEvent` (~line 153) and delete the inner dead `showCmdHud`/`_cmdHudTimer`.
3. De-duplicate the 3× `rttMarkSent(msg)` and 3× ack-parser blocks.
4. Pick **one** HUD implementation, wire it to real DOM nodes, delete the rest.
5. Delete `js/ble-uart.js` (dead file) and `conversation.log`.
6. Add SRI hash to the PeerJS `<script>` tag.
7. Add a `.gitignore`.
8. Cap remote-SPEAK text length and reject empty/whitespace.
9. Consider requiring a minimum room code length or generating a random one by default.
