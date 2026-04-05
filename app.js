const STORAGE_KEY = 'expenses';

function loadExpenses() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveExpenses(expenses) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y}`;
}

function renderExpenses() {
  const expenses = loadExpenses();
  const tbody = document.getElementById('expense-list');
  const emptyRow = document.getElementById('empty-row');
  const totalDisplay = document.getElementById('total-display');

  // Clear existing rows (keep empty-row)
  Array.from(tbody.querySelectorAll('tr:not(#empty-row)')).forEach(r => r.remove());

  if (expenses.length === 0) {
    emptyRow.style.display = '';
    totalDisplay.textContent = 'Total: $0.00';
    return;
  }

  emptyRow.style.display = 'none';

  let total = 0;
  expenses.forEach(exp => {
    total += exp.amount;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(exp.date)}</td>
      <td>${exp.category}</td>
      <td class="amount-cell">$${exp.amount.toFixed(2)}</td>
      <td>${exp.description}</td>
      <td><button class="btn btn-danger" data-id="${exp.id}">Remove</button></td>
    `;
    tbody.appendChild(tr);
  });

  totalDisplay.textContent = `Total: $${total.toFixed(2)}`;
}

function addExpense(date, category, amount, description) {
  const expenses = loadExpenses();
  expenses.push({ id: Date.now(), date, category, amount: parseFloat(amount), description });
  saveExpenses(expenses);
  renderExpenses();
}

function removeExpense(id) {
  const expenses = loadExpenses().filter(e => e.id !== id);
  saveExpenses(expenses);
  renderExpenses();
}

// Form submit
document.getElementById('expense-form').addEventListener('submit', e => {
  e.preventDefault();
  const date = document.getElementById('date').value;
  const category = document.getElementById('category').value;
  const amount = document.getElementById('amount').value;
  const description = document.getElementById('description').value;
  addExpense(date, category, amount, description);
  e.target.reset();
});

// Remove buttons (event delegation)
document.getElementById('expense-list').addEventListener('click', e => {
  const btn = e.target.closest('[data-id]');
  if (btn) removeExpense(Number(btn.dataset.id));
});

// Set today's date as default
document.getElementById('date').valueAsDate = new Date();

renderExpenses();
