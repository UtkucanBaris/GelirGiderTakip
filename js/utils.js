// Utility Functions

// UTC+3 timezone offset (in minutes)
const UTC3_OFFSET = 3 * 60; // 3 hours = 180 minutes

// Convert date to UTC+3
function toUTC3(date) {
    if (!date) return null;
    const d = new Date(date);
    // Get local time in UTC
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    // Convert to UTC+3
    const utc3 = new Date(utc + (UTC3_OFFSET * 60000));
    return utc3;
}

// Get current date/time in UTC+3
function getCurrentUTC3() {
    return toUTC3(new Date());
}

// Format date with UTC+3
function formatDate(date) {
    if (!date) return '';
    const d = toUTC3(date);
    return new Intl.DateTimeFormat('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'Europe/Istanbul'
    }).format(d);
}

// Format date and time with UTC+3
function formatDateTime(date) {
    if (!date) return '';
    const d = toUTC3(date);
    return new Intl.DateTimeFormat('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Istanbul'
    }).format(d);
}

// Format date for input (UTC+3)
function formatDateForInput(date) {
    if (!date) return '';
    const d = toUTC3(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format time for input (UTC+3)
function formatTimeForInput(date) {
    if (!date) return '';
    const d = toUTC3(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

// Create date from date and time strings (UTC+3)
function createDateFromDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    const [hours, minutes] = timeStr.split(':').map(Number);
    
    // Create date in UTC+3
    const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0, 0));
    // Adjust for UTC+3 offset
    const utc3Date = new Date(date.getTime() - (UTC3_OFFSET * 60000));
    return utc3Date;
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2
    }).format(amount);
}

// Format Turkish number (for input display: 122.388,12)
function formatTurkishNumber(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '';
    const parts = amount.toFixed(2).split('.');
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return integerPart + ',' + parts[1];
}

// Parse Turkish number format (handles both Turkish and English formats)
function parseTurkishNumber(value) {
    if (!value || typeof value !== 'string') return null;
    
    let cleaned = value.trim().replace(/\s/g, '');
    
    // If empty, return null
    if (cleaned === '') return null;
    
    // Handle Turkish format: 122.388,12 or 122388,12
    if (cleaned.includes(',')) {
        // Turkish format: dot for thousands, comma for decimal
        if (cleaned.includes('.')) {
            // Has both: remove dots (thousands) and replace comma with dot (decimal)
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            // Only comma: check if it's decimal (last 3 chars) or thousands
            const lastCommaIndex = cleaned.lastIndexOf(',');
            if (lastCommaIndex === cleaned.length - 3) {
                // Decimal separator (e.g., 123,45)
                cleaned = cleaned.replace(',', '.');
            } else {
                // Thousands separator (shouldn't happen with comma, but handle it)
                cleaned = cleaned.replace(/,/g, '');
            }
        }
    } else if (cleaned.includes('.')) {
        // English format or thousands separator
        // Check if it's likely a decimal (last 3 chars) or thousands
        const lastDotIndex = cleaned.lastIndexOf('.');
        if (lastDotIndex === cleaned.length - 3 && cleaned.split('.').length === 2) {
            // Likely decimal separator (e.g., 123.45)
            // Keep as is
        } else {
            // Likely thousands separator, remove it
            cleaned = cleaned.replace(/\./g, '');
        }
    }
    
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed) || parsed <= 0) return null;
    return parsed;
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Export data to JSON file
async function exportData() {
    try {
        const data = await storage.exportData();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gelir-gider-yedek-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Veriler başarıyla indirildi!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showToast('Veri indirme hatası: ' + error.message, 'error');
    }
}

// Import data from JSON file
async function importData(file, mode = 'merge') {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // Validate data structure
                if (!data || (typeof data !== 'object')) {
                    throw new Error('Geçersiz dosya formatı');
                }

                // Validate transactions
                if (data.transactions && !Array.isArray(data.transactions)) {
                    throw new Error('İşlemler dizi formatında olmalıdır');
                }

                // Validate settings
                if (data.settings && typeof data.settings !== 'object') {
                    throw new Error('Ayarlar obje formatında olmalıdır');
                }

                await storage.importData(data, mode);
                showToast('Veriler başarıyla yüklendi!', 'success');
                resolve();
            } catch (error) {
                console.error('Import error:', error);
                showToast('Veri yükleme hatası: ' + error.message, 'error');
                reject(error);
            }
        };

        reader.onerror = () => {
            const error = new Error('Dosya okuma hatası');
            showToast('Dosya okuma hatası', 'error');
            reject(error);
        };

        reader.readAsText(file);
    });
}

// Get month name in Turkish
function getMonthName(monthIndex) {
    const months = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];
    return months[monthIndex];
}

// Get month-year string
function getMonthYear(date) {
    const d = new Date(date);
    return `${getMonthName(d.getMonth())} ${d.getFullYear()}`;
}

// Calculate days between dates
function daysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.round(Math.abs((date1 - date2) / oneDay));
}

// Get start of month
function getStartOfMonth(date) {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Get end of month
function getEndOfMonth(date) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    d.setHours(23, 59, 59, 999);
    return d;
}

// Get last N months
function getLastNMonths(n = 6) {
    const months = [];
    const today = new Date();
    
    for (let i = n - 1; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({
            date: date,
            label: `${getMonthName(date.getMonth())} ${date.getFullYear()}`,
            start: getStartOfMonth(date),
            end: getEndOfMonth(date)
        });
    }
    
    return months;
}

// Validate transaction form
function validateTransactionForm(formData) {
    const errors = [];

    if (!formData.type || (formData.type !== 'income' && formData.type !== 'expense')) {
        errors.push('İşlem tipi seçilmelidir');
    }

    // Amount is already parsed in handleTransactionSubmit, so it should be a number
    if (!formData.amount || typeof formData.amount !== 'number' || formData.amount <= 0 || isNaN(formData.amount)) {
        errors.push('Geçerli bir tutar girilmelidir');
    }

    if (!formData.category || formData.category.trim() === '') {
        errors.push('Kategori seçilmelidir');
    }

    if (!formData.paymentMethod || formData.paymentMethod.trim() === '') {
        errors.push('Ödeme yöntemi seçilmelidir');
    }

    if (!formData.date || !(formData.date instanceof Date) || isNaN(formData.date.getTime())) {
        errors.push('Geçerli bir tarih ve saat seçilmelidir');
    }

    return errors;
}

// Format date for Excel (DD.MM.YYYY)
function formatDateForExcel(date) {
    if (!date) return '';
    const d = toUTC3(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

// Parse date from Excel format (DD.MM.YYYY or YYYY-MM-DD)
function parseDateFromExcel(dateStr) {
    if (!dateStr) return null;
    
    // Try DD.MM.YYYY format
    if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
    }
    
    // Try YYYY-MM-DD format
    if (dateStr.includes('-')) {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
    }
    
    return null;
}

// Escape CSV field (for semicolon-separated)
function escapeCSV(field) {
    if (field === null || field === undefined) return '';
    const str = String(field);
    if (str.includes(';') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// Format currency for Excel (₺100,00)
function formatCurrencyForExcel(amount) {
    if (amount === 0 || amount === '') return '₺0,00';
    const formatted = Math.abs(amount).toFixed(2).replace('.', ',');
    return `₺${formatted}`;
}

// Export to Excel (CSV format with semicolon separator)
async function exportToExcel() {
    try {
        const transactions = await storage.getAllTransactions();
        
        // Sort by date
        const sortedTransactions = [...transactions].sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });
        
        // Calculate running balance
        let runningBalance = 0;
        
        // CSV header (semicolon-separated)
        const headers = ['ID', 'Tarih', 'Saat', 'Kategori', 'İşlem', 'Gelir', 'Gider', 'Bakiye', 'Tip', 'Açıklama'];
        const rows = [headers.join(';') + ';;'];
        
        // Process each transaction
        sortedTransactions.forEach(transaction => {
            const tarih = formatDateForExcel(transaction.date);
            const saat = formatTimeForInput(transaction.date);
            const kategori = escapeCSV(transaction.category);
            const islem = escapeCSV(transaction.paymentMethod);
            const aciklama = escapeCSV(transaction.description || '');
            const tip = transaction.type === 'income' ? 'Gelir' : 'Gider';
            
            let gelir = '';
            let gider = '';
            
            if (transaction.type === 'income') {
                gelir = formatCurrencyForExcel(transaction.amount);
                runningBalance += transaction.amount;
            } else {
                gider = '-' + formatCurrencyForExcel(transaction.amount);
                runningBalance -= transaction.amount;
            }
            
            // If no amount in the opposite column, show ₺0,00
            if (transaction.type === 'income') {
                gider = '₺0,00';
            } else {
                gelir = '₺0,00';
            }
            
            const bakiye = formatCurrencyForExcel(runningBalance);
            
            const row = [
                transaction.id || '',
                tarih,
                saat,
                kategori,
                islem,
                gelir,
                gider,
                bakiye,
                tip,
                aciklama
            ];
            
            rows.push(row.join(';') + ';;');
        });
        
        // Create CSV content
        const csvContent = rows.join('\n');
        
        // Add BOM for Excel UTF-8 support
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gelir-gider-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Excel dosyası başarıyla indirildi!', 'success');
    } catch (error) {
        console.error('Excel export error:', error);
        showToast('Excel indirme hatası: ' + error.message, 'error');
    }
}

// Import from Excel (CSV format)
async function importFromExcel(file, mode = 'merge') {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    throw new Error('Dosya boş veya geçersiz format');
                }
                
                // Parse header (semicolon-separated)
                const headerLine = lines[0].replace(/^\uFEFF/, ''); // Remove BOM
                // Remove trailing semicolons
                const cleanHeaderLine = headerLine.replace(/;+$/, '').trim();
                // Split and filter out empty headers
                const headers = cleanHeaderLine.split(';')
                    .map(h => h.trim().replace(/^"|"$/g, ''))
                    .filter(h => h.length > 0);
                
                // Normalize headers (remove Turkish characters for comparison)
                const normalizeHeader = (str) => {
                    if (!str) return '';
                    // Handle Turkish İ character specifically first
                    let normalized = str.replace(/İ/g, 'I').replace(/ı/g, 'i');
                    // Normalize Unicode (NFD) and remove diacritics
                    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                    // Convert to lowercase
                    normalized = normalized.toLowerCase()
                        .replace(/ğ/g, 'g')
                        .replace(/ü/g, 'u')
                        .replace(/ş/g, 's')
                        .replace(/ö/g, 'o')
                        .replace(/ç/g, 'c')
                        .trim();
                    return normalized;
                };
                
                // Expected headers (normalized for comparison)
                const expectedHeaders = ['id', 'tarih', 'saat', 'kategori', 'islem', 'gelir', 'gider', 'bakiye', 'tip', 'aciklama'];
                
                // Normalize all headers
                const normalizedHeaders = headers.map(h => normalizeHeader(h));
                
                // Debug log (commented out for production)
                // console.log('Original headers:', headers);
                // console.log('Normalized headers:', normalizedHeaders);
                // console.log('Expected headers:', expectedHeaders);
                
                // Validate headers (flexible - allow different order and case)
                const missingHeaders = [];
                expectedHeaders.forEach(expected => {
                    const found = normalizedHeaders.some(normalized => normalized === expected);
                    if (!found) {
                        missingHeaders.push(expected);
                    }
                });
                
                if (missingHeaders.length > 0) {
                    console.error('Missing headers:', missingHeaders);
                    throw new Error(`Dosya formatı geçersiz. Bulunan sütunlar: ${headers.join(', ')}. Eksik sütunlar: ${missingHeaders.join(', ')}`);
                }
                
                // Get column indices (using normalized comparison)
                const getIndex = (normalizedName) => {
                    const idx = normalizedHeaders.findIndex(h => h === normalizedName);
                    return idx >= 0 ? idx : null;
                };
                
                const tarihIdx = getIndex('tarih');
                const saatIdx = getIndex('saat');
                const kategoriIdx = getIndex('kategori');
                const islemIdx = getIndex('islem');
                const gelirIdx = getIndex('gelir');
                const giderIdx = getIndex('gider');
                const tipIdx = getIndex('tip');
                const aciklamaIdx = getIndex('aciklama');
                
                if (tarihIdx === null || kategoriIdx === null || islemIdx === null) {
                    throw new Error('Gerekli sütunlar bulunamadı');
                }
                
                // Clear existing if replace mode
                if (mode === 'replace') {
                    const allTransactions = await storage.getAllTransactions();
                    for (const t of allTransactions) {
                        await storage.deleteTransaction(t.id);
                    }
                }
                
                // Parse rows
                let imported = 0;
                let skipped = 0;
                const skippedDetails = [];
                
                for (let i = 1; i < lines.length; i++) {
                    let line = lines[i].trim();
                    if (!line) continue;
                    
                    // Remove trailing semicolons
                    line = line.replace(/;+$/, '');
                    
                    // Parse semicolon-separated line (handle quoted fields)
                    const fields = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let j = 0; j < line.length; j++) {
                        const char = line[j];
                        if (char === '"') {
                            if (inQuotes && line[j + 1] === '"') {
                                current += '"';
                                j++;
                            } else {
                                inQuotes = !inQuotes;
                            }
                        } else if (char === ';' && !inQuotes) {
                            fields.push(current);
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    fields.push(current);
                    
                    // Extract values
                    const tarih = fields[tarihIdx]?.trim() || '';
                    const saat = fields[saatIdx]?.trim() || '00:00';
                    const kategori = fields[kategoriIdx]?.trim() || '';
                    const islem = fields[islemIdx]?.trim() || '';
                    let gelir = fields[gelirIdx]?.trim() || '';
                    let gider = fields[giderIdx]?.trim() || '';
                    const tip = fields[tipIdx]?.trim() || '';
                    const aciklama = fields[aciklamaIdx]?.trim() || '';
                    
                    // Parse currency values (₺100,00 or -₺80,00 or 34.587,02)
                    const parseCurrency = (value) => {
                        if (!value || value.trim() === '' || value === '₺0,00' || value === '-₺0,00') return 0;
                        // Remove ₺ and spaces
                        let cleaned = value.replace(/₺/g, '').replace(/\s/g, '');
                        // Handle negative sign
                        const isNegative = cleaned.startsWith('-');
                        if (isNegative) {
                            cleaned = cleaned.substring(1);
                        }
                        // Handle Turkish number format: 34.587,02 (thousands separator is dot, decimal is comma)
                        // If there's a comma and it's not the last 3 chars, it might be a thousands separator
                        // Turkish format: dot for thousands, comma for decimal
                        if (cleaned.includes('.') && cleaned.includes(',')) {
                            // Remove thousands separators (dots) and replace comma with dot for decimal
                            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
                        } else if (cleaned.includes(',')) {
                            // Only comma - check if it's decimal (last 3 chars) or thousands separator
                            const lastCommaIndex = cleaned.lastIndexOf(',');
                            if (lastCommaIndex === cleaned.length - 3) {
                                // Decimal separator (e.g., 123,45)
                                cleaned = cleaned.replace(',', '.');
                            } else {
                                // Thousands separator (e.g., 1,234)
                                cleaned = cleaned.replace(/,/g, '');
                            }
                        }
                        const parsed = parseFloat(cleaned) || 0;
                        return isNegative ? -parsed : parsed;
                    };
                    
                    // Parse currency amounts
                    const gelirAmount = Math.abs(parseCurrency(gelir));
                    const giderAmount = Math.abs(parseCurrency(gider));
                    
                    // Determine type and amount - prioritize actual values over tip column
                    let type = null;
                    let amount = 0;
                    
                    // Check gelir/gider columns first (they have the actual values)
                    if (gelirAmount > 0 && giderAmount === 0) {
                        type = 'income';
                        amount = gelirAmount;
                    } else if (giderAmount > 0 && gelirAmount === 0) {
                        type = 'expense';
                        amount = giderAmount;
                    } else if (gelirAmount > 0 && giderAmount > 0) {
                        // Both have values - use tip column to decide, or default to gelir
                        if (tip && tip.trim() !== '') {
                            const tipLower = tip.toLowerCase();
                            if (tipLower.includes('gider')) {
                                type = 'expense';
                                amount = giderAmount;
                            } else {
                                type = 'income';
                                amount = gelirAmount;
                            }
                        } else {
                            // Default to gelir if both present
                            type = 'income';
                            amount = gelirAmount;
                        }
                    } else if (gelirAmount === 0 && giderAmount === 0) {
                        // Both are zero - try to use tip column if available
                        if (tip && tip.trim() !== '') {
                            const tipLower = tip.toLowerCase();
                            if (tipLower.includes('gelir')) {
                                type = 'income';
                                amount = 0; // Will be skipped later
                            } else if (tipLower.includes('gider')) {
                                type = 'expense';
                                amount = 0; // Will be skipped later
                            }
                        }
                    }
                    
                    // Validate required fields with detailed error messages
                    let skipReason = '';
                    
                    if (!type || !amount || amount <= 0) {
                        skipReason = `Satır ${i + 1}: Geçersiz tip veya tutar`;
                        if (!type) {
                            skipReason += ` (Tip belirlenemedi - Gelir: "${gelir}", Gider: "${gider}", Tip: "${tip}")`;
                        } else if (!amount || amount <= 0) {
                            skipReason += ` (Tutar: ${amount} - Geçerli bir tutar gerekli)`;
                        }
                        skippedDetails.push(skipReason);
                        skipped++;
                        continue;
                    }
                    
                    if (!kategori || kategori.trim() === '') {
                        skipReason = `Satır ${i + 1}: Kategori eksik`;
                        skippedDetails.push(skipReason);
                        skipped++;
                        continue;
                    }
                    
                    if (!islem || islem.trim() === '') {
                        skipReason = `Satır ${i + 1}: Ödeme yöntemi eksik`;
                        skippedDetails.push(skipReason);
                        skipped++;
                        continue;
                    }
                    
                    // Parse date
                    const date = parseDateFromExcel(tarih);
                    if (!date || isNaN(date.getTime())) {
                        skipReason = `Satır ${i + 1}: Geçersiz tarih "${tarih}" (Beklenen format: DD.MM.YYYY veya YYYY-MM-DD)`;
                        skippedDetails.push(skipReason);
                        skipped++;
                        continue;
                    }
                    
                    // Validate time format
                    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
                    if (saat && !timePattern.test(saat)) {
                        skipReason = `Satır ${i + 1}: Geçersiz saat formatı "${saat}" (Beklenen format: HH:MM)`;
                        skippedDetails.push(skipReason);
                        skipped++;
                        continue;
                    }
                    
                    // Combine date and time
                    const [hours, minutes] = saat.split(':').map(n => parseInt(n, 10) || 0);
                    if (hours > 23 || minutes > 59) {
                        skipReason = `Satır ${i + 1}: Geçersiz saat değeri "${saat}" (Saat: 0-23, Dakika: 0-59)`;
                        skippedDetails.push(skipReason);
                        skipped++;
                        continue;
                    }
                    date.setHours(hours, minutes, 0, 0);
                    
                    // Create transaction
                    const transaction = {
                        type: type,
                        amount: amount,
                        category: kategori,
                        paymentMethod: islem,
                        description: aciklama,
                        date: date
                    };
                    
                    try {
                        await storage.addTransaction(transaction);
                        imported++;
                    } catch (error) {
                        skipReason = `Satır ${i + 1}: İşlem kaydedilemedi - ${error.message}`;
                        skippedDetails.push(skipReason);
                        skipped++;
                        console.error(`Error adding transaction from row ${i + 1}:`, error);
                    }
                }
                
                // Show detailed results
                let resultMessage = `${imported} işlem başarıyla içe aktarıldı`;
                if (skipped > 0) {
                    resultMessage += `, ${skipped} işlem atlandı`;
                    if (skippedDetails.length > 0 && skippedDetails.length <= 10) {
                        // Show first 10 skipped details
                        resultMessage += '\n\nAtlanan işlemler:\n' + skippedDetails.slice(0, 10).join('\n');
                        if (skippedDetails.length > 10) {
                            resultMessage += `\n... ve ${skippedDetails.length - 10} işlem daha`;
                        }
                    }
                }
                
                if (imported === 0 && skipped > 0) {
                    showToast(resultMessage, 'error');
                } else if (skipped > 0) {
                    // Show warning with details
                    alert(resultMessage);
                    showToast(`${imported} işlem içe aktarıldı, ${skipped} işlem atlandı`, 'success');
                } else {
                    showToast(resultMessage, 'success');
                }
                
                resolve();
            } catch (error) {
                console.error('Excel import error:', error);
                showToast('Excel yükleme hatası: ' + error.message, 'error');
                reject(error);
            }
        };
        
        reader.onerror = () => {
            const error = new Error('Dosya okuma hatası');
            showToast('Dosya okuma hatası', 'error');
            reject(error);
        };
        
        reader.readAsText(file, 'UTF-8');
    });
}

