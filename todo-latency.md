# TODO — D-pad → micro:bit LED latency

Tracking the investigation and tuning options for the perceived delay
between tapping an arrow on the iPhone and the arrow appearing on the
micro:bit LED matrix.

## Latency path (biggest → smallest)

```
iPhone finger
  └─ touch event                       ~ 5–20 ms
     └─ WebRTC data channel            ~ 30–200 ms (network-bound)
        └─ laptop JS → Web Bluetooth write
           └─ BLE connection interval  ~ 30–100 ms (OS-negotiated, floor)
              └─ micro:bit handleLine
                 └─ basic.showArrow    ~ 0 ms  ✅ fixed (was 400 ms blocking)
                    └─ LED update
```

## Suspects ranked by likely impact

- [x] **1. `basic.showArrow` / `basic.showIcon` blocks ~400 ms** ⚠️
  **FIXED.** Passed `, 0` as the interval argument to every
  `showArrow` / `showIcon` call in `makecode.ts` and in the mirrored
  inline `<script id="makecodeSource">` block in `index.html`.
  The fiber no longer pauses — rapid taps render instantly instead
  of queuing behind a 400 ms animation.

- [ ] **2. BLE connection interval (30–100 ms)** — hard floor, not
  controllable from JS or MakeCode.

- [ ] **3. WebRTC round-trip iPhone → laptop (30–200 ms)** — network
  bound, already visible in `[RTT]` log lines.

- [x] **4. `sendLine` chunking** — **FIXED.** Reduced the inter-chunk
  sleep from 15 ms to 5 ms in `js/app.js` (`MicrobitUart.sendLine`).
  Mostly helps long TXT lines; D-pad commands are a single 20-byte
  chunk so the win is minor.

- [ ] **5. Double-send on press + release** — intentionally **NOT**
  changed. With fix #1 applied the "square-overwrites-arrow" race is
  gone, and removing the release message would break the hold-to-move
  control semantics.

- [ ] **6. Heartbeat fighting arrows** — not a real issue in practice,
  already gated by `lastCmdAt`.

## Applied fixes (from the original tuning table)

| # | Status | Notes |
|---|---|---|
| A | ✅ Applied | Non-blocking `showArrow`/`showIcon` in `makecode.ts` + inline mirror in `index.html`. Biggest win, ~350 ms per command. |
| B | ⏭️ Skipped | Would break hold-to-move semantics. Fix A eliminates the race it was meant to address. |
| C | ⏭️ Skipped | Switching to unreliable single channel risks dropping STOP commands (robot-safety concern). A proper two-channel setup was out of scope. |
| D | ✅ Applied | `sendLine` inter-chunk sleep 15 ms → 5 ms. |
| E | ✅ Applied | Added `.dpad-btn.pulse` CSS animation and `pulseButton()` JS that fires on pointerdown *before* `sendMsg`. Instant visual feedback on every tap regardless of network state. Verified in preview: class added immediately, cleared after 300 ms, retriggers on rapid repeat presses. |

## Measurement (still useful to do post-fix)

- [ ] Open **Logs** on the iPhone or laptop.
- [ ] Press the D-pad; watch `[RTT] XXms (avg YY)`.
- [ ] Time LED update vs visible `[TX][DPAD]` entry.
- [ ] Subtract RTT from total perceived lag. Remainder should now be
      tens of ms (BLE interval) instead of hundreds of ms.

## Still available if A+D+E aren't enough

- [ ] **Option C (unreliable data channel)**: only if you see
  persistent ~100 ms spikes that track with WiFi packet loss. Would
  require opening a second PeerJS data channel with `reliable:false`
  for D-pad commands only, keeping the main channel reliable for text
  and UI messages. Non-trivial refactor.
- [ ] **Option B (drop release messages)**: only if you deliberately
  want a tap-to-toggle rather than hold-to-move control model.
