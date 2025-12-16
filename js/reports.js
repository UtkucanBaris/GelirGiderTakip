// Reports Management

let reportCategoryChart = null;
let reportDailyChart = null;
let reportTransactions = [];
let reportStartDate = null;
let reportEndDate = null;

// Get excluded categories from settings
async function getExcludedCategories() {
  try {
    const settings = await storage.getSettings();
    return settings.excludedFromReports || [];
  } catch (error) {
    console.error("Error getting excluded categories:", error);
    return [];
  }
}

// Filter transactions by excluded categories
async function filterExcludedCategories(transactions) {
  const excluded = await getExcludedCategories();
  if (excluded.length === 0) return transactions;
  return transactions.filter((t) => !excluded.includes(t.category));
}

// Initialize reports
async function setupReports() {
  // Set default dates (current month)
  const now = getCurrentUTC3();
  const startOfMonth = getStartOfMonth(now);
  const endOfMonth = getEndOfMonth(now);

  document.getElementById("reportStartDate").value =
    formatDateForInput(startOfMonth);
  document.getElementById("reportEndDate").value =
    formatDateForInput(endOfMonth);

  // Generate report button
  document
    .getElementById("generateReportBtn")
    .addEventListener("click", generateReport);

  // Monthly comparison report
  document
    .getElementById("generateMonthlyComparisonBtn")
    .addEventListener("click", generateMonthlyComparisonReport);

  // Category trend report
  await populateCategoryTrendSelect();
  document
    .getElementById("generateCategoryTrendBtn")
    .addEventListener("click", generateCategoryTrendReport);

  // Budget report
  document
    .getElementById("generateBudgetBtn")
    .addEventListener("click", generateBudgetReport);

  // Yearly summary report
  populateYearSelect();
  document
    .getElementById("generateYearlySummaryBtn")
    .addEventListener("click", generateYearlySummaryReport);
}

// Populate category trend select
async function populateCategoryTrendSelect() {
  const select = document.getElementById("categoryTrendSelect");
  if (!select) return;

  const settings = await storage.getSettings();
  const categories = settings.expenseCategories || [];

  select.innerHTML = "";
  categories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.appendChild(option);
  });
}

// Make populateCategoryTrendSelect globally available
window.populateCategoryTrendSelect = populateCategoryTrendSelect;

// Populate year select
function populateYearSelect() {
  const select = document.getElementById("yearSelect");
  if (!select) return;

  const currentYear = new Date().getFullYear();
  select.innerHTML = "";

  // Add years from 5 years ago to current year
  for (let year = currentYear - 5; year <= currentYear; year++) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    if (year === currentYear) {
      option.selected = true;
    }
    select.appendChild(option);
  }
}

// Make populateYearSelect globally available
window.populateYearSelect = populateYearSelect;

// Generate report for date range
async function generateReport() {
  const startDate = document.getElementById("reportStartDate").value;
  const endDate = document.getElementById("reportEndDate").value;

  if (!startDate || !endDate) {
    showToast("Lütfen başlangıç ve bitiş tarihlerini seçin", "error");
    return;
  }

  if (new Date(startDate) > new Date(endDate)) {
    showToast("Başlangıç tarihi bitiş tarihinden sonra olamaz", "error");
    return;
  }

  try {
    const transactions = await storage.getAllTransactions();

    // Filter by date range
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    let filteredTransactions = transactions.filter((t) => {
      return t.date >= start && t.date <= end;
    });

    // Filter excluded categories
    filteredTransactions = await filterExcludedCategories(filteredTransactions);

    // Calculate totals
    const totalIncome = filteredTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = totalIncome - totalExpense;

    // Update summary
    document.getElementById("reportTotalIncome").textContent =
      formatCurrency(totalIncome);
    document.getElementById("reportTotalExpense").textContent =
      formatCurrency(totalExpense);
    document.getElementById("reportNetBalance").textContent =
      formatCurrency(netBalance);
    document.getElementById("reportTransactionCount").textContent =
      filteredTransactions.length;

    // Update net balance color
    const netBalanceEl = document.getElementById("reportNetBalance");
    if (netBalance >= 0) {
      netBalanceEl.className = "report-value income";
    } else {
      netBalanceEl.className = "report-value expense";
    }

    // Store transactions and dates for category details
    reportTransactions = filteredTransactions;
    reportStartDate = start;
    reportEndDate = end;

    // Update charts
    await updateReportCategoryChart(filteredTransactions);
    updateReportDailyChart(filteredTransactions, start, end);

    // Show results
    document.getElementById("reportResults").style.display = "block";

    // Setup category details close button
    document
      .getElementById("closeCategoryDetails")
      .addEventListener("click", () => {
        document.getElementById("categoryDetails").style.display = "none";
      });
  } catch (error) {
    console.error("Error generating report:", error);
    showToast("Rapor oluşturulurken hata oluştu", "error");
  }
}

// Update category chart for report
async function updateReportCategoryChart(transactions) {
  // Filter excluded categories
  transactions = await filterExcludedCategories(transactions);
  const expenseTransactions = transactions.filter((t) => t.type === "expense");

  // Group by category
  const categoryTotals = {};
  expenseTransactions.forEach((t) => {
    if (!categoryTotals[t.category]) {
      categoryTotals[t.category] = 0;
    }
    categoryTotals[t.category] += t.amount;
  });

  // Sort by amount
  const sortedCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const labels = sortedCategories.map(([category]) => category);
  const data = sortedCategories.map(([, amount]) => amount);

  // Generate colors
  const colors = [
    "rgba(239, 68, 68, 0.8)",
    "rgba(249, 115, 22, 0.8)",
    "rgba(234, 179, 8, 0.8)",
    "rgba(34, 197, 94, 0.8)",
    "rgba(59, 130, 246, 0.8)",
    "rgba(147, 51, 234, 0.8)",
    "rgba(236, 72, 153, 0.8)",
    "rgba(168, 85, 247, 0.8)",
    "rgba(20, 184, 166, 0.8)",
    "rgba(245, 158, 11, 0.8)",
  ];

  const ctx = document.getElementById("reportCategoryChart").getContext("2d");

  if (reportCategoryChart) {
    reportCategoryChart.destroy();
  }

  reportCategoryChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Harcama",
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors
            .slice(0, labels.length)
            .map((c) => c.replace("0.8", "1")),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const total = data.reduce((sum, val) => sum + val, 0);
              const percentage =
                total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) : 0;
              return formatCurrency(context.parsed.y) + ` (${percentage}%)`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatCurrency(value);
            },
          },
        },
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const index = elements[0].index;
          const category = labels[index];
          showCategoryDetails(category);
        }
      },
      onHover: (event, elements) => {
        event.native.target.style.cursor =
          elements.length > 0 ? "pointer" : "default";
      },
    },
  });
}

// Show category details
function showCategoryDetails(categoryName) {
  // Filter transactions by category
  const categoryTransactions = reportTransactions.filter(
    (t) => t.category === categoryName
  );

  if (categoryTransactions.length === 0) {
    showToast("Bu kategoride işlem bulunamadı", "error");
    return;
  }

  // Sort by date (newest first)
  categoryTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Calculate totals
  const incomeTotal = categoryTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const expenseTotal = categoryTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // Update title
  document.getElementById(
    "categoryDetailsTitle"
  ).textContent = `${categoryName} - Detaylar`;

  // Build content
  let html = `
        <div class="category-summary">
            <div class="category-summary-item">
                <span>Toplam Gelir:</span>
                <strong class="income">${formatCurrency(incomeTotal)}</strong>
            </div>
            <div class="category-summary-item">
                <span>Toplam Gider:</span>
                <strong class="expense">${formatCurrency(expenseTotal)}</strong>
            </div>
            <div class="category-summary-item">
                <span>Net:</span>
                <strong class="${
                  incomeTotal - expenseTotal >= 0 ? "income" : "expense"
                }">${formatCurrency(incomeTotal - expenseTotal)}</strong>
            </div>
            <div class="category-summary-item">
                <span>İşlem Sayısı:</span>
                <strong>${categoryTransactions.length}</strong>
            </div>
        </div>
        <div class="category-transactions">
            <h5>İşlemler</h5>
            <table class="category-transactions-table">
                <thead>
                    <tr>
                        <th>Tarih</th>
                        <th>Tip</th>
                        <th>Ödeme Yöntemi</th>
                        <th>Tutar</th>
                        <th>Açıklama</th>
                    </tr>
                </thead>
                <tbody>
    `;

  categoryTransactions.forEach((transaction) => {
    const typeClass = transaction.type === "income" ? "income" : "expense";
    const typeLabel = transaction.type === "income" ? "Gelir" : "Gider";
    const amountClass =
      transaction.type === "income" ? "amount-income" : "amount-expense";
    const amountSign = transaction.type === "income" ? "+" : "-";

    html += `
            <tr>
                <td>${formatDateTime(transaction.date)}</td>
                <td><span class="type-badge type-${typeClass}">${typeLabel}</span></td>
                <td>${transaction.paymentMethod}</td>
                <td class="${amountClass}">${amountSign}${formatCurrency(
      transaction.amount
    )}</td>
                <td>${transaction.description || "-"}</td>
            </tr>
        `;
  });

  html += `
                </tbody>
            </table>
        </div>
    `;

  document.getElementById("categoryDetailsContent").innerHTML = html;
  document.getElementById("categoryDetails").style.display = "block";

  // Scroll to details
  document
    .getElementById("categoryDetails")
    .scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// Update daily trend chart for report
function updateReportDailyChart(transactions, startDate, endDate) {
  // Group by day
  const dailyData = {};
  const currentDate = new Date(startDate);

  // Initialize all days in range
  while (currentDate <= endDate) {
    const dateKey = formatDateForInput(currentDate);
    dailyData[dateKey] = { income: 0, expense: 0 };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Fill with transaction data
  transactions.forEach((t) => {
    const dateKey = formatDateForInput(t.date);
    if (dailyData[dateKey]) {
      if (t.type === "income") {
        dailyData[dateKey].income += t.amount;
      } else {
        dailyData[dateKey].expense += t.amount;
      }
    }
  });

  // Sort by date
  const sortedDays = Object.entries(dailyData).sort(
    (a, b) => new Date(a[0]) - new Date(b[0])
  );

  const labels = sortedDays.map(([date]) => formatDate(new Date(date)));
  const incomeData = sortedDays.map(([, data]) => data.income);
  const expenseData = sortedDays.map(([, data]) => data.expense);

  const ctx = document.getElementById("reportDailyChart").getContext("2d");

  if (reportDailyChart) {
    reportDailyChart.destroy();
  }

  reportDailyChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Gelir",
          data: incomeData,
          borderColor: "rgb(34, 197, 94)",
          backgroundColor: "rgba(34, 197, 94, 0.1)",
          tension: 0.4,
          fill: true,
        },
        {
          label: "Gider",
          data: expenseData,
          borderColor: "rgb(239, 68, 68)",
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label + ": " + formatCurrency(context.parsed.y)
              );
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatCurrency(value);
            },
          },
        },
      },
    },
  });
}

// Monthly Comparison Report
let monthlyComparisonChart = null;

async function generateMonthlyComparisonReport() {
  try {
    const transactions = await storage.getAllTransactions();
    const filteredTransactions = await filterExcludedCategories(transactions);

    const months = getLastNMonths(6);
    const monthData = [];

    months.forEach((month, index) => {
      const monthTransactions = filteredTransactions.filter((t) => {
        return t.date >= month.start && t.date <= month.end;
      });

      const income = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const expense = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      const net = income - expense;

      // Calculate percentage change from previous month
      let incomeChange = 0;
      let expenseChange = 0;
      let netChange = 0;

      if (index > 0) {
        const prevMonth = monthData[index - 1];
        if (prevMonth.income > 0) {
          incomeChange = ((income - prevMonth.income) / prevMonth.income) * 100;
        }
        if (prevMonth.expense > 0) {
          expenseChange =
            ((expense - prevMonth.expense) / prevMonth.expense) * 100;
        }
        if (prevMonth.net !== 0) {
          netChange = ((net - prevMonth.net) / Math.abs(prevMonth.net)) * 100;
        }
      }

      monthData.push({
        label: month.label,
        income,
        expense,
        net,
        incomeChange,
        expenseChange,
        netChange,
      });
    });

    // Update UI
    const container = document.getElementById("monthlyComparisonResults");
    if (container) {
      let html = '<div class="monthly-comparison-summary">';
      monthData.forEach((month, index) => {
        html += `
                    <div class="monthly-comparison-item">
                        <h4>${month.label}</h4>
                        <div class="monthly-stats">
                            <div class="stat-item">
                                <span>Gelir:</span>
                                <strong class="income">${formatCurrency(
                                  month.income
                                )}</strong>
                                ${
                                  index > 0
                                    ? `<span class="change ${
                                        month.incomeChange >= 0
                                          ? "positive"
                                          : "negative"
                                      }">${
                                        month.incomeChange >= 0 ? "+" : ""
                                      }${month.incomeChange.toFixed(1)}%</span>`
                                    : ""
                                }
                            </div>
                            <div class="stat-item">
                                <span>Gider:</span>
                                <strong class="expense">${formatCurrency(
                                  month.expense
                                )}</strong>
                                ${
                                  index > 0
                                    ? `<span class="change ${
                                        month.expenseChange >= 0
                                          ? "positive"
                                          : "negative"
                                      }">${
                                        month.expenseChange >= 0 ? "+" : ""
                                      }${month.expenseChange.toFixed(
                                        1
                                      )}%</span>`
                                    : ""
                                }
                            </div>
                            <div class="stat-item">
                                <span>Net:</span>
                                <strong class="${
                                  month.net >= 0 ? "income" : "expense"
                                }">${formatCurrency(month.net)}</strong>
                                ${
                                  index > 0
                                    ? `<span class="change ${
                                        month.netChange >= 0
                                          ? "positive"
                                          : "negative"
                                      }">${
                                        month.netChange >= 0 ? "+" : ""
                                      }${month.netChange.toFixed(1)}%</span>`
                                    : ""
                                }
                            </div>
                        </div>
                    </div>
                `;
      });
      html += "</div>";
      container.innerHTML = html;
    }

    // Update chart
    updateMonthlyComparisonChart(monthData);

    // Show results
    const resultsDiv = document.getElementById("monthlyComparisonResults");
    if (resultsDiv) {
      resultsDiv.style.display = "block";
    }
  } catch (error) {
    console.error("Error generating monthly comparison report:", error);
    showToast("Rapor oluşturulurken hata oluştu", "error");
  }
}

function updateMonthlyComparisonChart(monthData) {
  const ctx = document.getElementById("monthlyComparisonChart");
  if (!ctx) return;

  const labels = monthData.map((m) => m.label);
  const incomeData = monthData.map((m) => m.income);
  const expenseData = monthData.map((m) => m.expense);
  const netData = monthData.map((m) => m.net);

  if (monthlyComparisonChart) {
    monthlyComparisonChart.destroy();
  }

  monthlyComparisonChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Gelir",
          data: incomeData,
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderColor: "rgb(16, 185, 129)",
          borderWidth: 1,
        },
        {
          label: "Gider",
          data: expenseData,
          backgroundColor: "rgba(239, 68, 68, 0.8)",
          borderColor: "rgb(239, 68, 68)",
          borderWidth: 1,
        },
        {
          label: "Net",
          data: netData,
          type: "line",
          borderColor: "rgb(99, 102, 241)",
          backgroundColor: "rgba(99, 102, 241, 0.1)",
          borderWidth: 2,
          tension: 0.4,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label + ": " + formatCurrency(context.parsed.y)
              );
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatCurrency(value);
            },
          },
        },
      },
    },
  });
}

// Category Trend Analysis Report
let categoryTrendChart = null;

async function generateCategoryTrendReport() {
  try {
    const selectedCategories = Array.from(
      document.querySelectorAll("#categoryTrendSelect option:checked")
    ).map((opt) => opt.value);
    if (selectedCategories.length === 0) {
      showToast("Lütfen en az bir kategori seçin", "error");
      return;
    }

    const transactions = await storage.getAllTransactions();
    // Excluded categories are not filtered here because the user explicitly selects the categories they want to see
    const filteredTransactions = transactions;

    const months = getLastNMonths(6);
    const categoryData = {};

    selectedCategories.forEach((category) => {
      categoryData[category] = [];
    });

    months.forEach((month) => {
      const monthTransactions = filteredTransactions.filter((t) => {
        return (
          t.date >= month.start && t.date <= month.end && t.type === "expense"
        );
      });

      selectedCategories.forEach((category) => {
        const categoryTotal = monthTransactions
          .filter((t) => t.category === category)
          .reduce((sum, t) => sum + t.amount, 0);
        categoryData[category].push(categoryTotal);
      });
    });

    // Update chart
    updateCategoryTrendChart(
      months.map((m) => m.label),
      categoryData,
      selectedCategories
    );

    // Show results
    const resultsDiv = document.getElementById("categoryTrendResults");
    if (resultsDiv) {
      resultsDiv.style.display = "block";
    }
  } catch (error) {
    console.error("Error generating category trend report:", error);
    showToast("Rapor oluşturulurken hata oluştu", "error");
  }
}

function updateCategoryTrendChart(labels, categoryData, categories) {
  const ctx = document.getElementById("categoryTrendChart");
  if (!ctx) return;

  const colors = [
    "rgba(239, 68, 68, 0.8)",
    "rgba(249, 115, 22, 0.8)",
    "rgba(234, 179, 8, 0.8)",
    "rgba(34, 197, 94, 0.8)",
    "rgba(59, 130, 246, 0.8)",
    "rgba(147, 51, 234, 0.8)",
    "rgba(236, 72, 153, 0.8)",
    "rgba(168, 85, 247, 0.8)",
  ];

  const datasets = categories.map((category, index) => ({
    label: category,
    data: categoryData[category],
    borderColor: colors[index % colors.length].replace("0.8", "1"),
    backgroundColor: colors[index % colors.length],
    tension: 0.4,
    fill: false,
  }));

  if (categoryTrendChart) {
    categoryTrendChart.destroy();
  }

  categoryTrendChart = new Chart(ctx.getContext("2d"), {
    type: "line",
    data: {
      labels: labels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label + ": " + formatCurrency(context.parsed.y)
              );
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatCurrency(value);
            },
          },
        },
      },
    },
  });
}

// Budget vs Actual Report
let budgetChart = null;

async function generateBudgetReport() {
  try {
    const transactions = await storage.getAllTransactions();
    const filteredTransactions = await filterExcludedCategories(transactions);
    const settings = await storage.getSettings();
    const budgets = settings.categoryBudgets || {};

    const now = getCurrentUTC3();
    const startOfMonth = getStartOfMonth(now);
    const endOfMonth = getEndOfMonth(now);

    const monthTransactions = filteredTransactions.filter((t) => {
      return (
        t.date >= startOfMonth && t.date <= endOfMonth && t.type === "expense"
      );
    });

    const budgetData = [];
    const categoriesWithBudgets = Object.keys(budgets);

    if (categoriesWithBudgets.length === 0) {
      showToast(
        "Henüz bütçe tanımlanmamış. Ayarlardan bütçe ekleyebilirsiniz.",
        "error"
      );
      return;
    }

    categoriesWithBudgets.forEach((category) => {
      const budget = budgets[category];
      const actual = monthTransactions
        .filter((t) => t.category === category)
        .reduce((sum, t) => sum + t.amount, 0);
      const remaining = budget - actual;
      const percentage = budget > 0 ? (actual / budget) * 100 : 0;

      budgetData.push({
        category,
        budget,
        actual,
        remaining,
        percentage,
      });
    });

    // Update UI
    const container = document.getElementById("budgetResults");
    if (container) {
      let html = '<div class="budget-summary">';
      budgetData.forEach((item) => {
        html += `
                    <div class="budget-item">
                        <h4>${item.category}</h4>
                        <div class="budget-stats">
                            <div class="stat-item">
                                <span>Bütçe:</span>
                                <strong>${formatCurrency(item.budget)}</strong>
                            </div>
                            <div class="stat-item" style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="display: flex; align-items: center;">
                                    <span>Gerçekleşen:</span>
                                    <span class="percentage ${
                                      item.percentage > 100
                                        ? "negative"
                                        : "positive"
                                    }" style="margin-left: 8px;">
                                        (${item.percentage.toFixed(1)}%)
                                    </span>
                                </div>
                                <strong class="${
                                  item.percentage > 100 ? "expense" : "income"
                                }" style="margin-left: 16px;">${formatCurrency(
          item.actual
        )}</strong>
                            </div>
                            <div class="stat-item">
                                <span>Kalan:</span>
                                <strong class="${
                                  item.remaining >= 0 ? "income" : "expense"
                                }">${formatCurrency(item.remaining)}</strong>
                            </div>
                        </div>
                    </div>
                `;
      });
      html += "</div>";
      container.innerHTML = html;
    }

    // Update chart
    updateBudgetChart(budgetData);

    // Show results
    const resultsDiv = document.getElementById("budgetResults");
    if (resultsDiv) {
      resultsDiv.style.display = "block";
    }
  } catch (error) {
    console.error("Error generating budget report:", error);
    showToast("Rapor oluşturulurken hata oluştu", "error");
  }
}

function updateBudgetChart(budgetData) {
  const ctx = document.getElementById("budgetChart");
  if (!ctx) return;

  const labels = budgetData.map((d) => d.category);
  const budgetValues = budgetData.map((d) => d.budget);
  const actualValues = budgetData.map((d) => d.actual);

  if (budgetChart) {
    budgetChart.destroy();
  }

  budgetChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Bütçe",
          data: budgetValues,
          backgroundColor: "rgba(59, 130, 246, 0.8)",
          borderColor: "rgb(59, 130, 246)",
          borderWidth: 1,
        },
        {
          label: "Gerçekleşen",
          data: actualValues,
          backgroundColor: "rgba(239, 68, 68, 0.8)",
          borderColor: "rgb(239, 68, 68)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label + ": " + formatCurrency(context.parsed.y)
              );
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatCurrency(value);
            },
          },
        },
      },
    },
  });
}

// Yearly Summary Report
let yearlySummaryChart = null;

async function generateYearlySummaryReport() {
  try {
    const yearSelect = document.getElementById("yearSelect");
    const selectedYear = yearSelect
      ? parseInt(yearSelect.value)
      : new Date().getFullYear();

    const transactions = await storage.getAllTransactions();
    const filteredTransactions = await filterExcludedCategories(transactions);

    const yearStart = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);

    const yearTransactions = filteredTransactions.filter((t) => {
      return t.date >= yearStart && t.date <= yearEnd;
    });

    // Calculate totals
    const totalIncome = yearTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = yearTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = totalIncome - totalExpense;
    const monthlyAvgIncome = totalIncome / 12;
    const monthlyAvgExpense = totalExpense / 12;

    // Top categories
    const categoryTotals = {};
    yearTransactions
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        if (!categoryTotals[t.category]) {
          categoryTotals[t.category] = 0;
        }
        categoryTotals[t.category] += t.amount;
      });

    const topCategories = Object.entries(categoryTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));

    // Top payment methods
    const methodCounts = {};
    yearTransactions.forEach((t) => {
      if (!methodCounts[t.paymentMethod]) {
        methodCounts[t.paymentMethod] = 0;
      }
      methodCounts[t.paymentMethod] += 1;
    });

    const topMethods = Object.entries(methodCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([method, count]) => ({ method, count }));

    // Monthly breakdown
    const monthlyData = [];
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(selectedYear, month, 1);
      const monthEnd = new Date(selectedYear, month + 1, 0, 23, 59, 59);

      const monthTransactions = yearTransactions.filter((t) => {
        return t.date >= monthStart && t.date <= monthEnd;
      });

      const monthIncome = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const monthExpense = monthTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0);

      monthlyData.push({
        month: monthStart.toLocaleDateString("tr-TR", { month: "long" }),
        income: monthIncome,
        expense: monthExpense,
      });
    }

    // Update UI
    const container = document.getElementById("yearlySummaryResults");
    if (container) {
      let html = `
                <div class="yearly-summary-stats">
                    <div class="yearly-stat-card yearly-income-card">
                        <h4>Toplam Gelir</h4>
                        <p class="yearly-value income">${formatCurrency(
                          totalIncome
                        )}</p>
                    </div>
                    <div class="yearly-stat-card yearly-expense-card">
                        <h4>Toplam Gider</h4>
                        <p class="yearly-value expense">${formatCurrency(
                          totalExpense
                        )}</p>
                    </div>
                    <div class="yearly-stat-card yearly-${
                      netBalance >= 0 ? "income" : "expense"
                    }-card">
                        <h4>Net Bakiye</h4>
                        <p class="yearly-value ${
                          netBalance >= 0 ? "income" : "expense"
                        }">${formatCurrency(netBalance)}</p>
                    </div>
                    <div class="yearly-stat-card yearly-income-card">
                        <h4>Aylık Ortalama Gelir</h4>
                        <p class="yearly-value income">${formatCurrency(
                          monthlyAvgIncome
                        )}</p>
                    </div>
                    <div class="yearly-stat-card yearly-expense-card">
                        <h4>Aylık Ortalama Gider</h4>
                        <p class="yearly-value expense">${formatCurrency(
                          monthlyAvgExpense
                        )}</p>
                    </div>
                </div>
                <div class="yearly-top-categories">
                    <h4>En Çok Harcama Yapılan Kategoriler</h4>
                    <ul>
                        ${topCategories
                          .map(
                            (cat) =>
                              `<li><span>${
                                cat.category
                              }</span><strong>${formatCurrency(
                                cat.amount
                              )}</strong></li>`
                          )
                          .join("")}
                    </ul>
                </div>
                <div class="yearly-top-methods">
                    <h4>En Çok Kullanılan Ödeme Yöntemleri</h4>
                    <ul>
                        ${topMethods
                          .map(
                            (m) =>
                              `<li><span>${m.method}</span><strong>${m.count} işlem</strong></li>`
                          )
                          .join("")}
                    </ul>
                </div>
            `;
      container.innerHTML = html;
    }

    // Update chart
    updateYearlySummaryChart(monthlyData);

    // Show results
    const resultsDiv = document.getElementById("yearlySummaryResults");
    if (resultsDiv) {
      resultsDiv.style.display = "block";
    }
  } catch (error) {
    console.error("Error generating yearly summary report:", error);
    showToast("Rapor oluşturulurken hata oluştu", "error");
  }
}

function updateYearlySummaryChart(monthlyData) {
  const ctx = document.getElementById("yearlySummaryChart");
  if (!ctx) return;

  const labels = monthlyData.map((d) => d.month);
  const incomeData = monthlyData.map((d) => d.income);
  const expenseData = monthlyData.map((d) => d.expense);

  if (yearlySummaryChart) {
    yearlySummaryChart.destroy();
  }

  yearlySummaryChart = new Chart(ctx.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Gelir",
          data: incomeData,
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderColor: "rgb(16, 185, 129)",
          borderWidth: 1,
        },
        {
          label: "Gider",
          data: expenseData,
          backgroundColor: "rgba(239, 68, 68, 0.8)",
          borderColor: "rgb(239, 68, 68)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label + ": " + formatCurrency(context.parsed.y)
              );
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return formatCurrency(value);
            },
          },
        },
      },
    },
  });
}
