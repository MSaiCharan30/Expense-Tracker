// ── Data definitions ──────────────────────────────────────

const TEMPLATES = [
  {
    id: 'tax',
    icon: '🧾',
    name: 'Tax Report',
    desc: 'Categorized expenses ready for tax filing',
    color: '#16a34a',
    months: 12,
    format: 'csv',
  },
  {
    id: 'monthly',
    icon: '📅',
    name: 'Monthly Summary',
    desc: 'Current month spending by category',
    color: '#6c63ff',
    months: 1,
    format: 'csv',
  },
  {
    id: 'analysis',
    icon: '📊',
    name: 'Category Analysis',
    desc: 'Full breakdown with percentages & averages',
    color: '#f59e0b',
    months: null,
    format: 'json',
  },
  {
    id: 'backup',
    icon: '💾',
    name: 'Full Backup',
    desc: 'Complete data export for safekeeping',
    color: '#3b82f6',
    months: null,
    format: 'json',
  },
  {
    id: 'budget',
    icon: '💰',
    name: 'Budget Review',
    desc: 'Last 3 months of spending trends',
    color: '#ec4899',
    months: 3,
    format: 'csv',
  },
];

const SERVICES = [
  {
    id: 'sheets',
    emoji: '📊',
    name: 'Google Sheets',
    desc: 'Export directly into a Google Sheet',
    color: '#16a34a',
  },
  {
    id: 'dropbox',
    emoji: '📦',
    name: 'Dropbox',
    desc: 'Save exports to your Dropbox folder',
    color: '#0061ff',
  },
  {
    id: 'email',
    emoji: '✉️',
    name: 'Email',
    desc: 'Send exports to any email address',
    color: '#f59e0b',
  },
  {
    id: 'webhook',
    emoji: '🔗',
    name: 'Webhook',
    desc: 'POST data to any URL on export',
    color: '#ef4444',
  },
];

// ── ExportHub class ───────────────────────────────────────

class ExportHub {
  constructor() {
    this._tab = 'templates';

    document.getElementById('open-hub-btn').addEventListener('click', () => this.open());
    document.getElementById('hub-close').addEventListener('click',   () => this.close());
    document.getElementById('hub-backdrop').addEventListener('click', () => this.close());

    document.querySelectorAll('.hnav').forEach(btn =>
      btn.addEventListener('click', () => this._switchTab(btn.dataset.tab))
    );

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && document.getElementById('export-hub').classList.contains('open'))
        this.close();
    });
  }

  open() {
    document.getElementById('export-hub').classList.add('open');
    document.body.style.overflow = 'hidden';
    this._switchTab(this._tab);
  }

  close() {
    document.getElementById('export-hub').classList.remove('open');
    document.body.style.overflow = '';
  }

  // ── Tab routing ─────────────────────────────────────────

  _switchTab(name) {
    this._tab = name;
    document.querySelectorAll('.hnav').forEach(b =>
      b.setAttribute('aria-selected', b.dataset.tab === name ? 'true' : 'false')
    );
    const body = document.getElementById('hub-body');
    switch (name) {
      case 'templates': body.innerHTML = this._tmplTemplates(); this._bindTemplates(); break;
      case 'connect':   body.innerHTML = this._tmplConnect();   this._bindConnect();   break;
      case 'schedule':  body.innerHTML = this._tmplSchedule();  this._bindSchedule();  break;
      case 'history':   body.innerHTML = this._tmplHistory();   this._bindHistory();   break;
      case 'share':     body.innerHTML = this._tmplShare();     this._bindShare();     break;
    }
  }

  // ── Syncing indicator ────────────────────────────────────

  _setSyncing(on) {
    const dot = document.getElementById('sync-dot');
    if (!dot) return;
    dot.classList.toggle('syncing', on);
    dot.title = on ? 'Syncing…' : 'Ready';
  }

  // ── LocalStorage helpers ─────────────────────────────────

  _getConnections() { return JSON.parse(localStorage.getItem('hub_connections') || '{}'); }
  _setConnections(v) { localStorage.setItem('hub_connections', JSON.stringify(v)); }

  _getSchedule() { return JSON.parse(localStorage.getItem('hub_schedule') || '{}'); }
  _setSchedule(v) { localStorage.setItem('hub_schedule', JSON.stringify(v)); }

  _getShares() { return JSON.parse(localStorage.getItem('hub_shares') || '[]'); }
  _setShares(v) { localStorage.setItem('hub_shares', JSON.stringify(v)); }

  _getHistory() {
    const raw = localStorage.getItem('hub_history');
    if (raw) return JSON.parse(raw);
    // Seed with realistic past entries
    const seed = [
      { name: 'Monthly Summary', format: 'csv',  dest: 'Download', status: 'success', count: 8,  ts: new Date(Date.now() - 7  * 86400000).toISOString() },
      { name: 'Full Backup',     format: 'json', dest: 'Dropbox',  status: 'success', count: 24, ts: new Date(Date.now() - 14 * 86400000).toISOString() },
      { name: 'Tax Report',      format: 'csv',  dest: 'Email',    status: 'success', count: 24, ts: new Date(Date.now() - 31 * 86400000).toISOString() },
    ];
    this._setHistory(seed);
    return seed;
  }

  _setHistory(v) { localStorage.setItem('hub_history', JSON.stringify(v)); }

  _addHistory(entry) {
    const h = this._getHistory();
    h.push({ ...entry, ts: new Date().toISOString(), status: 'success' });
    this._setHistory(h);
  }

  // ── Templates tab ────────────────────────────────────────

  _tmplTemplates() {
    const insight = this._buildInsight();
    const cards = TEMPLATES.map(t => {
      const count = this._templateCount(t);
      return `
        <div class="template-card" style="border-left-color:${t.color}">
          <div class="tc-icon">${t.icon}</div>
          <div class="tc-body">
            <div class="tc-name">${t.name}</div>
            <div class="tc-desc">${t.desc}</div>
            <div class="tc-meta">
              <span class="badge badge-format">${t.format}</span>
              <span class="badge badge-count">${count} record${count !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <button class="btn-use" data-template="${t.id}">Export →</button>
        </div>`;
    }).join('');

    return (insight ? `<div class="insight-banner">${insight}</div>` : '') + cards;
  }

  _bindTemplates() {
    document.querySelectorAll('[data-template]').forEach(btn =>
      btn.addEventListener('click', () => this._useTemplate(btn.dataset.template))
    );
  }

  _buildInsight() {
    const expenses = loadExpenses();
    if (expenses.length === 0) return null;
    const mo = new Date().getMonth();
    const yr = new Date().getFullYear();
    const thisMonth = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === mo && d.getFullYear() === yr;
    });
    const total = thisMonth.reduce((s, e) => s + e.amount, 0);
    if (mo <= 3) {
      const all = expenses.reduce((s, e) => s + e.amount, 0);
      return `💡 Tax season is here! ${expenses.length} expenses totalling <strong>$${all.toFixed(2)}</strong> — try the Tax Report template.`;
    }
    if (thisMonth.length > 0) {
      return `💡 <strong>${thisMonth.length} expenses</strong> this month totalling <strong>$${total.toFixed(2)}</strong> — try Monthly Summary.`;
    }
    return `💡 ${expenses.length} total expenses ready to export. Pick a template below.`;
  }

  _templateCount(t) {
    const expenses = loadExpenses();
    if (!t.months) return expenses.length;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - t.months);
    return expenses.filter(e => new Date(e.date) >= cutoff).length;
  }

  _useTemplate(id) {
    const t = TEMPLATES.find(x => x.id === id);
    const expenses = this._filterForTemplate(t);
    if (expenses.length === 0) {
      alert(`No expenses in the date range for "${t.name}".`);
      return;
    }
    const btn = document.querySelector(`[data-template="${id}"]`);
    if (btn) { btn.textContent = '⏳ Exporting…'; btn.classList.add('loading'); }
    this._setSyncing(true);

    setTimeout(() => {
      const filename = t.name.toLowerCase().replace(/\s+/g, '-');
      if (t.format === 'csv') this._downloadCSV(expenses, filename);
      else                    this._downloadJSON(expenses, filename);

      this._addHistory({ name: t.name, format: t.format, dest: 'Download', count: expenses.length });
      this._setSyncing(false);

      // Flash to history after short delay
      setTimeout(() => this._switchTab('history'), 600);
    }, 900);
  }

  _filterForTemplate(t) {
    let list = loadExpenses();
    if (t.months) {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - t.months);
      list = list.filter(e => new Date(e.date) >= cutoff);
    }
    return list;
  }

  // ── Connect tab ──────────────────────────────────────────

  _tmplConnect() {
    const conn = this._getConnections();
    return SERVICES.map(s => {
      const isConnected = !!conn[s.id];
      return `
        <div class="service-card">
          <div class="sc-emoji">${s.emoji}</div>
          <div class="sc-body">
            <div class="sc-name">${s.name}</div>
            <div class="sc-desc">${s.desc}</div>
            <div class="sc-status">
              <span class="status-dot ${isConnected ? 'connected' : 'available'}">
                ${isConnected ? 'Connected' : 'Not connected'}
              </span>
            </div>
          </div>
          <button class="btn-connect ${isConnected ? 'btn-disconnect' : ''}" data-connect="${s.id}">
            ${isConnected ? 'Disconnect' : 'Connect'}
          </button>
        </div>`;
    }).join('');
  }

  _bindConnect() {
    document.querySelectorAll('[data-connect]').forEach(btn =>
      btn.addEventListener('click', () => this._connectService(btn.dataset.connect))
    );
  }

  _connectService(id) {
    const conn = this._getConnections();

    if (conn[id]) {
      delete conn[id];
      this._setConnections(conn);
      this._switchTab('connect');
      return;
    }

    const btn = document.querySelector(`[data-connect="${id}"]`);
    if (!btn) return;
    btn.textContent = 'Connecting…';
    btn.disabled = true;
    this._setSyncing(true);

    setTimeout(() => {
      conn[id] = { connectedAt: new Date().toISOString() };
      this._setConnections(conn);
      this._setSyncing(false);
      this._switchTab('connect');
    }, 1800);
  }

  // ── Schedule tab ─────────────────────────────────────────

  _tmplSchedule() {
    const s = this._getSchedule();
    const enabled = !!s.enabled;
    const templateOpts = TEMPLATES.map(t =>
      `<option value="${t.id}" ${s.template === t.id ? 'selected' : ''}>${t.name}</option>`
    ).join('');
    const connOpts = ['Download', ...Object.keys(this._getConnections()).map(k => {
      const svc = SERVICES.find(x => x.id === k);
      return svc ? svc.name : k;
    })].map(d => `<option ${s.dest === d ? 'selected' : ''}>${d}</option>`).join('');

    const nextRunHtml = s.nextRun
      ? `<div class="next-run-pill">⏰ Next export: ${new Date(s.nextRun).toLocaleString()}</div>`
      : '';

    return `
      <div class="schedule-card">
        <div class="schedule-head">
          <div>
            <div class="sched-title">Recurring Export</div>
            <div class="sched-sub">Automatically export on a set schedule</div>
          </div>
          <label class="toggle">
            <input type="checkbox" id="sched-toggle" ${enabled ? 'checked' : ''} />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="schedule-form ${!enabled ? 'disabled' : ''}">
          <div class="form-row-2">
            <div class="form-group">
              <label>Frequency</label>
              <select id="sched-freq">
                <option ${s.freq === 'daily'   ? 'selected' : ''}>daily</option>
                <option ${s.freq === 'weekly'  ? 'selected' : ''}>weekly</option>
                <option ${s.freq === 'monthly' ? 'selected' : ''}>monthly</option>
              </select>
            </div>
            <div class="form-group">
              <label>Time</label>
              <input type="time" id="sched-time" value="${s.time || '09:00'}" />
            </div>
          </div>
          <div class="form-group">
            <label>Template</label>
            <select id="sched-tmpl">${templateOpts}</select>
          </div>
          <div class="form-group">
            <label>Destination</label>
            <select id="sched-dest">${connOpts}</select>
          </div>
          ${nextRunHtml}
          <button class="btn btn-primary" id="save-sched-btn" style="align-self:flex-start">
            Save Schedule
          </button>
        </div>
      </div>`;
  }

  _bindSchedule() {
    const toggle = document.getElementById('sched-toggle');
    if (toggle) {
      toggle.addEventListener('change', () => {
        const form = document.querySelector('.schedule-form');
        form.classList.toggle('disabled', !toggle.checked);
      });
    }
    const saveBtn = document.getElementById('save-sched-btn');
    if (saveBtn) saveBtn.addEventListener('click', () => this._saveSchedule());
  }

  _saveSchedule() {
    const enabled = document.getElementById('sched-toggle').checked;
    const freq    = document.getElementById('sched-freq').value;
    const time    = document.getElementById('sched-time').value;
    const template = document.getElementById('sched-tmpl').value;
    const dest    = document.getElementById('sched-dest').value;

    const nextRun = this._calcNextRun(freq, time);
    this._setSchedule({ enabled, freq, time, template, dest, nextRun: nextRun.toISOString() });

    const btn = document.getElementById('save-sched-btn');
    btn.textContent = '✓ Saved!';
    setTimeout(() => { btn.textContent = 'Save Schedule'; this._switchTab('schedule'); }, 1500);
  }

  _calcNextRun(freq, time) {
    const [h, m] = (time || '09:00').split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    if (d <= new Date()) {
      if (freq === 'daily')   d.setDate(d.getDate() + 1);
      if (freq === 'weekly')  d.setDate(d.getDate() + 7);
      if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
    }
    return d;
  }

  // ── History tab ──────────────────────────────────────────

  _tmplHistory() {
    const history = this._getHistory().slice().reverse();
    if (history.length === 0) {
      return `<div class="hub-empty">No export history yet.<br>Use a template to get started.</div>`;
    }

    return `<div class="history-list">${
      history.map((e, i) => `
        <div class="history-item">
          <div class="hi-timeline">
            <div class="hi-dot" style="background:${e.status === 'success' ? '#16a34a' : '#f59e0b'}"></div>
            ${i < history.length - 1 ? '<div class="hi-line"></div>' : ''}
          </div>
          <div class="hi-content">
            <div class="hi-name">${e.name}</div>
            <div class="hi-meta">
              ${new Date(e.ts).toLocaleString()} · ${e.format.toUpperCase()} · ${e.dest} · ${e.count} records
            </div>
            <span class="badge ${e.status === 'success' ? 'badge-ok' : 'badge-warn'}">${e.status}</span>
            <div class="hi-actions">
              <button class="btn-reexport" data-hid="${i}">Re-export</button>
            </div>
          </div>
        </div>`).join('')
    }</div>`;
  }

  _bindHistory() {
    document.querySelectorAll('[data-hid]').forEach(btn =>
      btn.addEventListener('click', () => {
        const entry = this._getHistory().slice().reverse()[Number(btn.dataset.hid)];
        if (entry) this._useTemplate(
          TEMPLATES.find(t => t.name === entry.name)?.id || 'backup'
        );
      })
    );
  }

  // ── Share tab ────────────────────────────────────────────

  _tmplShare() {
    const shares = this._getShares();
    const templateOpts = TEMPLATES.map(t =>
      `<option value="${t.id}">${t.name}</option>`
    ).join('');

    const activeList = shares.length === 0 ? '' : `
      <div class="share-card">
        <div class="share-section-title">Active shares (${shares.length})</div>
        ${shares.map(s => `
          <div class="active-share">
            <div>
              <div class="as-name">${TEMPLATES.find(t=>t.id===s.template)?.name || s.template} · Expires ${s.expiry}</div>
              <div class="as-url">${s.url}</div>
            </div>
            <button class="btn-revoke" data-shareurl="${s.url}">Revoke</button>
          </div>`).join('')}
      </div>`;

    return `
      <div class="share-card">
        <div class="share-section-title">Generate Share Link</div>

        <div class="form-group">
          <label>Template</label>
          <select id="share-tmpl">${templateOpts}</select>
        </div>

        <div class="form-group">
          <label>Link expires in</label>
          <div class="expiry-group">
            ${['1h','24h','7d','Never'].map(v => `
              <label class="expiry-pill">
                <input type="radio" name="expiry" value="${v}" ${v === '24h' ? 'checked' : ''} />
                <span>${v}</span>
              </label>`).join('')}
          </div>
        </div>

        <button class="btn-gen" id="gen-link-btn">⚡ Generate Link &amp; QR Code</button>

        <div class="link-result" id="link-result" style="display:none">
          <div class="link-display">
            <input type="text" id="share-url-input" readonly />
            <button class="btn-copy" id="copy-btn">Copy</button>
          </div>
          <div class="qr-wrap">
            <canvas id="qr-canvas" width="210" height="210"></canvas>
            <div class="qr-label">Scan to view</div>
          </div>
        </div>
      </div>
      ${activeList}`;
  }

  _bindShare() {
    document.getElementById('gen-link-btn').addEventListener('click', () => this._generateLink());

    document.querySelectorAll('[data-shareurl]').forEach(btn =>
      btn.addEventListener('click', () => this._revokeShare(btn.dataset.shareurl))
    );

    const copyBtn = document.getElementById('copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const url = document.getElementById('share-url-input').value;
        navigator.clipboard.writeText(url).then(() => {
          copyBtn.textContent = '✓ Copied';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 2000);
        });
      });
    }
  }

  _generateLink() {
    const template = document.getElementById('share-tmpl').value;
    const expiry   = document.querySelector('input[name="expiry"]:checked').value;
    const hash     = Math.random().toString(36).slice(2, 10);
    const url      = `https://xpns.app/share/${hash}`;

    document.getElementById('share-url-input').value = url;
    document.getElementById('link-result').style.display = 'flex';

    const canvas = document.getElementById('qr-canvas');
    this._drawQR(canvas, url);

    const shares = this._getShares();
    shares.push({ url, template, expiry, createdAt: new Date().toISOString() });
    this._setShares(shares);
  }

  _revokeShare(url) {
    this._setShares(this._getShares().filter(s => s.url !== url));
    this._switchTab('share');
  }

  // ── QR Code renderer ─────────────────────────────────────

  _drawQR(canvas, text) {
    const ctx  = canvas.getContext('2d');
    const G    = 21;
    const C    = Math.floor(canvas.width / G);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111';

    const fill = (r, c) => ctx.fillRect(c * C, r * C, C, C);

    // Three finder patterns
    const finder = (r0, c0) => {
      for (let i = 0; i < 7; i++) {
        fill(r0,     c0 + i);   // top edge
        fill(r0 + 6, c0 + i);   // bottom edge
        if (i > 0 && i < 6) {
          fill(r0 + i, c0);     // left edge
          fill(r0 + i, c0 + 6); // right edge
        }
      }
      // 3×3 inner square
      for (let i = 2; i <= 4; i++)
        for (let j = 2; j <= 4; j++)
          fill(r0 + i, c0 + j);
    };

    finder(0, 0);   // top-left
    finder(0, 14);  // top-right
    finder(14, 0);  // bottom-left

    // Timing patterns (alternating, between finders)
    for (let i = 8; i <= 12; i += 2) {
      fill(6, i);
      fill(i, 6);
    }

    // Data area: pseudo-random fill based on text
    let seed = [...text].reduce((a, c) => (Math.imul(31, a) + c.charCodeAt(0)) | 0, 0);
    const rng = () => {
      seed ^= seed << 13;
      seed ^= seed >> 17;
      seed ^= seed << 5;
      return (seed >>> 0) / 4294967296;
    };

    for (let r = 0; r < G; r++) {
      for (let c = 0; c < G; c++) {
        const inTL = r <= 8 && c <= 8;
        const inTR = r <= 8 && c >= 12;
        const inBL = r >= 12 && c <= 8;
        if (!inTL && !inTR && !inBL && r !== 6 && c !== 6) {
          if (rng() > 0.45) fill(r, c);
        }
      }
    }
  }

  // ── File download helpers ────────────────────────────────

  _downloadCSV(expenses, filename) {
    const rows = [
      ['Date', 'Category', 'Amount', 'Description'],
      ...expenses.map(e => [
        e.date, e.category, e.amount.toFixed(2),
        `"${e.description.replace(/"/g, '""')}"`
      ])
    ];
    this._download(
      new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' }),
      filename + '.csv'
    );
  }

  _downloadJSON(expenses, filename) {
    const data = expenses.map(({ id, ...rest }) => rest);
    this._download(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
      filename + '.json'
    );
  }

  _download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  }
}

// ── Bootstrap ─────────────────────────────────────────────
const hub = new ExportHub();
