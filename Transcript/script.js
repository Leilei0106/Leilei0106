const input = document.getElementById('input');
const correctBtn = document.getElementById('correct');
const clearBtn = document.getElementById('clear');
const statusEl = document.getElementById('status');
const page = document.getElementById('page');
const changes = document.getElementById('changes');
const changeList = document.getElementById('change-list');
const changeCount = document.getElementById('change-count');

const API = 'https://api.languagetool.org/v2/check';

async function checkText(text) {
  const body = new URLSearchParams({
    text,
    language: 'de-DE',
  });
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`LanguageTool antwortete mit ${res.status}`);
  }
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

correctBtn.addEventListener('click', async () => {
  const text = input.value.trim();
  if (!text) {
    statusEl.textContent = 'Bitte zuerst Text eingeben.';
    return;
  }
  statusEl.textContent = 'Prüfe …';
  correctBtn.disabled = true;
  try {
    const data = await checkText(text);
    const { corrected, applied } = applyCorrections(text, data.matches || []);
    renderBook(corrected);
    renderChanges(applied);
    statusEl.textContent =
      applied.length === 0
        ? 'Keine Korrekturen nötig.'
        : `${applied.length} Korrektur${applied.length === 1 ? '' : 'en'} angewendet.`;
  } catch (err) {
    statusEl.textContent = `Fehler: ${err.message}`;
  } finally {
    correctBtn.disabled = false;
  }
});

clearBtn.addEventListener('click', () => {
  input.value = '';
  renderBook('');
  renderChanges([]);
  statusEl.textContent = '';
});

renderBook('');
