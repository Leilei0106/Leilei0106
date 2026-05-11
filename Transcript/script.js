const input = document.getElementById('input');
const correctBtn = document.getElementById('correct');
const clearBtn = document.getElementById('clear');
const recordBtn = document.getElementById('record');
const recordLabel = recordBtn.querySelector('.label');
const installBtn = document.getElementById('install');
const autoCorrect = document.getElementById('auto-correct');
const statusEl = document.getElementById('status');
const page = document.getElementById('page');
const changes = document.getElementById('changes');
const changesSummary = document.getElementById('changes-summary');
const changeBody = document.getElementById('change-body');
const changeCount = document.getElementById('change-count');
const viz = document.getElementById('viz');
const taWrap = document.getElementById('ta-wrap');
const engineEl = document.getElementById('engine');
const keyEl = document.getElementById('api-key');
const modelEl = document.getElementById('model');
const expCopy = document.getElementById('exp-copy');
const expTxt = document.getElementById('exp-txt');
const expMd = document.getElementById('exp-md');
const expHtml = document.getElementById('exp-html');
const expPdf = document.getElementById('exp-pdf');

const LT_API = 'https://api.languagetool.org/v2/check';
const CLAUDE_API = 'https://api.anthropic.com/v1/messages';
const SETTINGS_KEY = 'transcript-settings-v1';
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const CLAUDE_SYSTEM_PROMPT = `Du bist ein erfahrener deutscher Lektor und korrigierst diktierte oder getippte Texte vollständig für eine geschriebene, schriftsprachliche Fassung.

Korrigiere und passe an:
- Rechtschreibung und Grammatik
- Zeichensetzung (Kommas, Punkte, Anführungszeichen)
- Satzstellung und Satzbau
- Wandle umgangssprachliche, gesprochene oder unvollständige Formulierungen in klares, korrektes Schriftdeutsch um
- Setze sinnvolle Absätze, wo es den Lesefluss verbessert

Bewahre:
- Inhalt, Aussagen und Sinn
- Die Stilrichtung des Originals (formell bleibt formell, locker bleibt locker – nur ohne Mündlichkeit)
- Eigennamen, Zitate, Fachbegriffe

Antworte ausschließlich mit dem korrigierten Text. Keine Einleitung, keine Erklärung, keine Anführungszeichen, keine Markdown-Formatierung.`;

let recognition = null;
let recording = false;
let baseText = '';
let deferredInstall = null;

// ---------- Settings ----------

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (s.engine) engineEl.value = s.engine;
    if (s.apiKey) keyEl.value = s.apiKey;
    if (s.model) modelEl.value = s.model;
  } catch (_) { /* ignore */ }
}

function saveSettings() {
  const s = { engine: engineEl.value, apiKey: keyEl.value, model: modelEl.value };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch (_) { /* ignore quota */ }
}

[engineEl, keyEl, modelEl].forEach((el) => {
  el.addEventListener('change', saveSettings);
  el.addEventListener('blur', saveSettings);
});

// ---------- Utilities ----------

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function setRecordingUi(on) {
  recordBtn.classList.toggle('recording', on);
  taWrap.classList.toggle('recording', on);
  viz.hidden = !on;
  recordLabel.textContent = on ? 'Aufnahme stoppen' : 'Diktieren';
}

// Word-level diff via LCS.
function wordDiff(a, b) {
  const ta = a.split(/(\s+)/);
  const tb = b.split(/(\s+)/);
  const m = ta.length, n = tb.length;
  const dp = Array(m + 1);
  for (let i = 0; i <= m; i++) dp[i] = new Int32Array(n + 1);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (ta[i - 1] === tb[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
      else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const out = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (ta[i - 1] === tb[j - 1]) { out.unshift({ type: 'eq', text: ta[i - 1] }); i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) { out.unshift({ type: 'del', text: ta[i - 1] }); i--; }
    else { out.unshift({ type: 'ins', text: tb[j - 1] }); j--; }
  }
  while (i > 0) { out.unshift({ type: 'del', text: ta[i - 1] }); i--; }
  while (j > 0) { out.unshift({ type: 'ins', text: tb[j - 1] }); j--; }
  const merged = [];
  for (const part of out) {
    if (merged.length && merged[merged.length - 1].type === part.type) {
      merged[merged.length - 1].text += part.text;
    } else {
      merged.push({ ...part });
    }
  }
  return merged;
}

// ---------- Rendering ----------

function renderBook(text) {
  page.innerHTML = '';
  if (!text.trim()) {
    const p = document.createElement('p');
    p.className = 'placeholder';
    p.textContent = 'Hier erscheint dein korrigierter Text im Buchdesign.';
    page.appendChild(p);
    return;
  }
  const paragraphs = text.split(/\n\s*\n+/);
  for (const para of paragraphs) {
    const trimmed = para.replace(/\n/g, ' ').trim();
    if (!trimmed) continue;
    const p = document.createElement('p');
    p.textContent = trimmed;
    page.appendChild(p);
  }
}

function renderLanguageToolChanges(applied) {
  changeBody.innerHTML = '';
  changeCount.textContent = String(applied.length);
  changesSummary.firstChild.textContent = 'Vorgenommene Korrekturen (';
  if (applied.length === 0) {
    changes.hidden = true;
    return;
  }
  changes.hidden = false;
  const ol = document.createElement('ol');
  ol.className = 'lt-list';
  for (const c of applied) {
    const li = document.createElement('li');
    const del = document.createElement('del');
    del.textContent = c.original;
    const ins = document.createElement('ins');
    ins.textContent = c.replacement;
    li.append(del, ' → ', ins);
    if (c.message) {
      const span = document.createElement('span');
      span.textContent = ` (${c.message})`;
      span.style.color = 'var(--muted)';
      span.style.fontSize = '0.85em';
      li.appendChild(span);
    }
    ol.appendChild(li);
  }
  changeBody.appendChild(ol);
}

function renderClaudeDiff(original, corrected, meta) {
  changeBody.innerHTML = '';
  const parts = wordDiff(original, corrected);
  const changedParts = parts.filter((p) => p.type !== 'eq').length;
  changeCount.textContent = String(changedParts);
  changesSummary.firstChild.textContent = 'KI-Korrekturen (';
  changes.hidden = false;

  if (meta) {
    const m = document.createElement('div');
    m.className = 'diff-meta';
    m.textContent = meta;
    changeBody.appendChild(m);
  }

  const diff = document.createElement('div');
  diff.className = 'diff';
  for (const part of parts) {
    if (part.type === 'eq') {
      diff.appendChild(document.createTextNode(part.text));
    } else if (part.type === 'del') {
      const del = document.createElement('del');
      del.textContent = part.text;
      diff.appendChild(del);
    } else {
      const ins = document.createElement('ins');
      ins.textContent = part.text;
      diff.appendChild(ins);
    }
  }
  changeBody.appendChild(diff);
}

// ---------- LanguageTool engine ----------

async function checkWithLanguageTool(text) {
  const body = new URLSearchParams({ text, language: 'de-DE' });
  const res = await fetch(LT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`LanguageTool antwortete mit ${res.status}`);
  return res.json();
}

function applyLanguageToolCorrections(text, matches) {
  const sorted = [...matches].sort((a, b) => b.offset - a.offset);
  let corrected = text;
  const applied = [];
  for (const m of sorted) {
    if (!m.replacements || m.replacements.length === 0) continue;
    const replacement = m.replacements[0].value;
    const original = corrected.substr(m.offset, m.length);
    if (original === replacement) continue;
    corrected =
      corrected.slice(0, m.offset) +
      replacement +
      corrected.slice(m.offset + m.length);
    applied.unshift({ original, replacement, message: m.message });
  }
  return { corrected, applied };
}

// ---------- Claude engine ----------

async function correctWithClaude(text, apiKey, model) {
  const res = await fetch(CLAUDE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: [
        {
          type: 'text',
          text: CLAUDE_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: text }],
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j?.error?.message || JSON.stringify(j).slice(0, 200);
    } catch (_) {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`Claude (${res.status}): ${detail || 'Unbekannter Fehler'}`);
  }

  const data = await res.json();
  const text_out = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
  return { corrected: text_out || text, usage: data.usage, model: data.model };
}

// ---------- Correction dispatcher ----------

async function runCorrection() {
  const text = input.value.trim();
  if (!text) {
    statusEl.textContent = 'Bitte zuerst Text eingeben oder diktieren.';
    return;
  }

  const engine = engineEl.value;
  const useClaude = engine === 'claude' && keyEl.value.trim();

  correctBtn.disabled = true;
  statusEl.textContent = useClaude ? 'Claude prüft …' : 'Prüfe …';

  try {
    if (engine === 'claude' && !keyEl.value.trim()) {
      statusEl.textContent = 'Kein Anthropic API-Schlüssel gesetzt. Bitte in den Einstellungen eintragen.';
      return;
    }

    if (useClaude) {
      const result = await correctWithClaude(text, keyEl.value.trim(), modelEl.value);
      input.value = result.corrected;
      renderBook(result.corrected);
      const u = result.usage || {};
      const cached = u.cache_read_input_tokens || 0;
      const meta = `Modell: ${result.model || modelEl.value} · in: ${u.input_tokens || 0} · out: ${u.output_tokens || 0}${cached ? ` · cache: ${cached}` : ''}`;
      renderClaudeDiff(text, result.corrected, meta);
      statusEl.textContent = 'KI-Korrektur fertig.';
    } else {
      const data = await checkWithLanguageTool(text);
      const { corrected, applied } = applyLanguageToolCorrections(text, data.matches || []);
      input.value = corrected;
      renderBook(corrected);
      renderLanguageToolChanges(applied);
      statusEl.textContent = applied.length === 0
        ? 'Keine Korrekturen nötig.'
        : `${applied.length} Korrektur${applied.length === 1 ? '' : 'en'} angewendet.`;
    }
  } catch (err) {
    statusEl.textContent = `Fehler: ${err.message}`;
  } finally {
    correctBtn.disabled = false;
  }
}

// ---------- Export ----------

function currentText() {
  return input.value.trim();
}

function dateStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function buildBookHtml(text) {
  const paragraphs = text.split(/\n\s*\n+/)
    .map((p) => p.replace(/\n/g, ' ').trim())
    .filter(Boolean);
  const body = paragraphs.map((p) => `    <p>${escapeHtml(p)}</p>`).join('\n');
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Transcript</title>
  <style>
    @page { margin: 1.8cm; }
    body { background: #ece5d3; margin: 0; padding: 2rem; font-family: system-ui, -apple-system, sans-serif; }
    .page {
      background: #f6f1e3;
      max-width: 620px;
      margin: 0 auto;
      padding: 4rem 3rem;
      font-family: "Georgia", "Times New Roman", serif;
      font-size: 1.05rem;
      line-height: 1.7;
      text-align: justify;
      hyphens: auto;
      color: #2b2722;
      box-shadow: 0 1px 2px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.15);
      border-radius: 2px;
    }
    .page p { margin: 0 0 1rem; }
    .page p:first-of-type::first-letter {
      font-size: 3.4rem;
      float: left;
      line-height: 0.9;
      padding: 0.3rem 0.5rem 0 0;
      font-weight: 700;
      color: #8a6d3b;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .page { box-shadow: none; max-width: none; padding: 0; background: #fff; }
      .page p:first-of-type::first-letter { color: #444; }
    }
  </style>
</head>
<body>
  <article class="page">
${body}
  </article>
</body>
</html>
`;
}

async function exportCopy() {
  const text = currentText();
  if (!text) { statusEl.textContent = 'Kein Text zum Exportieren.'; return; }
  try {
    await navigator.clipboard.writeText(text);
    statusEl.textContent = 'In die Zwischenablage kopiert.';
  } catch (e) {
    // Fallback for older / restricted browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      statusEl.textContent = 'In die Zwischenablage kopiert.';
    } catch (_) {
      statusEl.textContent = `Kopieren fehlgeschlagen: ${e.message}`;
    }
    document.body.removeChild(ta);
  }
}

function exportTxt() {
  const text = currentText();
  if (!text) { statusEl.textContent = 'Kein Text zum Exportieren.'; return; }
  download(new Blob([text + '\n'], { type: 'text/plain;charset=utf-8' }), `transcript-${dateStamp()}.txt`);
  statusEl.textContent = 'TXT-Datei heruntergeladen.';
}

function exportMd() {
  const text = currentText();
  if (!text) { statusEl.textContent = 'Kein Text zum Exportieren.'; return; }
  const md = `# Transcript\n\n*Erstellt am ${new Date().toLocaleString('de-DE')}*\n\n${text}\n`;
  download(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `transcript-${dateStamp()}.md`);
  statusEl.textContent = 'Markdown-Datei heruntergeladen.';
}

function exportHtml() {
  const text = currentText();
  if (!text) { statusEl.textContent = 'Kein Text zum Exportieren.'; return; }
  download(new Blob([buildBookHtml(text)], { type: 'text/html;charset=utf-8' }), `transcript-${dateStamp()}.html`);
  statusEl.textContent = 'HTML-Datei heruntergeladen.';
}

function exportPdf() {
  if (!currentText()) { statusEl.textContent = 'Kein Text zum Exportieren.'; return; }
  statusEl.textContent = 'Druckdialog geöffnet — dort „Als PDF speichern“ wählen.';
  window.print();
}

expCopy.addEventListener('click', exportCopy);
expTxt.addEventListener('click', exportTxt);
expMd.addEventListener('click', exportMd);
expHtml.addEventListener('click', exportHtml);
expPdf.addEventListener('click', exportPdf);

// ---------- Speech Recognition ----------

function setupRecognition() {
  const r = new Recognition();
  r.lang = 'de-DE';
  r.continuous = true;
  r.interimResults = true;

  r.onresult = (event) => {
    let interim = '';
    let finalChunk = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) finalChunk += res[0].transcript;
      else interim += res[0].transcript;
    }
    if (finalChunk) {
      const sep = baseText && !baseText.endsWith(' ') ? ' ' : '';
      baseText = (baseText + sep + finalChunk.trim()).replace(/\s+/g, ' ');
      input.value = baseText;
    }
    statusEl.innerHTML = interim
      ? `<span class="interim">${escapeHtml(interim)}</span>`
      : 'Ich höre zu …';
  };

  r.onerror = (e) => {
    const msg = e.error === 'not-allowed'
      ? 'Mikrofonzugriff verweigert. Bitte erlauben und erneut versuchen.'
      : `Mikrofon-Fehler: ${e.error}`;
    statusEl.textContent = msg;
    stopRecording();
  };

  r.onend = () => {
    if (recording) {
      try { r.start(); } catch (_) { /* ignore */ }
    }
  };

  return r;
}

function startRecording() {
  if (!Recognition) {
    statusEl.textContent = 'Spracherkennung wird in diesem Browser nicht unterstützt. Probiere Chrome, Edge oder Safari.';
    return;
  }
  recognition = setupRecognition();
  baseText = input.value;
  recording = true;
  setRecordingUi(true);
  statusEl.textContent = 'Ich höre zu …';
  try {
    recognition.start();
  } catch (e) {
    statusEl.textContent = `Start fehlgeschlagen: ${e.message}`;
    stopRecording();
  }
}

function stopRecording() {
  const wasRecording = recording;
  recording = false;
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
    recognition = null;
  }
  setRecordingUi(false);
  if (wasRecording) {
    statusEl.textContent = 'Aufnahme beendet.';
    if (autoCorrect.checked && input.value.trim()) {
      runCorrection();
    }
  }
}

recordBtn.addEventListener('click', () => {
  if (recording) stopRecording();
  else startRecording();
});

correctBtn.addEventListener('click', runCorrection);

clearBtn.addEventListener('click', () => {
  if (recording) stopRecording();
  input.value = '';
  baseText = '';
  renderBook('');
  changes.hidden = true;
  changeBody.innerHTML = '';
  changeCount.textContent = '0';
  statusEl.textContent = '';
});

if (!Recognition) {
  recordBtn.disabled = true;
  recordBtn.title = 'Spracherkennung in diesem Browser nicht verfügbar';
}

loadSettings();
renderBook('');

// ---------- PWA: install prompt ----------

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstall = event;
  installBtn.hidden = false;
});

installBtn.addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  installBtn.hidden = true;
});

window.addEventListener('appinstalled', () => {
  installBtn.hidden = true;
  statusEl.textContent = 'App installiert.';
});

// ---------- PWA: register service worker ----------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* ignore */ });
  });
}
