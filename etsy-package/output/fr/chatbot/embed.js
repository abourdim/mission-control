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
      "answer": "Malheureusement Safari iOS ne supporte pas le Web Bluetooth, donc Mini Mission Control ne pourra pas se connecter à un micro:bit sur iPad ou iPhone. Utilisez Chrome ou Edge sur un ordinateur ou un appareil Android."
    },
    {
      "id": "chrome-edge",
      "keywords": [
        "navigateur",
        "chrome",
        "edge",
        "firefox",
        "compatibilité"
      ],
      "answer": "Mini Mission Control fonctionne dans **Chrome 89+** et **Edge 89+** sur Windows, macOS, Linux, Chromebook et Android. Firefox et Safari ne sont pas supportés (pas de Web Bluetooth)."
    },
    {
      "id": "installation",
      "keywords": [
        "installer",
        "télécharger",
        "install",
        "démarrer"
      ],
      "answer": "Pas d'installation — Mini Mission Control est un fichier HTML que vous ouvrez dans Chrome ou Edge. Téléchargez le ZIP depuis Etsy, dézippez, double-cliquez `index.html`, cliquez **Connecter**, choisissez votre carte."
    },
    {
      "id": "microbit-version",
      "keywords": [
        "micro:bit v1",
        "microbit v1",
        "v1.5",
        "ancien"
      ],
      "answer": "Mini Mission Control est conçu pour le **BBC micro:bit V2**. Le V1.5 fonctionne pour les capteurs BLE mais n'a pas de micro ni haut-parleur. Le V1.0 n'a pas de Bluetooth LE et ne peut pas se connecter."
    },
    {
      "id": "offline",
      "keywords": [
        "hors ligne",
        "offline",
        "sans internet",
        "wifi"
      ],
      "answer": "Après le premier chargement, Mini Mission Control fonctionne entièrement hors ligne (c'est une PWA). Parfait pour les pare-feu d'école."
    },
    {
      "id": "multiple-students",
      "keywords": [
        "30 élèves",
        "classe",
        "école",
        "licence"
      ],
      "answer": "Chaque élève ouvre le même fichier HTML localement. Un achat Etsy = un enseignant. Pour toute une école, voir la licence site (jusqu'à 30 enseignants par site)."
    },
    {
      "id": "firmware",
      "keywords": [
        "firmware",
        "hex",
        "makecode",
        "flasher"
      ],
      "answer": "Le firmware est un court programme MakeCode inclus (`makecode.ts`). Copiez-collez dans [makecode.microbit.org](https://makecode.microbit.org), téléchargez le .hex, glissez sur votre micro:bit. Fonctionne ensuite à vie."
    },
    {
      "id": "languages",
      "keywords": [
        "français",
        "arabe",
        "langue",
        "traduction"
      ],
      "answer": "Mini Mission Control est disponible en anglais, français et arabe (avec mise en page RTL complète). Changer de langue depuis le sélecteur de drapeau en haut à droite."
    },
    {
      "id": "updates",
      "keywords": [
        "mise à jour",
        "nouvelle version",
        "lifetime"
      ],
      "answer": "Toutes les futures versions sont gratuites à vie depuis votre historique d'achat Etsy. Pas de mise à jour cloud automatique — vous choisissez quand récupérer une nouvelle version."
    },
    {
      "id": "data-privacy",
      "keywords": [
        "confidentialité",
        "privacy",
        "données",
        "cloud"
      ],
      "answer": "Zéro télémétrie. Mini Mission Control n'a ni serveur, ni compte, ni cloud. Toutes les données des capteurs restent sur votre appareil."
    },
    {
      "id": "csv-export",
      "keywords": [
        "csv",
        "export",
        "données",
        "tableur"
      ],
      "answer": "L'onglet Graphique enregistre les données des capteurs en direct et exporte en CSV — une ligne par échantillon, prêt pour Excel / Sheets / Python."
    },
    {
      "id": "D-pad-motors",
      "keywords": [
        "button",
        "moteur",
        "bouger"
      ],
      "answer": "Mini Mission Control pilote deux D-pad connectés aux broches P1 et P2. L'onglet Moteurs a des curseurs, l'onglet Manette envoie des commandes directionnelles."
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