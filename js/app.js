// Main Application Logic

let currentSettings = null;
let editingTransactionId = null;

// Initialize application
async function initApp() {
  try {
    // Initialize database
    await storage.init();

    // Load settings
    currentSettings = await storage.getSettings();

    // Setup UI
    setupTabNavigation();
    setupTransactionForm();
    setupSettings();
    await loadSettings(); // Fix: Force render settings on init
    setupBackup();
    setupThemeToggle();
    await setupReports();

    // Initialize filters
    await initializeFilters();
    setupFilterListeners();

    // Load initial data
    await updateDashboard();
    await loadFilteredTransactions();

    // Set default date and time to now (UTC+3)
    const now = getCurrentUTC3();
    document.getElementById("transactionDate").value = formatDateForInput(now);
    document.getElementById("transactionTime").value = formatTimeForInput(now);

    // Setup "Set Current Time" button
    document
      .getElementById("setCurrentTimeBtn")
      .addEventListener("click", () => {
        const current = getCurrentUTC3();
        document.getElementById("transactionTime").value =
          formatTimeForInput(current);
      });
  } catch (error) {
    console.error("Error initializing app:", error);
    showToast("Uygulama başlatılırken hata oluştu", "error");
  }
}

// Tab Navigation
function setupTabNavigation() {
  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const targetTab = button.getAttribute("data-tab");

      // Update buttons
      tabButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");

      // Update contents
      tabContents.forEach((content) => content.classList.remove("active"));
      document.getElementById(targetTab).classList.add("active");

      // Refresh data when switching tabs
      if (targetTab === "dashboard") {
        await updateDashboard();
      } else if (targetTab === "transactions") {
        await loadFilteredTransactions();
      } else if (targetTab === "settings") {
        await loadSettings();
      } else if (targetTab === "reports") {
        // Refresh reports when switching to reports tab
        if (typeof populateCategoryTrendSelect === "function") {
          await populateCategoryTrendSelect();
        }
        if (typeof populateYearSelect === "function") {
          populateYearSelect();
        }
      }
    });
  });
}

// Transaction Form Setup
function setupTransactionForm() {
  const form = document.getElementById("transactionForm");
  const addBtn = document.getElementById("addTransactionBtn");
  const modal = document.getElementById("transactionModal");
  const closeBtn = document.getElementById("closeModal");
  const cancelBtn = document.getElementById("cancelBtn");
  const amountInput = document.getElementById("transactionAmount");

  // Transaction type change handler
  const typeInputs = document.querySelectorAll('input[name="transactionType"]');
  typeInputs.forEach((input) => {
    input.addEventListener("change", updateCategoryAndMethodOptions);
  });

  // Format amount input on blur (Turkish format with full formatting)
  amountInput.addEventListener("blur", () => {
    const value = amountInput.value.trim();
    if (value) {
      const parsed = parseTurkishNumber(value);
      if (parsed !== null && parsed > 0) {
        amountInput.value = formatTurkishNumber(parsed);
      }
    }
  });

  // Auto-format on input (add thousands separator in real-time while typing)
  amountInput.addEventListener("input", (e) => {
    let value = e.target.value;

    // Store cursor position before formatting
    const cursorPosition = e.target.selectionStart;

    // Count digits and comma before cursor (to preserve cursor position relative to actual number)
    const textBeforeCursor = value.substring(0, cursorPosition);
    const digitsBeforeCursor = (textBeforeCursor.match(/\d/g) || []).length;
    const commaBeforeCursor = textBeforeCursor.includes(",");

    // Remove all formatting (dots) to get raw number
    const rawValue = value.replace(/\./g, "");

    // Remove all non-numeric characters except comma
    let cleaned = rawValue.replace(/[^\d,]/g, "");

    // Ensure only one comma (decimal separator)
    const commaIndex = cleaned.indexOf(",");
    if (commaIndex !== -1) {
      // Has comma - split integer and decimal
      let integerPart = cleaned.substring(0, commaIndex);
      let decimalPart = cleaned
        .substring(commaIndex + 1)
        .replace(/,/g, "")
        .substring(0, 2); // Max 2 decimal digits

      // Add thousands separator to integer part
      integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

      // Combine
      value = integerPart + "," + decimalPart;
    } else {
      // No comma - just format integer part
      value = cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    }

    // Update input value
    e.target.value = value;

    // Calculate new cursor position: find position after N digits
    let newCursorPosition = value.length;
    let digitCount = 0;

    for (let i = 0; i < value.length; i++) {
      if (value[i] === ",") {
        if (commaBeforeCursor && digitCount === digitsBeforeCursor) {
          newCursorPosition = i + 1;
          break;
        }
      } else if (/\d/.test(value[i])) {
        digitCount++;
        if (digitCount === digitsBeforeCursor) {
          if (commaBeforeCursor) {
            // Find comma position
            const commaPos = value.indexOf(",", i);
            if (commaPos !== -1) {
              newCursorPosition = commaPos + 1;
            } else {
              newCursorPosition = i + 1;
            }
          } else {
            // Position after this digit
            newCursorPosition = i + 1;
            // If there's a dot after, include it
            if (i + 1 < value.length && value[i + 1] === ".") {
              newCursorPosition = i + 2;
            }
          }
          break;
        } else if (digitCount > digitsBeforeCursor) {
          newCursorPosition = i;
          break;
        }
      }
    }

    // Ensure cursor doesn't go out of bounds
    newCursorPosition = Math.max(0, Math.min(newCursorPosition, value.length));

    // Set cursor position
    setTimeout(() => {
      e.target.setSelectionRange(newCursorPosition, newCursorPosition);
    }, 0);
  });

  // Open modal
  addBtn.addEventListener("click", () => {
    editingTransactionId = null;
    document.getElementById("modalTitle").textContent = "Yeni İşlem Ekle";
    form.reset();
    const now = getCurrentUTC3();
    document.getElementById("transactionDate").value = formatDateForInput(now);
    document.getElementById("transactionTime").value = formatTimeForInput(now);
    updateCategoryAndMethodOptions();
    modal.classList.add("show");
  });

  // Close modal
  closeBtn.addEventListener("click", closeTransactionModal);
  cancelBtn.addEventListener("click", closeTransactionModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeTransactionModal();
    }
  });

  // Form submit
  form.addEventListener("submit", handleTransactionSubmit);
}

// Update category and method options based on transaction type
function updateCategoryAndMethodOptions() {
  const typeInputs = document.querySelectorAll('input[name="transactionType"]');
  const selectedType = Array.from(typeInputs).find(
    (input) => input.checked
  )?.value;

  if (!selectedType || !currentSettings) return;

  const categorySelect = document.getElementById("transactionCategory");
  const methodSelect = document.getElementById("transactionPaymentMethod");

  // Clear options
  categorySelect.innerHTML = "";
  methodSelect.innerHTML = "";

  // Populate categories
  const categories =
    selectedType === "income"
      ? currentSettings.incomeCategories
      : currentSettings.expenseCategories;

  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });

  // Populate payment methods
  const methods =
    selectedType === "income"
      ? currentSettings.incomeMethods
      : currentSettings.expenseMethods;

  methods.forEach((method) => {
    const option = document.createElement("option");
    option.value = method;
    option.textContent = method;
    methodSelect.appendChild(option);
  });
}

// Handle transaction form submit
async function handleTransactionSubmit(e) {
  e.preventDefault();

  const dateStr = document.getElementById("transactionDate").value;
  const timeStr = document.getElementById("transactionTime").value;

  // Combine date and time
  const combinedDate = createDateFromDateTime(dateStr, timeStr);

  // Parse Turkish number format
  const amountValue = document.getElementById("transactionAmount").value.trim();
  const parsedAmount = parseTurkishNumber(amountValue);

  if (parsedAmount === null || parsedAmount <= 0) {
    showToast(
      "Geçerli bir tutar giriniz (Örn: 122.388,12 veya 122388,12)",
      "error"
    );
    return;
  }

  const formData = {
    type: document.querySelector('input[name="transactionType"]:checked')
      ?.value,
    amount: parsedAmount,
    category: document.getElementById("transactionCategory").value,
    paymentMethod: document.getElementById("transactionPaymentMethod").value,
    date: combinedDate,
    description: document.getElementById("transactionDescription").value,
  };

  // Validate
  const errors = validateTransactionForm(formData);
  if (errors.length > 0) {
    showToast(errors.join(", "), "error");
    return;
  }

  try {
    if (editingTransactionId) {
      // Update existing transaction
      await storage.updateTransaction(editingTransactionId, formData);
      showToast("İşlem güncellendi", "success");
    } else {
      // Add new transaction
      await storage.addTransaction(formData);
      showToast("İşlem eklendi", "success");
    }

    closeTransactionModal();
    await updateDashboard();
    await loadFilteredTransactions();
  } catch (error) {
    console.error("Error saving transaction:", error);
    showToast("İşlem kaydedilirken hata oluştu", "error");
  }
}

// Open transaction modal for editing
window.openTransactionModal = async function (transaction) {
  editingTransactionId = transaction.id;
  document.getElementById("modalTitle").textContent = "İşlemi Düzenle";

  // Set form values
  document.querySelector(
    `input[name="transactionType"][value="${transaction.type}"]`
  ).checked = true;
  document.getElementById("transactionAmount").value = formatTurkishNumber(
    transaction.amount
  );
  document.getElementById("transactionDate").value = formatDateForInput(
    transaction.date
  );
  document.getElementById("transactionTime").value = formatTimeForInput(
    transaction.date
  );
  document.getElementById("transactionDescription").value =
    transaction.description || "";
  document.getElementById("transactionId").value = transaction.id;

  // Update options first
  updateCategoryAndMethodOptions();

  // Set category and method after options are loaded
  setTimeout(() => {
    document.getElementById("transactionCategory").value = transaction.category;
    document.getElementById("transactionPaymentMethod").value =
      transaction.paymentMethod;
  }, 100);

  document.getElementById("transactionModal").classList.add("show");
};

// Close transaction modal
function closeTransactionModal() {
  document.getElementById("transactionModal").classList.remove("show");
  document.getElementById("transactionForm").reset();
  editingTransactionId = null;

  // Reset to current date/time
  const now = getCurrentUTC3();
  document.getElementById("transactionDate").value = formatDateForInput(now);
  document.getElementById("transactionTime").value = formatTimeForInput(now);
}

// Settings Management
async function loadSettings() {
  currentSettings = await storage.getSettings();
  console.log(
    "DEBUG: loadSettings called. Data Key Check:",
    Object.keys(currentSettings)
  );
  console.log(
    "DEBUG: Expense Categories Data:",
    currentSettings.expenseCategories
  );

  renderSettingsList(
    "incomeCategoriesList",
    currentSettings.incomeCategories,
    "income",
    "category"
  );
  renderSettingsList(
    "expenseCategoriesList",
    currentSettings.expenseCategories,
    "expense",
    "category"
  );
  renderSettingsList(
    "incomeMethodsList",
    currentSettings.incomeMethods,
    "income",
    "method"
  );
  renderSettingsList(
    "expenseMethodsList",
    currentSettings.expenseMethods,
    "expense",
    "method"
  );
  renderExcludedCategories();
  renderBudgets();
}

// Render excluded categories
async function renderExcludedCategories() {
  const container = document.getElementById("excludedCategoriesList");
  if (!container) return;

  const settings = await storage.getSettings();
  const excluded = settings.excludedFromReports || [];

  // Get all categories (income + expense)
  const allCategories = [
    ...(settings.incomeCategories || []),
    ...(settings.expenseCategories || []),
  ];

  // Remove duplicates
  const uniqueCategories = [...new Set(allCategories)];

  container.innerHTML = "";

  uniqueCategories.forEach((category) => {
    const isExcluded = excluded.includes(category);
    const checkboxDiv = document.createElement("div");
    checkboxDiv.className = "excluded-category-item";
    checkboxDiv.innerHTML = `
            <label class="checkbox-label">
                <input type="checkbox" value="${category}" ${
      isExcluded ? "checked" : ""
    } class="exclude-category-checkbox">
                <span>${category}</span>
            </label>
        `;

    const checkbox = checkboxDiv.querySelector("input");
    checkbox.addEventListener("change", async () => {
      await updateExcludedCategories();
    });

    container.appendChild(checkboxDiv);
  });
}

// Update excluded categories
async function updateExcludedCategories() {
  const checkboxes = document.querySelectorAll(
    ".exclude-category-checkbox:checked"
  );
  const excluded = Array.from(checkboxes).map((cb) => cb.value);

  try {
    currentSettings.excludedFromReports = excluded;
    await storage.updateSettings(currentSettings);

    // Refresh dashboard and reports
    await updateDashboard();
    showToast("Ayarlar güncellendi", "success");
  } catch (error) {
    console.error("Error updating excluded categories:", error);
    showToast("Güncellenirken hata oluştu", "error");
  }
}

// Render budgets
async function renderBudgets() {
  const container = document.getElementById("budgetList");
  if (!container) return;

  const settings = await storage.getSettings();
  const budgets = settings.categoryBudgets || {};
  const categories = settings.expenseCategories || [];

  container.innerHTML = "";

  categories.forEach((category) => {
    const budgetValue = budgets[category] || 0;
    const budgetDiv = document.createElement("div");
    budgetDiv.className = "budget-item-setting";
    budgetDiv.innerHTML = `
            <label>${category}</label>
            <div class="budget-input-group">
                <input type="number" step="0.01" min="0" value="${budgetValue}" class="budget-input" data-category="${category}" placeholder="Bütçe (₺)">
                <button class="btn btn-secondary btn-small" onclick="removeBudget('${category}')">Kaldır</button>
            </div>
        `;

    const input = budgetDiv.querySelector("input");
    input.addEventListener("blur", async () => {
      await updateBudget(category, parseFloat(input.value) || 0);
    });

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        input.blur();
      }
    });

    container.appendChild(budgetDiv);
  });
}

// Update budget
async function updateBudget(category, amount) {
  try {
    if (!currentSettings.categoryBudgets) {
      currentSettings.categoryBudgets = {};
    }

    if (amount > 0) {
      currentSettings.categoryBudgets[category] = amount;
    } else {
      delete currentSettings.categoryBudgets[category];
    }

    await storage.updateSettings(currentSettings);
    showToast("Bütçe güncellendi", "success");
  } catch (error) {
    console.error("Error updating budget:", error);
    showToast("Güncellenirken hata oluştu", "error");
  }
}

// Remove budget
async function removeBudget(category) {
  try {
    if (!currentSettings.categoryBudgets) {
      currentSettings.categoryBudgets = {};
    }
    delete currentSettings.categoryBudgets[category];
    await storage.updateSettings(currentSettings);
    await renderBudgets();
    showToast("Bütçe kaldırıldı", "success");
  } catch (error) {
    console.error("Error removing budget:", error);
    showToast("Kaldırılırken hata oluştu", "error");
  }
}

// Make removeBudget globally available
window.removeBudget = removeBudget;

function renderSettingsList(containerId, items, type, itemType) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!items || !Array.isArray(items)) {
    console.error("renderSettingsList: items is invalid", items);
    return;
  }

  items.forEach((item, index) => {
    // console.log("Rendering Item:", item); // Temporary Debug
    const itemDiv = document.createElement("div");
    itemDiv.className = "settings-item";
    itemDiv.innerHTML = `
            <input type="text" class="settings-input" value="${item}" data-original="${item}" data-type="${type}" data-item-type="${itemType}">
            <button class="btn btn-danger btn-small" onclick="deleteSettingsItem('${type}', '${itemType}', '${item}')">Sil</button>
        `;

    // Handle edit
    const input = itemDiv.querySelector("input");
    input.addEventListener("blur", async () => {
      const newValue = input.value.trim();
      const originalValue = input.dataset.original;

      if (newValue && newValue !== originalValue) {
        await updateSettingsItem(type, itemType, originalValue, newValue);
      } else if (!newValue) {
        input.value = originalValue;
      }
    });

    input.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        input.blur();
      }
    });

    container.appendChild(itemDiv);
  });
}

async function updateSettingsItem(type, itemType, oldName, newName) {
  if (!newName || newName.trim() === "") {
    showToast("İsim boş olamaz", "error");
    return;
  }

  try {
    const settingsKey = `${type}${
      itemType === "category" ? "Categories" : "Methods"
    }`;
    const items = currentSettings[settingsKey];

    if (items.includes(newName)) {
      showToast("Bu isim zaten kullanılıyor", "error");
      return;
    }

    // Update in settings
    const index = items.indexOf(oldName);
    if (index !== -1) {
      items[index] = newName;
      await storage.updateSettings(currentSettings);

      // Update in transactions
      if (itemType === "category") {
        await storage.updateCategoryInTransactions(oldName, newName, type);
      } else {
        await storage.updatePaymentMethodInTransactions(oldName, newName, type);
      }

      showToast("Güncellendi", "success");
      await loadSettings();
      await loadFilteredTransactions();
      await updateDashboard();
      // Update category trend select if it exists
      if (typeof populateCategoryTrendSelect === "function") {
        await populateCategoryTrendSelect();
      }
    }
  } catch (error) {
    console.error("Error updating settings item:", error);
    showToast("Güncellenirken hata oluştu", "error");
  }
}

async function deleteSettingsItem(type, itemType, name) {
  // Check if item is used in transactions
  let usageCount = 0;
  let usageDetails = "";

  if (itemType === "category") {
    const transactions = await storage.getAllTransactions();
    const categoryTransactions = transactions.filter(
      (t) => t.category === name && t.type === type
    );
    usageCount = categoryTransactions.length;

    if (usageCount > 0) {
      const totalAmount = categoryTransactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );
      usageDetails = `\n\nBu kategoride ${usageCount} işlem bulunmaktadır (Toplam: ${formatCurrency(
        totalAmount
      )}).\nİşlemler silinmeyecek, sadece kategori adı listeden kaldırılacaktır.`;
    }
  } else if (itemType === "method") {
    const transactions = await storage.getAllTransactions();
    const methodTransactions = transactions.filter(
      (t) => t.paymentMethod === name && t.type === type
    );
    usageCount = methodTransactions.length;

    if (usageCount > 0) {
      const totalAmount = methodTransactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );
      usageDetails = `\n\nBu ödeme yöntemi ${usageCount} işlemde kullanılmaktadır (Toplam: ${formatCurrency(
        totalAmount
      )}).\nİşlemler silinmeyecek, sadece ödeme yöntemi adı listeden kaldırılacaktır.`;
    }
  }

  const confirmMessage = `"${name}" öğesini silmek istediğinize emin misiniz?${usageDetails}`;

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    const settingsKey = `${type}${
      itemType === "category" ? "Categories" : "Methods"
    }`;
    const items = currentSettings[settingsKey];

    const index = items.indexOf(name);
    if (index !== -1) {
      items.splice(index, 1);

      // Remove from excluded categories if it's a category
      if (itemType === "category" && currentSettings.excludedFromReports) {
        const excludedIndex = currentSettings.excludedFromReports.indexOf(name);
        if (excludedIndex !== -1) {
          currentSettings.excludedFromReports.splice(excludedIndex, 1);
        }
      }

      // Remove from budgets if it's a category
      if (itemType === "category" && currentSettings.categoryBudgets) {
        delete currentSettings.categoryBudgets[name];
      }

      await storage.updateSettings(currentSettings);
      showToast("Silindi", "success");

      // Refresh all UI components
      await loadSettings();
      await initializeFilters();
      await loadFilteredTransactions();
      await updateDashboard();

      // Update category trend select if it exists
      if (typeof populateCategoryTrendSelect === "function") {
        await populateCategoryTrendSelect();
      }
    }
  } catch (error) {
    console.error("Error deleting settings item:", error);
    showToast("Silinirken hata oluştu", "error");
  }
}

function setupSettings() {
  document
    .getElementById("addIncomeCategoryBtn")
    .addEventListener("click", () => {
      addSettingsItem("income", "category", "newIncomeCategory");
    });

  document
    .getElementById("addExpenseCategoryBtn")
    .addEventListener("click", () => {
      addSettingsItem("expense", "category", "newExpenseCategory");
    });

  document
    .getElementById("addIncomeMethodBtn")
    .addEventListener("click", () => {
      addSettingsItem("income", "method", "newIncomeMethod");
    });

  document
    .getElementById("addExpenseMethodBtn")
    .addEventListener("click", () => {
      addSettingsItem("expense", "method", "newExpenseMethod");
    });
}

async function addSettingsItem(type, itemType, inputId) {
  const input = document.getElementById(inputId);
  const value = input.value.trim();

  if (!value) {
    showToast("Lütfen bir isim girin", "error");
    return;
  }

  try {
    const settingsKey = `${type}${
      itemType === "category" ? "Categories" : "Methods"
    }`;
    const items = currentSettings[settingsKey];

    if (items.includes(value)) {
      showToast("Bu isim zaten kullanılıyor", "error");
      return;
    }

    items.push(value);
    await storage.updateSettings(currentSettings);
    input.value = "";
    showToast("Eklendi", "success");
    await loadSettings();
    // Update category trend select if it exists
    if (typeof populateCategoryTrendSelect === "function") {
      await populateCategoryTrendSelect();
    }
  } catch (error) {
    console.error("Error adding settings item:", error);
    showToast("Eklenirken hata oluştu", "error");
  }
}

// Make deleteSettingsItem globally available
window.deleteSettingsItem = deleteSettingsItem;

// Backup Setup
function setupBackup() {
  // JSON Export
  document.getElementById("exportBtn").addEventListener("click", exportData);

  // Excel Export
  document
    .getElementById("exportExcelBtn")
    .addEventListener("click", exportToExcel);

  // JSON Import
  const importFile = document.getElementById("importFile");
  const selectFileBtn = document.getElementById("selectFileBtn");
  const importBtn = document.getElementById("importBtn");
  const fileNameSpan = document.getElementById("selectedFileName");

  selectFileBtn.addEventListener("click", () => {
    importFile.click();
  });

  importFile.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      fileNameSpan.textContent = e.target.files[0].name;
      importBtn.disabled = false;
    }
  });

  importBtn.addEventListener("click", async () => {
    if (importFile.files.length === 0) return;

    const mode = document.querySelector(
      'input[name="importMode"]:checked'
    ).value;

    try {
      await importData(importFile.files[0], mode);
      importFile.value = "";
      fileNameSpan.textContent = "";
      importBtn.disabled = true;

      // Reload all data
      currentSettings = await storage.getSettings(true); // Force refresh from storage
      await loadSettings(); // Update settings UI
      await initializeFilters(); // Update filter dropdowns
      updateCategoryAndMethodOptions(); // Update transaction form dropdowns
      await updateDashboard(); // Update charts
      await loadFilteredTransactions(); // Update transaction list
    } catch (error) {
      console.error("Import error:", error);
    }
  });

  // Excel Import
  const importExcelFile = document.getElementById("importExcelFile");
  const selectExcelFileBtn = document.getElementById("selectExcelFileBtn");
  const importExcelBtn = document.getElementById("importExcelBtn");
  const selectedExcelFileName = document.getElementById(
    "selectedExcelFileName"
  );

  selectExcelFileBtn.addEventListener("click", () => {
    importExcelFile.click();
  });

  importExcelFile.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      selectedExcelFileName.textContent = e.target.files[0].name;
      importExcelBtn.disabled = false;
    }
  });

  importExcelBtn.addEventListener("click", async () => {
    if (importExcelFile.files.length === 0) return;

    const mode = document.querySelector(
      'input[name="importExcelMode"]:checked'
    ).value;

    try {
      await importFromExcel(importExcelFile.files[0], mode);
      importExcelFile.value = "";
      selectedExcelFileName.textContent = "";
      importExcelBtn.disabled = true;

      // Reload all data
      // Reload all data
      currentSettings = await storage.getSettings(true); // Force refresh from storage
      await loadSettings();
      await initializeFilters();
      updateCategoryAndMethodOptions();
      await updateDashboard();
      await loadFilteredTransactions();
    } catch (error) {
      console.error("Excel import error:", error);
    }
  });
}

// Theme Toggle
// Theme Toggle
function setupThemeToggle() {
  const themeToggle = document.getElementById("themeToggle");
  const body = document.body;

  // 1. Try Local Storage first (Fastest)
  let savedTheme = localStorage.getItem("theme");

  // 2. If not in LocalStorage, check User Settings (from Firestore)
  if (!savedTheme && currentSettings && currentSettings.theme) {
    savedTheme = currentSettings.theme;
  }

  // 3. Default to light
  savedTheme = savedTheme || "light";

  body.setAttribute("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  themeToggle.addEventListener("click", async () => {
    const currentTheme = body.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";

    // UI Updates
    body.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme);

    // Persist to Cloud
    if (currentSettings) {
      currentSettings.theme = newTheme;
      try {
        // Save quietly (no toast needed for theme)
        await storage.updateSettings(currentSettings);
      } catch (e) {
        console.error("Tema kaydedilemedi:", e);
      }
    }
  });
}

function updateThemeIcon(theme) {
  const themeToggle = document.getElementById("themeToggle");
  themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
}

// Initialize app when DOM is ready

// Export initApp for auth.js
window.initApp = initApp;
