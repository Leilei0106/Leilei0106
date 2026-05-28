(() => {
  'use strict';

  const STORAGE_KEY = 'tankrechner.entries.v1';

  const $ = (id) => document.getElementById(id);

  const fmtNum = (n, digits = 2) =>
    Number.isFinite(n)
      ? n.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })
      : '–';

  const fmtEuro = (n) =>
    Number.isFinite(n)
      ? n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
      : '–';

  const fmtDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function sortedAsc(entries) {
    return [...entries].sort((a, b) => {
      if (a.odometer !== b.odometer) return a.odometer - b.odometer;
      return new Date(a.date) - new Date(b.date);
    });
  }

  function sortedDesc(entries) {
    return sortedAsc(entries).reverse();
  }

  // Switch tabs
  function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.tab-panel');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        tabs.forEach((t) => t.classList.toggle('active', t === tab));
        panels.forEach((p) => p.classList.toggle('active', p.id === `tab-${target}`));
        if (target === 'stats') renderStats();
        if (target === 'history') renderHistory();
      });
    });
  }

  function setMessage(text, type = '') {
    const el = $('formMessage');
    el.textContent = text;
    el.className = 'form-message' + (type ? ' ' + type : '');
    if (text) {
      setTimeout(() => {
        if (el.textContent === text) {
          el.textContent = '';
          el.className = 'form-message';
        }
      }, 3500);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    const date = $('date').value;
    const odometer = parseFloat($('odometer').value);
    const liters = parseFloat($('liters').value);
    const pricePerLiterInput = $('pricePerLiter').value.trim();
    const totalCostInput = $('totalCost').value.trim();
    const fullTank = $('fullTank').checked;
    const note = $('note').value.trim();

    if (!date || !Number.isFinite(odometer) || !Number.isFinite(liters) || liters <= 0 || odometer < 0) {
      setMessage('Bitte Datum, Kilometerstand und Liter ausfüllen.', 'error');
      return;
    }

    let pricePerLiter = pricePerLiterInput ? parseFloat(pricePerLiterInput) : NaN;
    let totalCost = totalCostInput ? parseFloat(totalCostInput) : NaN;

    if (!Number.isFinite(pricePerLiter) && Number.isFinite(totalCost) && liters > 0) {
      pricePerLiter = totalCost / liters;
    }
    if (!Number.isFinite(totalCost) && Number.isFinite(pricePerLiter)) {
      totalCost = pricePerLiter * liters;
    }

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      date,
      odometer,
      liters,
      pricePerLiter: Number.isFinite(pricePerLiter) ? pricePerLiter : null,
      totalCost: Number.isFinite(totalCost) ? totalCost : null,
      fullTank,
      note,
    };

    const entries = loadEntries();

    const last = sortedAsc(entries).pop();
    if (last && entry.odometer < last.odometer) {
      setMessage('Hinweis: Kilometerstand ist kleiner als der letzte. Trotzdem gespeichert.', 'error');
    }

    entries.push(entry);
    saveEntries(entries);

    showLastResult(entries, entry);

    $('fuelForm').reset();
    $('date').valueAsDate = new Date();
    $('fullTank').checked = true;
    setMessage('Gespeichert ✓', 'success');
  }

  function showLastResult(entries, currentEntry) {
    const sorted = sortedAsc(entries);
    const idx = sorted.findIndex((e) => e.id === currentEntry.id);
    const prev = idx > 0 ? sorted[idx - 1] : null;

    const box = $('lastResult');
    if (!prev) {
      box.classList.remove('hidden');
      $('r-distance').textContent = '– (erste Tankung)';
      $('r-consumption').textContent = '– (Referenz)';
      $('r-cost100').textContent =
        Number.isFinite(currentEntry.totalCost) ? fmtEuro(currentEntry.totalCost) + ' getankt' : '–';
      return;
    }

    const distance = currentEntry.odometer - prev.odometer;
    let consumption = null;
    if (distance > 0 && currentEntry.fullTank) {
      consumption = (currentEntry.liters / distance) * 100;
    }
    let cost100 = null;
    if (distance > 0 && Number.isFinite(currentEntry.totalCost)) {
      cost100 = (currentEntry.totalCost / distance) * 100;
    }

    box.classList.remove('hidden');
    $('r-distance').textContent = distance > 0 ? fmtNum(distance, 1) + ' km' : '–';
    $('r-consumption').textContent = consumption !== null ? fmtNum(consumption, 2) + ' L / 100 km' : '– (keine Volltankung)';
    $('r-cost100').textContent = cost100 !== null ? fmtEuro(cost100) : '–';
  }

  function renderStats() {
    const entries = sortedAsc(loadEntries());
    const total = entries.length;
    $('totalEntries').textContent = total.toString();

    if (total === 0) {
      $('avgConsumption').textContent = '–';
      $('avgPrice').textContent = '–';
      $('totalKm').textContent = '–';
      $('totalLiters').textContent = '–';
      $('totalSpent').textContent = '–';
      $('costPerKm').textContent = '–';
      return;
    }

    const first = entries[0];
    const last = entries[entries.length - 1];
    const totalKm = Math.max(0, last.odometer - first.odometer);

    // Average consumption: sum liters between full tanks, divided by km between them.
    let consumedLiters = 0;
    let consumedKm = 0;
    let lastFullIdx = -1;
    entries.forEach((e, i) => {
      if (e.fullTank) {
        if (lastFullIdx >= 0) {
          const segKm = e.odometer - entries[lastFullIdx].odometer;
          let segLiters = 0;
          for (let j = lastFullIdx + 1; j <= i; j++) segLiters += entries[j].liters;
          if (segKm > 0) {
            consumedKm += segKm;
            consumedLiters += segLiters;
          }
        }
        lastFullIdx = i;
      }
    });
    const avgCons = consumedKm > 0 ? (consumedLiters / consumedKm) * 100 : null;

    const totalLiters = entries.reduce((s, e) => s + (e.liters || 0), 0);
    const totalSpent = entries.reduce((s, e) => s + (Number.isFinite(e.totalCost) ? e.totalCost : 0), 0);

    const pricedEntries = entries.filter((e) => Number.isFinite(e.pricePerLiter));
    const avgPrice =
      pricedEntries.length > 0
        ? pricedEntries.reduce((s, e) => s + e.pricePerLiter * e.liters, 0) /
          pricedEntries.reduce((s, e) => s + e.liters, 0)
        : null;

    const costPerKm = totalKm > 0 && totalSpent > 0 ? totalSpent / totalKm : null;

    $('avgConsumption').textContent = avgCons !== null ? fmtNum(avgCons, 2) : '–';
    $('avgPrice').textContent = avgPrice !== null ? fmtNum(avgPrice, 3) : '–';
    $('totalKm').textContent = fmtNum(totalKm, 0) + ' km';
    $('totalLiters').textContent = fmtNum(totalLiters, 2) + ' L';
    $('totalSpent').textContent = totalSpent > 0 ? fmtEuro(totalSpent) : '–';
    $('costPerKm').textContent = costPerKm !== null ? fmtEuro(costPerKm) : '–';
  }

  function renderHistory() {
    const list = $('historyList');
    const entries = sortedDesc(loadEntries());
    const empty = $('emptyHistory');
    list.innerHTML = '';

    if (entries.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    const asc = sortedAsc(loadEntries());

    entries.forEach((e) => {
      const idxAsc = asc.findIndex((x) => x.id === e.id);
      const prev = idxAsc > 0 ? asc[idxAsc - 1] : null;
      const distance = prev ? e.odometer - prev.odometer : null;
      const consumption =
        prev && e.fullTank && distance > 0 ? (e.liters / distance) * 100 : null;

      const item = document.createElement('div');
      item.className = 'history-item';

      const consText = consumption !== null ? fmtNum(consumption, 2) + ' L/100km' : '–';
      const distText = distance !== null && distance > 0 ? fmtNum(distance, 0) + ' km' : '';

      item.innerHTML = `
        <button class="history-delete" data-id="${e.id}" aria-label="Löschen">Löschen</button>
        <div class="history-head">
          <span class="history-date">${fmtDate(e.date)}</span>
          <span class="history-cons">${consText}</span>
        </div>
        <div class="history-meta">
          <span>${fmtNum(e.odometer, 0)} km</span>
          <span>${fmtNum(e.liters, 2)} L</span>
          ${Number.isFinite(e.totalCost) ? `<span>${fmtEuro(e.totalCost)}</span>` : ''}
          ${Number.isFinite(e.pricePerLiter) ? `<span>${fmtNum(e.pricePerLiter, 3)} €/L</span>` : ''}
          ${distText ? `<span>+${distText}</span>` : ''}
          ${!e.fullTank ? '<span>Teiltankung</span>' : ''}
        </div>
        ${e.note ? `<div class="history-note">${escapeHtml(e.note)}</div>` : ''}
      `;
      list.appendChild(item);
    });

    list.querySelectorAll('.history-delete').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        if (!confirm('Diese Tankung löschen?')) return;
        const remaining = loadEntries().filter((e) => e.id !== id);
        saveEntries(remaining);
        renderHistory();
      });
    });
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function handleReset() {
    if (!confirm('Alle Tankungen unwiderruflich löschen?')) return;
    localStorage.removeItem(STORAGE_KEY);
    renderStats();
    renderHistory();
    $('lastResult').classList.add('hidden');
    setMessage('Alle Daten gelöscht.', 'success');
  }

  function init() {
    setupTabs();
    $('date').valueAsDate = new Date();
    $('fuelForm').addEventListener('submit', handleSubmit);
    $('resetBtn').addEventListener('click', handleReset);

    // Auto-fill totalCost when both price and liters present (and field empty)
    const priceEl = $('pricePerLiter');
    const litersEl = $('liters');
    const totalEl = $('totalCost');
    const tryAutoTotal = () => {
      const p = parseFloat(priceEl.value);
      const l = parseFloat(litersEl.value);
      if (Number.isFinite(p) && Number.isFinite(l) && !totalEl.value) {
        totalEl.placeholder = (p * l).toFixed(2).replace('.', ',');
      }
    };
    priceEl.addEventListener('input', tryAutoTotal);
    litersEl.addEventListener('input', tryAutoTotal);

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
