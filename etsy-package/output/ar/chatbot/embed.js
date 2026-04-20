(function () {
  const RULES = [
    {
      "id": "ipad-safari",
      "keywords": [
        "ipad",
        "iphone",
        "ios",
        "safari",
        "آيباد",
        "آيفون"
      ],
      "answer": "للأسف متصفح Safari على iOS لا يدعم Web Bluetooth، لذا لن يتمكن Mini Mission Control من الاتصال بجهاز micro:bit على iPad أو iPhone. استخدم Chrome أو Edge على حاسوب محمول أو جهاز Android."
    },
    {
      "id": "chrome-edge",
      "keywords": [
        "متصفح",
        "chrome",
        "edge",
        "firefox",
        "توافق"
      ],
      "answer": "Mini Mission Control يعمل في **Chrome 89+** و **Edge 89+** على Windows وmacOS وLinux وChromebook وAndroid. Firefox وSafari غير مدعومَين (لا يوجد Web Bluetooth)."
    },
    {
      "id": "installation",
      "keywords": [
        "تثبيت",
        "تحميل",
        "install",
        "بدء"
      ],
      "answer": "بدون تثبيت — Mini Mission Control ملف HTML تفتحه في Chrome أو Edge. حمّل ZIP من Etsy، فك الضغط، انقر مزدوجاً على `index.html`، اضغط **اتصال**، اختر لوحتك."
    },
    {
      "id": "microbit-version",
      "keywords": [
        "micro:bit v1",
        "microbit v1",
        "v1.5",
        "قديم"
      ],
      "answer": "Mini Mission Control مُصمَّم لـ **BBC micro:bit V2**. V1.5 يعمل لمستشعرات BLE لكنه بدون ميكروفون أو مكبر صوت. V1.0 لا يدعم Bluetooth LE ولا يمكنه الاتصال."
    },
    {
      "id": "offline",
      "keywords": [
        "دون اتصال",
        "offline",
        "بدون إنترنت",
        "wifi"
      ],
      "answer": "بعد التحميل الأول، يعمل Mini Mission Control دون اتصال بالكامل (PWA). مثالي لجدران الحماية المدرسية."
    },
    {
      "id": "multiple-students",
      "keywords": [
        "30 طالب",
        "فصل",
        "مدرسة",
        "ترخيص"
      ],
      "answer": "كل طالب يفتح نفس ملف HTML محلياً. شراء Etsy واحد = معلم واحد. للمدرسة بأكملها، راجع ترخيص الموقع (حتى 30 معلم لكل موقع)."
    },
    {
      "id": "firmware",
      "keywords": [
        "فيرموير",
        "firmware",
        "hex",
        "makecode",
        "flash"
      ],
      "answer": "الفيرموير برنامج MakeCode قصير مُرفق (`makecode.ts`). انسخ والصق في [makecode.microbit.org](https://makecode.microbit.org)، حمّل ملف .hex، اسحبه إلى micro:bit. يعمل بعدها مدى الحياة."
    },
    {
      "id": "languages",
      "keywords": [
        "فرنسي",
        "عربي",
        "إنجليزي",
        "لغة",
        "ترجمة"
      ],
      "answer": "Mini Mission Control متوفر بالإنجليزية والفرنسية والعربية (مع تخطيط RTL كامل). غيّر اللغة من منتقي العلم في أعلى اليمين."
    },
    {
      "id": "updates",
      "keywords": [
        "تحديث",
        "نسخة جديدة",
        "lifetime"
      ],
      "answer": "كل الإصدارات المستقبلية مجانية مدى الحياة من تاريخ مشترياتك في Etsy. لا تحديثات سحابية تلقائية — أنت تختار متى تحصل على نسخة جديدة."
    },
    {
      "id": "data-privacy",
      "keywords": [
        "خصوصية",
        "بيانات",
        "سحاب"
      ],
      "answer": "صفر قياسات عن بُعد. Mini Mission Control ليس له خادم ولا حساب ولا سحاب. كل بيانات المستشعرات تبقى على جهازك."
    },
    {
      "id": "csv-export",
      "keywords": [
        "csv",
        "تصدير",
        "جدول بيانات"
      ],
      "answer": "علامة تبويب الرسم البياني تسجل بيانات المستشعرات حية وتصدرها بصيغة CSV — صف لكل عينة، جاهز لـ Excel / Sheets / Python."
    },
    {
      "id": "D-pad-motors",
      "keywords": [
        "button",
        "محرك",
        "تحريك"
      ],
      "answer": "Mini Mission Control يقود محركَي button متصلَين بالمنفذَين P1 وP2. علامة تبويب المحركات بها منزلقات، علامة تبويب لوحة اللعب ترسل أوامر اتجاهية."
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