// Filtering and Transaction List Management

let currentFilters = {
  startDate: null,
  endDate: null,
  type: "all",
  category: "all",
  paymentMethod: "all",
  description: "",
};

let currentSort = "date-desc";
let filteredTransactions = [];
let totalTransactions = 0;

// Initialize filters
async function initializeFilters() {
  const settings = await storage.getSettings();

  // Populate category filter
  const categoryFilter = document.getElementById("filterCategory");
  categoryFilter.innerHTML = '<option value="all">Tümü</option>';

  const allCategories = [
    ...new Set([...settings.incomeCategories, ...settings.expenseCategories]),
  ].sort();

  allCategories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categoryFilter.appendChild(option);
  });

  // Populate payment method filter
  const paymentMethodFilter = document.getElementById("filterPaymentMethod");
  paymentMethodFilter.innerHTML = '<option value="all">Tümü</option>';

  const allMethods = [
    ...new Set([...settings.incomeMethods, ...settings.expenseMethods]),
  ].sort();

  allMethods.forEach((method) => {
    const option = document.createElement("option");
    option.value = method;
    option.textContent = method;
    paymentMethodFilter.appendChild(option);
  });

  // Set default date range (current month)
  const today = new Date();
  const startOfMonth = getStartOfMonth(today);
  const endOfMonth = getEndOfMonth(today);

  document.getElementById("filterStartDate").value =
    formatDateForInput(startOfMonth);
  document.getElementById("filterEndDate").value =
    formatDateForInput(endOfMonth);

  currentFilters.startDate = formatDateForInput(startOfMonth);
  currentFilters.endDate = formatDateForInput(endOfMonth);
}

// Apply filters
async function applyFilters() {
  const startDate = document.getElementById("filterStartDate").value;
  const endDate = document.getElementById("filterEndDate").value;
  const type = document.getElementById("filterType").value;
  const category = document.getElementById("filterCategory").value;
  const paymentMethod = document.getElementById("filterPaymentMethod").value;
  const description = document.getElementById("filterDescription").value.trim();

  currentFilters = {
    startDate: startDate || null,
    endDate: endDate || null,
    type: type,
    category: category,
    paymentMethod: paymentMethod,
    description: description,
  };

  await loadFilteredTransactions();
}

// Clear filters
async function clearFilters() {
  document.getElementById("filterStartDate").value = "";
  document.getElementById("filterEndDate").value = "";
  document.getElementById("filterType").value = "all";
  document.getElementById("filterCategory").value = "all";
  document.getElementById("filterPaymentMethod").value = "all";
  document.getElementById("filterDescription").value = "";

  currentFilters = {
    startDate: null,
    endDate: null,
    type: "all",
    category: "all",
    paymentMethod: "all",
    description: "",
  };

  await loadFilteredTransactions();
}

// Load filtered transactions
async function loadFilteredTransactions() {
  try {
    // Get all transactions for total count
    const allTransactions = await storage.getAllTransactions();
    totalTransactions = allTransactions.length;

    // Get filtered transactions
    filteredTransactions = await storage.getTransactions(currentFilters);
    sortTransactions();
    renderTransactions();
    updateTransactionCount();
  } catch (error) {
    console.error("Error loading transactions:", error);
    showToast("İşlemler yüklenirken hata oluştu", "error");
  }
}

// Update transaction count display
function updateTransactionCount() {
  const countElement = document.getElementById("transactionCount");
  if (!countElement) return;

  if (filteredTransactions.length === totalTransactions) {
    countElement.textContent = `(${totalTransactions} kayıt)`;
  } else {
    countElement.textContent = `(${filteredTransactions.length} / ${totalTransactions} kayıt)`;
  }
}

// Sort transactions
function sortTransactions() {
  filteredTransactions.sort((a, b) => {
    switch (currentSort) {
      case "date-desc":
        return b.date - a.date;
      case "date-asc":
        return a.date - b.date;
      case "amount-desc":
        return b.amount - a.amount;
      case "amount-asc":
        return a.amount - b.amount;
      case "category-asc":
        return a.category.localeCompare(b.category, "tr");
      default:
        return b.date - a.date;
    }
  });
}

// Render transactions table
function renderTransactions() {
  const tableContainer = document.getElementById("transactionsTable");

  if (filteredTransactions.length === 0) {
    tableContainer.innerHTML =
      '<p class="empty-state">Filtrelere uygun işlem bulunamadı.</p>';
    updateTransactionCount();
    return;
  }

  let html = `
        <table class="transactions-table-content">
            <thead>
                <tr>
                    <th>Tarih</th>
                    <th>Tip</th>
                    <th>Kategori</th>
                    <th>Ödeme Yöntemi</th>
                    <th class="th-amount">Tutar</th>
                    <th>Açıklama</th>
                    <th>İşlemler</th>
                </tr>
            </thead>
            <tbody>
    `;

  filteredTransactions.forEach((transaction) => {
    const typeClass = transaction.type === "income" ? "income" : "expense";
    const typeLabel = transaction.type === "income" ? "Gelir" : "Gider";
    const amountClass =
      transaction.type === "income" ? "amount-income" : "amount-expense";
    const amountSign = transaction.type === "income" ? "+" : "-";

    html += `
            <tr>
                <td>${formatDateTime(transaction.date)}</td>
                <td><span class="type-badge type-${typeClass}">${typeLabel}</span></td>
                <td>${transaction.category}</td>
                <td>${transaction.paymentMethod}</td>
                <td class="${amountClass}">${amountSign}${formatCurrency(
      transaction.amount
    )}</td>
                <td>${transaction.description || "-"}</td>
                <td class="action-buttons">
                    <button class="btn-icon btn-edit" onclick="editTransaction(${
                      transaction.id
                    })" title="Düzenle">✏️</button>
                    <button class="btn-icon btn-delete" onclick="deleteTransaction(${
                      transaction.id
                    })" title="Sil">🗑️</button>
                </td>
            </tr>
        `;
  });

  html += `
            </tbody>
        </table>
    `;

  tableContainer.innerHTML = html;
}

// Handle sort change
function handleSortChange() {
  const sortSelect = document.getElementById("sortBy");
  currentSort = sortSelect.value;
  sortTransactions();
  renderTransactions();
}

// Event listeners for filters
function setupFilterListeners() {
  document
    .getElementById("applyFiltersBtn")
    .addEventListener("click", applyFilters);
  document
    .getElementById("clearFiltersBtn")
    .addEventListener("click", clearFilters);
  document
    .getElementById("sortBy")
    .addEventListener("change", handleSortChange);

  // Debounced search for description
  const descriptionInput = document.getElementById("filterDescription");
  descriptionInput.addEventListener(
    "input",
    debounce(() => {
      applyFilters();
    }, 300)
  );
}

// Make functions globally available
window.editTransaction = async function (id) {
  const transaction = await storage.getTransactionById(id);
  if (transaction && window.openTransactionModal) {
    window.openTransactionModal(transaction);
  }
};

window.deleteTransaction = async function (id) {
  if (confirm("Bu işlemi silmek istediğinize emin misiniz?")) {
    try {
      await storage.deleteTransaction(id);
      showToast("İşlem silindi", "success");
      await loadFilteredTransactions();
      if (typeof updateDashboard === "function") {
        updateDashboard();
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      showToast("İşlem silinirken hata oluştu", "error");
    }
  }
};
