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
                 └─ basic.showArrow    ~ 400 ms  ⚠️ BLOCKING
                    └─ LED update
```

## Suspects ranked by likely impact

- [ ] **1. `basic.showArrow` / `basic.showIcon` blocks ~400 ms** ⚠️
  The single biggest factor. MakeCode holds the fiber until the icon
  animation finishes. Back-to-back taps queue up behind the previous
  animation and feel laggy.
  Fix: pass interval `0` as the second argument, e.g.
  `basic.showArrow(ArrowNames.North, 0)` and
  `basic.showIcon(IconNames.Square, 0)`.

- [ ] **2. BLE connection interval (30–100 ms)**
  Every write waits for the next BLE slot. Not controllable from JS or
  MakeCode — the OS negotiates it. This is a hard floor.

- [ ] **3. WebRTC round-trip iPhone → laptop (30–200 ms)**
  Already measured in the app as `[RTT]` log lines. Compare with
  perceived total lag to split "network" vs "BLE + firmware".

- [ ] **4. `sendLine` chunking**
  `ble-uart.js` iterates the payload in 20-byte chunks with
  `await sleep(15)` between each. 12-byte D-pad commands = 1 chunk =
  15 ms. Negligible for D-pad; matters only for long text messages.

- [ ] **5. Double-send on press + release**
  Every D-pad button sends `pressed:true` on pointerdown AND
  `pressed:false` on pointerup. Second message can race the first and
  overwrite the arrow with the STOP square mid-animation. Compounds
  with #1.

- [ ] **6. Heartbeat fighting arrows**
  `basic.forever` plots a center dot every 2 s. Gated by `lastCmdAt`
  for 1.5 s after each command. Unlikely to cause the lag, but worth
  keeping in mind.

## Measurement plan (do this first, before changing anything)

- [ ] Open the **Logs** panel on the iPhone or laptop.
- [ ] Press the D-pad a few times, watch for `[RTT] XXms (avg YY)`.
- [ ] Time the visible LED update vs the `[TX][DPAD]` log line.
- [ ] Subtract RTT from total perceived lag → remainder is
      BLE + firmware. If ~400 ms, confirms blocking showArrow.
      If ~50 ms, it's BLE interval (unfixable from code).

## Tuning options, ranked by impact vs. effort

| # | Change | Expected win | Risk |
|---|---|---|---|
| A | Pass `0` as the interval to `basic.showArrow` / `basic.showIcon` | **~350 ms** off every command | None |
| B | Send only the press event, not the release; use explicit STOP | Halves traffic, kills the "square-overwrites-arrow" race | Changes control semantics |
| C | Switch D-pad messages to unreliable WebRTC data channel | Small gain on lossy networks | Commands can be dropped on bad Wi-Fi |
| D | Reduce 20-byte chunk sleep from 15 ms to 5 ms in `sendLine` | ~10 ms per command | Some micro:bits may drop bytes |
| E | Show a local HUD confirmation on the iPhone immediately on press | 0 ms real, feels snappier | Purely perceptual |

## Recommendation

- [ ] Start with **A** alone — 2-character change to `makecode.ts`,
      no risk, probably fixes 80% of the perceived lag.
- [ ] Then add **E** — instant on-screen feedback on the iPhone so it
      always feels responsive regardless of network/BLE state.
- [ ] Consider **B** only if the two-message-per-tap semantics are
      confusing in testing.
- [ ] **C** and **D** are last-resort; skip unless A+B+E aren't enough.

## Decision needed

- [ ] User to pick which subset (A / A+E / A+B+E / …) to apply.
  Recommendation: **A + E**.
