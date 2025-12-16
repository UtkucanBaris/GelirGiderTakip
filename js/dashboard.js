// Dashboard Calculations and Charts

let trendChart = null;
let categoryChart = null;
let categoryPieChart = null;
let paymentMethodChart = null;

// Get excluded categories from settings
async function getExcludedCategories() {
    try {
        const settings = await storage.getSettings();
        return settings.excludedFromReports || [];
    } catch (error) {
        console.error('Error getting excluded categories:', error);
        return [];
    }
}

// Filter transactions by excluded categories
async function filterExcludedCategories(transactions) {
    const excluded = await getExcludedCategories();
    if (excluded.length === 0) return transactions;
    return transactions.filter(t => !excluded.includes(t.category));
}

// Update dashboard
async function updateDashboard() {
    try {
        let transactions = await storage.getAllTransactions();
        // Filter excluded categories
        transactions = await filterExcludedCategories(transactions);
        const now = new Date();
        const currentMonthStart = getStartOfMonth(now);
        const currentMonthEnd = getEndOfMonth(now);

        // Calculate totals
        const totalIncome = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const netBalance = totalIncome - totalExpense;

        // Current month calculations
        const currentMonthTransactions = transactions.filter(t => {
            return t.date >= currentMonthStart && t.date <= currentMonthEnd;
        });

        const currentMonthExpenses = currentMonthTransactions
            .filter(t => t.type === 'expense')
            .map(t => t.amount);

        const currentMonthIncome = currentMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const currentMonthExpenseTotal = currentMonthExpenses.reduce((sum, a) => sum + a, 0);

        const dailyAverage = currentMonthExpenses.length > 0
            ? currentMonthExpenseTotal / currentMonthExpenses.length
            : 0;

        const highestExpense = currentMonthExpenses.length > 0
            ? Math.max(...currentMonthExpenses)
            : 0;

        const highestExpenseTransaction = currentMonthTransactions.find(t =>
            t.type === 'expense' && t.amount === highestExpense
        );

        // Update cards
        document.getElementById('netBalance').textContent = formatCurrency(netBalance);
        document.getElementById('totalIncome').textContent = formatCurrency(totalIncome);
        document.getElementById('totalExpense').textContent = formatCurrency(totalExpense);
        document.getElementById('dailyAverage').textContent = formatCurrency(dailyAverage);
        document.getElementById('highestExpense').textContent = formatCurrency(highestExpense);
        document.getElementById('monthlyIncome').textContent = formatCurrency(currentMonthIncome);
        document.getElementById('monthlyExpense').textContent = formatCurrency(currentMonthExpenseTotal);
        
        const highestDesc = highestExpenseTransaction
            ? `${highestExpenseTransaction.category} - ${highestExpenseTransaction.description || ''}`
            : '-';
        document.getElementById('highestExpenseDesc').textContent = highestDesc;

        // Update charts
        updateTrendChart(transactions);
        await updateCategoryChart(transactions);
        await updateCategoryPieChart(transactions);
        updatePaymentMethodChart(transactions);

        // Update card colors based on balance
        const balanceCard = document.querySelector('.balance-card');
        if (netBalance >= 0) {
            balanceCard.classList.remove('negative');
            balanceCard.classList.add('positive');
        } else {
            balanceCard.classList.remove('positive');
            balanceCard.classList.add('negative');
        }
    } catch (error) {
        console.error('Error updating dashboard:', error);
        showToast('Dashboard güncellenirken hata oluştu', 'error');
    }
}

// Update trend chart (last 6 months)
function updateTrendChart(transactions) {
    const months = getLastNMonths(6);
    const incomeData = [];
    const expenseData = [];
    const labels = [];

    months.forEach(month => {
        labels.push(month.label);
        
        const monthTransactions = transactions.filter(t => {
            return t.date >= month.start && t.date <= month.end;
        });

        const income = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const expense = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        incomeData.push(income);
        expenseData.push(expense);
    });

    const ctx = document.getElementById('trendChart').getContext('2d');

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Gelir',
                    data: incomeData,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Gider',
                    data: expenseData,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Update category chart (top expense categories)
async function updateCategoryChart(transactions) {
    // Filter excluded categories
    transactions = await filterExcludedCategories(transactions);
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    // Group by category
    const categoryTotals = {};
    expenseTransactions.forEach(t => {
        if (!categoryTotals[t.category]) {
            categoryTotals[t.category] = 0;
        }
        categoryTotals[t.category] += t.amount;
    });

    // Sort by amount and get top 8
    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    const labels = sortedCategories.map(([category]) => category);
    const data = sortedCategories.map(([, amount]) => amount);

    // Generate colors
    const colors = [
        'rgba(239, 68, 68, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(147, 51, 234, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(168, 85, 247, 0.8)'
    ];

    const ctx = document.getElementById('categoryChart').getContext('2d');

    if (categoryChart) {
        categoryChart.destroy();
    }

    categoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Harcama',
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = data.reduce((sum, val) => sum + val, 0);
                            const percentage = ((context.parsed.y / total) * 100).toFixed(1);
                            return formatCurrency(context.parsed.y) + ` (${percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}

// Update category pie chart
async function updateCategoryPieChart(transactions) {
    // Filter excluded categories
    transactions = await filterExcludedCategories(transactions);
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    // Group by category
    const categoryTotals = {};
    expenseTransactions.forEach(t => {
        if (!categoryTotals[t.category]) {
            categoryTotals[t.category] = 0;
        }
        categoryTotals[t.category] += t.amount;
    });

    // Sort by amount
    const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    const labels = sortedCategories.map(([category]) => category);
    const data = sortedCategories.map(([, amount]) => amount);

    // Generate colors
    const colors = [
        'rgba(239, 68, 68, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(147, 51, 234, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(168, 85, 247, 0.8)'
    ];

    const ctx = document.getElementById('categoryPieChart').getContext('2d');

    if (categoryPieChart) {
        categoryPieChart.destroy();
    }

    categoryPieChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: '#ffffff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = data.reduce((sum, val) => sum + val, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + formatCurrency(context.parsed) + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// Update payment method chart
function updatePaymentMethodChart(transactions) {
    // Group by payment method
    const methodTotals = {};
    const methodCounts = {};
    
    transactions.forEach(t => {
        if (!methodTotals[t.paymentMethod]) {
            methodTotals[t.paymentMethod] = 0;
            methodCounts[t.paymentMethod] = 0;
        }
        methodTotals[t.paymentMethod] += t.amount;
        methodCounts[t.paymentMethod] += 1;
    });

    // Sort by count (most used)
    const sortedMethods = Object.entries(methodCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    const labels = sortedMethods.map(([method]) => method);
    const counts = sortedMethods.map(([, count]) => count);
    const amounts = sortedMethods.map(([method]) => methodTotals[method]);

    // Generate colors
    const colors = [
        'rgba(59, 130, 246, 0.8)',
        'rgba(147, 51, 234, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(249, 115, 22, 0.8)',
        'rgba(234, 179, 8, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(168, 85, 247, 0.8)'
    ];

    const ctx = document.getElementById('paymentMethodChart').getContext('2d');

    if (paymentMethodChart) {
        paymentMethodChart.destroy();
    }

    paymentMethodChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'İşlem Sayısı',
                    data: counts,
                    backgroundColor: colors.slice(0, labels.length),
                    borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Toplam Tutar',
                    data: amounts,
                    type: 'line',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            if (context.datasetIndex === 0) {
                                return 'İşlem Sayısı: ' + context.parsed.y;
                            } else {
                                return 'Toplam Tutar: ' + formatCurrency(context.parsed.y);
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'İşlem Sayısı'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Toplam Tutar (₺)'
                    },
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value);
                        }
                    }
                }
            }
        }
    });
}
