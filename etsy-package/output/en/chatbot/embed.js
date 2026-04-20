(function () {
  const RULES = [
    {
      "id": "ipad-safari",
      "keywords": [
        "ipad",
        "iphone",
        "ios",
        "safari"
      ],
      "answer": "Unfortunately iOS Safari doesn't support Web Bluetooth, so Mini Mission Control won't connect to a micro:bit on iPad or iPhone. Use Chrome or Edge on a laptop, desktop, or Android device instead."
    },
    {
      "id": "chrome-edge",
      "keywords": [
        "browser",
        "chrome",
        "edge",
        "firefox",
        "compatibility"
      ],
      "answer": "Mini Mission Control runs in **Chrome 89+** and **Edge 89+** on Windows, macOS, Linux, Chromebook, and Android. Firefox and Safari aren't supported because they lack Web Bluetooth."
    },
    {
      "id": "installation",
      "keywords": [
        "install",
        "download",
        "setup",
        "how do i start"
      ],
      "answer": "No installation — Mini Mission Control is a single HTML file you open in Chrome or Edge. Download the ZIP from Etsy, unzip, double-click `index.html`, click **Connect**, pick your board. That's it."
    },
    {
      "id": "microbit-version",
      "keywords": [
        "micro:bit v1",
        "microbit v1",
        "v1.5",
        "old micro:bit"
      ],
      "answer": "Mini Mission Control is built for **BBC micro:bit V2**. V1.5 works for BLE sensors but doesn't have a microphone or speaker, so sound features won't respond. V1.0 lacks Bluetooth LE entirely and can't connect."
    },
    {
      "id": "offline",
      "keywords": [
        "offline",
        "no internet",
        "wifi",
        "internet needed"
      ],
      "answer": "After the first page load, Mini Mission Control works fully offline — it's a PWA. Once opened on a classroom Chromebook, students can keep using it without a network connection. Perfect for school firewalls."
    },
    {
      "id": "multiple-students",
      "keywords": [
        "30 students",
        "classroom",
        "school",
        "multiple",
        "site license"
      ],
      "answer": "Each student opens the same HTML file locally. One Etsy purchase covers a single teacher; for a whole school site license, see the site-license option at checkout — up to 30 teachers at one site, same purchase."
    },
    {
      "id": "firmware",
      "keywords": [
        "firmware",
        "hex",
        "makecode",
        "flash"
      ],
      "answer": "Firmware is a short MakeCode program included as `makecode.ts`. Copy-paste into [makecode.microbit.org](https://makecode.microbit.org) (JavaScript mode), download the .hex, drag to your micro:bit. Once flashed, it works forever — Mini Mission Control pairs with it over BLE."
    },
    {
      "id": "languages",
      "keywords": [
        "french",
        "arabic",
        "spanish",
        "language",
        "translate"
      ],
      "answer": "Mini Mission Control ships in English, French, and Arabic (with full RTL layout). Switch at the top-right flag picker. Other languages can be added by editing `js/lang.js`."
    },
    {
      "id": "updates",
      "keywords": [
        "update",
        "new version",
        "upgrade",
        "lifetime"
      ],
      "answer": "All future versions are free forever from your Etsy purchase history — open your order, re-download the latest ZIP. There's no cloud auto-update; you choose when to grab a new version."
    },
    {
      "id": "data-privacy",
      "keywords": [
        "privacy",
        "data",
        "collect",
        "cloud",
        "sends"
      ],
      "answer": "Zero telemetry. Mini Mission Control has no server, no account, no cloud. All sensor data stays on the device. Your only network request is the first page load; after that everything runs in the browser tab."
    },
    {
      "id": "csv-export",
      "keywords": [
        "csv",
        "export",
        "save data",
        "spreadsheet"
      ],
      "answer": "The Graph tab records live sensor data and exports CSV — one row per sample, ready for Excel / Sheets / Python. You can also load back a saved CSV and replay it."
    },
    {
      "id": "D-pad-motors",
      "keywords": [
        "button",
        "motor",
        "move",
        "physical"
      ],
      "answer": "Mini Mission Control drives two D-pad connected to pins P1 and P2. The Motors tab has sliders for angle control, the D-Pad tab sends directional commands, and the 3D tab mirrors the board's orientation in real time."
    }
  ];
  const WIDGET_ID = '__mini-mission-control_chatbot__';

  // ---------- Rules engine ----------
  function matchRule(q) {
    const norm = q.toLowerCase();
    let best = null, bestScore = 0;
    for (const r of RULES) {
      const score = r.keywords.reduce((acc, k) => acc + (norm.includes(k) ? k.length : 0), 0);
      if (score > bestScore) { bestScore = score; best = r; }
    }
    return best;
  }

  async function ask(q) {
    if (window.__bitChatBotApi) {
      try {
        const r = await fetch(window.__bitChatBotApi, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q }),
        });
        if (r.ok) { const data = await r.json(); if (data.answer) return { text: data.answer, source: 'llm' }; }
      } catch {}
    }
    const rule = matchRule(q);
    if (rule) return { text: rule.answer, source: 'rule:' + rule.id };
    return {
      text: "I don't know that one yet. Message the seller through Etsy and they'll reply within 24 h.",
      source: 'fallback',
    };
  }

  // ---------- UI ----------
  if (document.getElementById(WIDGET_ID)) return;
  const host = document.createElement('div');
  host.id = WIDGET_ID;
  host.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;font-family:-apple-system,Segoe UI,sans-serif;';
  host.innerHTML = `
    <button id="btn" aria-label="Ask the product" style="
      width:56px;height:56px;border:none;border-radius:50%;
      background:#00ff88;color:#000;font-size:24px;cursor:pointer;
      box-shadow:0 6px 20px rgba(0,0,0,0.3);transition:transform .2s;">💬</button>
    <div id="panel" style="display:none;position:absolute;bottom:72px;right:0;
      width:360px;max-height:520px;background:#0a0e12;color:#e8ffe8;
      border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,0.6),0 0 0 1px rgba(0,255,136,0.4);
      overflow:hidden;display:flex;flex-direction:column;">
      <div style="padding:14px 16px;background:#00ff88;color:#000;font-weight:700;display:flex;align-items:center;gap:8px;">
        <span>💬 Ask the product</span>
        <button id="close" style="margin-left:auto;border:none;background:none;cursor:pointer;font-size:18px;color:#000;">×</button>
      </div>
      <div id="log" style="flex:1;overflow-y:auto;padding:12px 16px;font-size:13px;line-height:1.45;"></div>
      <form id="form" style="display:flex;border-top:1px solid #1a2028;">
        <input id="q" placeholder="Does it work on iPad?" style="flex:1;padding:10px 14px;background:#0a0e12;color:#e8ffe8;border:none;font-size:14px;outline:none;">
        <button type="submit" style="padding:10px 16px;background:#00ff88;color:#000;border:none;font-weight:700;cursor:pointer;">Ask</button>
      </form>
    </div>`;
  document.body.appendChild(host);

  const panel = host.querySelector('#panel');
  const log = host.querySelector('#log');
  const form = host.querySelector('#form');
  const input = host.querySelector('#q');

  host.querySelector('#btn').onclick = () => { panel.style.display = panel.style.display === 'none' ? 'flex' : 'none'; if (panel.style.display !== 'none') input.focus(); };
  host.querySelector('#close').onclick = () => { panel.style.display = 'none'; };

  function bubble(text, who) {
    const d = document.createElement('div');
    d.style.cssText = 'margin-bottom:10px;padding:8px 12px;border-radius:10px;max-width:85%;' +
      (who === 'user' ? 'background:#1a3a2a;align-self:flex-end;margin-left:auto;text-align:right;' : 'background:#1a2028;');
    d.textContent = text;
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
  }

  bubble('Hi! I can answer questions about this product. Try: "Does it work on iPad?" or "Do I need to install anything?"', 'bot');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    input.value = '';
    bubble(q, 'user');
    bubble('…', 'bot');
    const { text } = await ask(q);
    log.removeChild(log.lastChild);
    bubble(text, 'bot');
  };
})();