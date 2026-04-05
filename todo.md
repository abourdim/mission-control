# TODO — Audit Findings

Full audit of `index.html`, `css/style.css`, `js/app.js`, `makecode.ts`, `README.md`.
Ordered by severity. Most items fixed in the "fix all" pass; remaining items are architectural.

---

## 🔴 Bugs (broken or dead code)

- [x] **`loadHudPref` is called but never defined** — removed the stray call.
- [x] **`logEvent` has a misplaced closing brace** — fixed; deleted the nested dead `showCmdHud`/`_cmdHudTimer`.
- [x] **`showCmdHud` defined twice** — both dead copies removed (no matching DOM elements).
- [x] **HUD DOM elements don't exist** — dead HUD code deleted; kept the `#rxBar` overlay which *is* in the HTML.
- [x] **`rttMarkSent(msg)` called 3× in a row** — collapsed to one call.
- [x] **`rttMarkSent` / `rttOnAck` defined twice** — kept the log-only version, removed the UI-badge version.
- [x] **Ack-parsing block duplicated 3×** — collapsed to one block.
- [x] **HUD trigger block duplicated** — removed (HUD was dead anyway).
- [x] **Two IIFEs bind `#hudBtn`** — removed the one tied to the nonexistent `window.hudEnabled` HUD.
- [x] **`mbMarkSent` is never called / BLE RTT broken** — deleted. The protocol was also wrong: micro:bit ACKs back the full line (`ACK CMD RIGHT 1`), not an ID, so id-keyed lookup couldn't work. Drop-in fix would need a protocol change.
- [x] **`setRxDebug` stub** — removed.
- [x] **`js/ble-uart.js` is an orphan** — file deleted; README updated.
- [x] **`_pending` retry never happens** — removed the misleading `tries` field.

---

## 🟠 Security / privacy

- [ ] **No room authentication** — Architectural; PeerJS default broker + guessable room IDs. Not fixed. Mitigation: recommend longer/random room codes in the UI.
- [x] **Remote SPEAK length cap** — text hard-capped at 200 chars on both send and receive sides.
- [x] **PeerJS loaded from CDN without SRI** — added `integrity="sha384-..."` + `crossorigin` + `referrerpolicy` to the dynamic `<script>` tag in `index.html`, with an error fallback if the integrity check fails.
- [x] **No CSP meta tag** — added a reasonably tight `Content-Security-Policy` meta (allows self + unpkg for PeerJS, `wss:`/`https:` for PeerJS broker, `blob:` for media).
- [ ] **Received message data is unvalidated** — partially addressed via the SPEAK cap. Full schema validation is out of scope for a kid-facing app.
- [ ] **Host-ID squatting** — Architectural, not fixed. Same mitigation as room-auth.

---

## 🟡 Repo hygiene

- [x] **`conversation.log` (132 KB) committed** — deleted.
- [x] **No `.gitignore`** — added with sensible defaults.
- [ ] **No `package.json`, no linter, no formatter** — intentionally left as a pure static site; revisit if we add any build step.
- [ ] **Single commit "V1.0"** — N/A, self-healing as we make commits.

---

## 🟢 Notes for the next pass

- Consider replacing the default PeerJS broker with your own, or requiring a minimum-entropy room code (e.g. 6+ characters, reject common words).
- Add a tiny "opening a room" helper that generates a random 6-char code by default so kids don't reuse `demo`.
- The micro:bit BLE RTT feature could be restored by changing `makecode.ts` to echo an id-only ACK (`ACK <id>`) instead of the full line, and wiring `mbMarkSent(id)` in `mbSendLineWithId`.
