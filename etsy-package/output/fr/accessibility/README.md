# Mini Mission Control — Accessibility Pack

Materials that meet common classroom accessibility requirements for
low-vision, blind, and Braille-reading students. These files are bundled
with the standard Etsy ZIP at no extra charge.

## Included

### Audio descriptions (`audio-descriptions/`)
- `*.txt` — source transcript for each printable (30-second narrations)
- `*.wav` / `*.mp3` — machine-narrated audio (OS-native TTS; regenerate
  with `node etsy-package/tools/generate-accessibility.mjs` on your own
  machine to pick up a different voice)

### Braille (`braille/`)
- `*.brl` — Unicode Grade 1 Braille (U+2800-U+28FF), one file per
  printable element
- `printable.html` — combined embosser-friendly sheet. Print on heavy
  paper and emboss with a slate &amp; stylus, or send direct to a
  refreshable Braille display / Perkins-compatible embosser

## Standards alignment

- **WCAG 2.1 AA** text descriptions for all imagery (our printables).
- **U.S. IDEA** — accessibility pack supports required accommodations for
  IEPs that specify Braille or audio materials.
- **UK SEND** — meets the typical "alternative format" request from
  Local Authority reviewers.
- **EN 301 549 v3.2** — digital procurement standard for EU public-sector.

## How to regenerate

```
node etsy-package/tools/generate-accessibility.mjs
```

Uses OS-native TTS (no API keys, no cloud). Falls back to text
transcripts only if no TTS engine is available.

## Not a substitute for

A trained teacher of the visually impaired or a certified Braille
transcriber — ship this pack AS-IS only for low-stakes use (reward
stickers, classroom labels, poster text). Formal curriculum and
assessment materials should still go through a certified BANA
transcriber.
