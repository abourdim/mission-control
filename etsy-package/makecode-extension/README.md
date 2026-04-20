# bit:playground companion

A drop-in MakeCode extension that pairs any BBC micro:bit V2 with the
[mission-control browser app](https://abourdim.github.io/mission-control/) —
no custom firmware compile, no `.hex` flashing, just **Add extension → paste
this repo's URL → one block in `on start`**.

## Quick start (MakeCode)

1. Open [makecode.microbit.org](https://makecode.microbit.org)
2. **Advanced → Extensions → search** `abourdim/mission-control-companion`
   (or paste the repo URL directly)
3. Drag the `start bit:playground companion` block into **on start**
4. Drag `stream sensors at 10 Hz` + `listen for commands from browser app`
   after it
5. Flash. Open the live demo, click Connect, pick your board.

That's it. Bluetooth UART ready. LED feedback on micro:bit responds to D-pad.

## Blocks

| Block | What it does |
|---|---|
| `start bit:playground companion` | Opens BLE UART service, shows a ● on LEDs when advertising, ✓ when connected. |
| `stream sensors at N Hz` | Pushes `{t,l,s,ax,ay,az,c,ba,bb}` JSON packets at N samples/sec. |
| `listen for commands from browser app` | Parses incoming `{type:"led\|text\|tone",...}` commands. |

## Why this exists

The full firmware in `makecode.ts` (shipped in the Etsy ZIP) is ~400 lines
and a bit opaque if you just want to hack on it. This extension condenses
the 80 % path into 3 blocks. Classrooms can mix bit:playground blocks with
their own logic without having to dig into the full firmware.

## Published

This folder is structured as a standalone MakeCode extension — `pxt.json`
declares it, `main.ts` is the example, `mission-control.ts` is the block
library. Push to a public GitHub repo and the MakeCode extension registry
discovers it automatically.

## License

MIT, same as the parent project.
