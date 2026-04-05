class ExportManager {
  constructor() {
    this.modal     = document.getElementById('export-modal');
    this.overlay   = document.getElementById('modal-overlay');
    this.closeBtn  = document.getElementById('modal-close');
    this.cancelBtn = document.getElementById('modal-cancel');
    this.exportBtn = document.getElementById('do-export-btn');
    this.btnLabel  = this.exportBtn.querySelector('.btn-label');
    this.spinner   = this.exportBtn.querySelector('.btn-spinner');

    this.filterStart  = document.getElementById('filter-start');
    this.filterEnd    = document.getElementById('filter-end');
    this.catContainer = document.getElementById('category-checkboxes');
    this.toggleAllBtn = document.getElementById('toggle-all-btn');
    this.formatExt    = document.getElementById('format-ext');
    this.filename     = document.getElementById('export-filename');
    this.previewList  = document.getElementById('preview-list');
    this.summaryBar   = document.getElementById('summary-bar');

    this._bindEvents();
  }

  _bindEvents() {
    document.getElementById('export-data-btn').addEventListener('click', () => this.open());
    this.closeBtn.addEventListener('click',  () => this.close());
    this.cancelBtn.addEventListener('click', () => this.close());
    this.overlay.addEventListener('click',   () => this.close());

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.modal.classList.contains('open')) this.close();
    });

    this.filterStart.addEventListener('change', () => this.updatePreview());
    this.filterEnd.addEventListener('change',   () => this.updatePreview());

    document.getElementById('format-group').addEventListener('change', () => {
      const fmt = this._selectedFormat();
      this.formatExt.textContent = '.' + fmt;
      this.updatePreview();
    });

    this.toggleAllBtn.addEventListener('click', () => this._toggleAllCategories());
    this.exportBtn.addEventListener('click', () => this._handleExport());
  }

  open() {
    this._populateCategories();
    this.filename.value = `expenses-${new Date().toISOString().slice(0, 10)}`;
    this.filterStart.value = '';
    this.filterEnd.value   = '';
    this.formatExt.textContent = '.csv';
    document.querySelector('input[name="format"][value="csv"]').checked = true;
    this.updatePreview();
    this.modal.classList.add('open');
  }

  close() {
    this.modal.classList.remove('open');
  }

  _populateCategories() {
    const expenses = loadExpenses();
    const cats = [...new Set(expenses.map(e => e.category))].sort();
    this.catContainer.innerHTML = '';
    cats.forEach(cat => {
      const label = document.createElement('label');
      label.className = 'checkbox-item';
      label.innerHTML = `<input type="checkbox" value="${cat}" checked />${cat}`;
      label.querySelector('input').addEventListener('change', () => this.updatePreview());
      this.catContainer.appendChild(label);
    });
    this.toggleAllBtn.textContent = 'Deselect All';
  }

  _toggleAllCategories() {
    const boxes = this.catContainer.querySelectorAll('input[type="checkbox"]');
    const anyChecked = [...boxes].some(b => b.checked);
    boxes.forEach(b => { b.checked = !anyChecked; });
    this.toggleAllBtn.textContent = anyChecked ? 'Select All' : 'Deselect All';
    this.updatePreview();
  }

  _selectedFormat() {
    return document.querySelector('input[name="format"]:checked').value;
  }

  _selectedCategories() {
    return [...this.catContainer.querySelectorAll('input:checked')].map(b => b.value);
  }

  getFilteredExpenses() {
    let expenses = loadExpenses();
    const start = this.filterStart.value;
    const end   = this.filterEnd.value;
    const cats  = this._selectedCategories();

    if (start) expenses = expenses.filter(e => e.date >= start);
    if (end)   expenses = expenses.filter(e => e.date <= end);

    // If no categories selected, include all; otherwise filter
    if (cats.length > 0) {
      expenses = expenses.filter(e => cats.includes(e.category));
    }

    return expenses;
  }

  updatePreview() {
    const expenses = this.getFilteredExpenses();
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    this.summaryBar.textContent = `${expenses.length} record${expenses.length !== 1 ? 's' : ''} · $${total.toFixed(2)}`;
    this.exportBtn.disabled = expenses.length === 0;

    if (expenses.length === 0) {
      this.previewList.innerHTML = '<tr><td colspan="4" class="empty-message">No records match the current filters.</td></tr>';
      return;
    }

    this.previewList.innerHTML = expenses.map(e => `
      <tr>
        <td>${formatDate(e.date)}</td>
        <td>${e.category}</td>
        <td>$${e.amount.toFixed(2)}</td>
        <td>${e.description}</td>
      </tr>
    `).join('');
  }

  _handleExport() {
    const expenses  = this.getFilteredExpenses();
    const fmt       = this._selectedFormat();
    const filename  = (this.filename.value.trim() || `expenses-${new Date().toISOString().slice(0, 10)}`);

    // Show loading state
    this.btnLabel.hidden  = true;
    this.spinner.hidden   = false;
    this.exportBtn.disabled = true;

    setTimeout(() => {
      if (fmt === 'csv')  this._exportCSV(expenses, filename);
      if (fmt === 'json') this._exportJSON(expenses, filename);
      if (fmt === 'pdf')  this._exportPDF(expenses, filename);

      this.btnLabel.hidden  = false;
      this.spinner.hidden   = true;
      this.exportBtn.disabled = false;

      if (fmt !== 'pdf') this.close();
    }, 400);
  }

  _triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  _exportCSV(expenses, filename) {
    const rows = [
      ['Date', 'Category', 'Amount', 'Description'],
      ...expenses.map(e => [
        e.date,
        e.category,
        e.amount.toFixed(2),
        `"${e.description.replace(/"/g, '""')}"`
      ])
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    this._triggerDownload(new Blob([csv], { type: 'text/csv' }), filename + '.csv');
  }

  _exportJSON(expenses, filename) {
    const data = expenses.map(({ id, ...rest }) => rest);
    const json = JSON.stringify(data, null, 2);
    this._triggerDownload(new Blob([json], { type: 'application/json' }), filename + '.json');
  }

  _exportPDF(expenses, filename) {
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    const rows  = expenses.map(e => `
      <tr>
        <td>${formatDate(e.date)}</td>
        <td>${e.category}</td>
        <td>$${e.amount.toFixed(2)}</td>
        <td>${e.description}</td>
      </tr>`).join('');

    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html><html><head><title>${filename}</title>
      <style>
        body { font-family: sans-serif; padding: 32px; color: #111; }
        h1   { font-size: 1.3rem; margin-bottom: 4px; }
        p    { color: #888; font-size: 0.85rem; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        th { text-align: left; padding: 8px 10px; border-bottom: 2px solid #333;
             font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
        td { padding: 8px 10px; border-bottom: 1px solid #eee; }
        tfoot td { font-weight: 700; border-top: 2px solid #333; border-bottom: none; }
      </style></head><body>
      <h1>Expense Report</h1>
      <p>Exported ${new Date().toLocaleDateString()} · ${expenses.length} records</p>
      <table>
        <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Description</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td colspan="2">Total</td><td>$${total.toFixed(2)}</td><td></td></tr></tfoot>
      </table>
      </body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
    this.close();
  }
}

// Init
const exportManager = new ExportManager();
