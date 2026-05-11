const input = document.getElementById('input');
const correctBtn = document.getElementById('correct');
const clearBtn = document.getElementById('clear');
const recordBtn = document.getElementById('record');
const recordLabel = recordBtn.querySelector('.label');
const autoCorrect = document.getElementById('auto-correct');
const statusEl = document.getElementById('status');
const page = document.getElementById('page');
const changes = document.getElementById('changes');
const changeList = document.getElementById('change-list');
const changeCount = document.getElementById('change-count');

const API = 'https://api.languagetool.org/v2/check';
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition = null;
let recording = false;
let baseText = '';

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

async function checkText(text) {
  const body = new URLSearchParams({ text, language: 'de-DE' });
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`LanguageTool antwortete mit ${res.status}`);
  return res.json();
}

function applyCorrections(text, matches) {
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

function renderChanges(applied) {
  changeList.innerHTML = '';
  changeCount.textContent = String(applied.length);
  if (applied.length === 0) {
    changes.hidden = true;
    return;
  }
  changes.hidden = false;
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
    changeList.appendChild(li);
  }
}

async function runCorrection() {
  const text = input.value.trim();
  if (!text) {
    statusEl.textContent = 'Bitte zuerst Text eingeben oder diktieren.';
    return;
  }
  statusEl.textContent = 'Prüfe …';
  correctBtn.disabled = true;
  try {
    const data = await checkText(text);
    const { corrected, applied } = applyCorrections(text, data.matches || []);
    input.value = corrected;
    renderBook(corrected);
    renderChanges(applied);
    statusEl.textContent = applied.length === 0
      ? 'Keine Korrekturen nötig.'
      : `${applied.length} Korrektur${applied.length === 1 ? '' : 'en'} angewendet.`;
  } catch (err) {
    statusEl.textContent = `Fehler: ${err.message}`;
  } finally {
    correctBtn.disabled = false;
  }
}

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
    if (interim) {
      statusEl.innerHTML = `Aufnahme läuft … <span class="interim">${escapeHtml(interim)}</span>`;
    } else {
      statusEl.textContent = 'Aufnahme läuft …';
    }
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
      try { r.start(); } catch (_) { /* ignore double-start */ }
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
  recordBtn.classList.add('recording');
  recordLabel.textContent = 'Aufnahme stoppen';
  statusEl.textContent = 'Aufnahme läuft …';
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
  recordBtn.classList.remove('recording');
  recordLabel.textContent = 'Diktieren';
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
  renderChanges([]);
  statusEl.textContent = '';
});

if (!Recognition) {
  recordBtn.disabled = true;
  recordBtn.title = 'Spracherkennung in diesem Browser nicht verfügbar';
}

renderBook('');
