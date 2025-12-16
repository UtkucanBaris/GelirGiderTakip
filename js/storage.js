// Database Constants - Prevents Typos
window.DB_COLLECTIONS = {
  USERS: "users",
  SETTINGS: "settings",
  TRANSACTIONS: "transactions",
};

// Firebase Firestore Storage Manager
class StorageManager {
  constructor() {
    this.db = null;
    this.userId = null;
    this.settings = null;
    this.localSettings = {
      incomeCategories: ["Maaş", "Ek İş", "Yatırım", "Diğer"],
      expenseCategories: [
        "Kira",
        "Market",
        "Yemek",
        "Ulaşım",
        "Faturalar",
        "Eğlence",
        "Sağlık",
        "Diğer",
      ],
      incomeMethods: ["Havale", "ATM Para Yatırma", "Nakit", "Diğer"],
      expenseMethods: [
        "Kredi Kartı",
        "Nakit",
        "FAST",
        "ATM Para Çekme",
        "Diğer",
      ],
      excludedFromReports: [],
      categoryBudgets: {},
      theme: "light",
    };
  }

  // Initialize database (called by auth.js)
  init() {
    if (!firebase.apps.length) {
      console.error("Firebase not initialized!");
      return Promise.reject("Firebase init failed");
    }
    this.db = firebase.firestore();
    return Promise.resolve();
  }

  setUserId(uid) {
    this.userId = uid;
  }

  checkAuth() {
    if (!this.userId) {
      throw new Error("Oturum açmanız gerekiyor");
    }
  }

  // Get settings
  async getSettings(forceRefresh = false) {
    this.checkAuth();

    // Return cached settings if available and not forced
    if (this.settings && !forceRefresh) {
      return this.settings;
    }

    // Timeout Promise (5 seconds)
    const timeout = new Promise((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              "Veritabanı zaman aşımı. İnternet bağlantınızı kontrol edin."
            )
          ),
        5000
      );
    });

    try {
      const docRef = this.db
        .collection(window.DB_COLLECTIONS.USERS)
        .doc(this.userId)
        .collection(window.DB_COLLECTIONS.SETTINGS)
        .doc("default");

      const doc = await Promise.race([docRef.get(), timeout]);

      if (doc.exists) {
        this.settings = doc.data();
        return this.settings;
      } else {
        // Initialize default settings in Firestore
        await this.initDefaultSettings();
        return this.localSettings;
      }
    } catch (error) {
      console.error("Error getting settings:", error);
      throw error;
    }
  }

  async initDefaultSettings() {
    try {
      await this.db
        .collection(window.DB_COLLECTIONS.USERS)
        .doc(this.userId)
        .collection(window.DB_COLLECTIONS.SETTINGS)
        .doc("default")
        .set(this.localSettings);
      this.settings = this.localSettings;
    } catch (error) {
      console.error("Error initializing settings:", error);
    }
  }

  // Update settings
  async updateSettings(newSettings) {
    this.checkAuth();
    try {
      await this.db
        .collection(window.DB_COLLECTIONS.USERS)
        .doc(this.userId)
        .collection(window.DB_COLLECTIONS.SETTINGS)
        .doc("default")
        .set(newSettings);
      this.settings = newSettings;
    } catch (error) {
      throw error;
    }
  }

  // Add transaction
  async addTransaction(transaction) {
    this.checkAuth();
    try {
      const transactionObj = {
        type: transaction.type,
        amount: parseFloat(transaction.amount),
        category: transaction.category,
        paymentMethod: transaction.paymentMethod,
        description: transaction.description || "",
        date:
          typeof transaction.date === "string"
            ? new Date(transaction.date)
            : transaction.date,
        createdAt: transaction.createdAt
          ? new Date(transaction.createdAt)
          : new Date(),
      };

      const docRef = await this.db
        .collection(window.DB_COLLECTIONS.USERS)
        .doc(this.userId)
        .collection(window.DB_COLLECTIONS.TRANSACTIONS)
        .add(transactionObj);
      return { id: docRef.id, ...transactionObj };
    } catch (error) {
      throw error;
    }
  }

  // Get all transactions
  async getAllTransactions() {
    this.checkAuth();
    try {
      const snapshot = await this.db
        .collection(window.DB_COLLECTIONS.USERS)
        .doc(this.userId)
        .collection(window.DB_COLLECTIONS.TRANSACTIONS)
        .get();
      const transactions = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date.toDate ? data.date.toDate() : new Date(data.date), // Handle Firestore Timestamp
          createdAt:
            data.createdAt && data.createdAt.toDate
              ? data.createdAt.toDate()
              : data.createdAt
              ? new Date(data.createdAt)
              : new Date(),
        };
      });
      return transactions;
    } catch (error) {
      console.error("Error getting transactions:", error);
      throw error;
    }
  }

  // Get transactions with filters (Client-side filtering for simplicity for now)
  async getTransactions(filters = {}) {
    // Fetch all and filter in memory to avoid complex compound indexes in Firestore initially
    let transactions = await this.getAllTransactions();

    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      transactions = transactions.filter((t) => t.date >= startDate);
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      transactions = transactions.filter((t) => t.date <= endDate);
    }

    if (filters.type && filters.type !== "all") {
      transactions = transactions.filter((t) => t.type === filters.type);
    }

    if (filters.category && filters.category !== "all") {
      transactions = transactions.filter(
        (t) => t.category === filters.category
      );
    }

    if (filters.paymentMethod && filters.paymentMethod !== "all") {
      transactions = transactions.filter(
        (t) => t.paymentMethod === filters.paymentMethod
      );
    }

    if (filters.description) {
      const searchTerm = filters.description.toLowerCase();
      transactions = transactions.filter((t) =>
        t.description.toLowerCase().includes(searchTerm)
      );
    }

    return transactions;
  }

  // Get transaction by ID
  async getTransactionById(id) {
    this.checkAuth();
    try {
      const doc = await this.db
        .collection(window.DB_COLLECTIONS.USERS)
        .doc(this.userId)
        .collection(window.DB_COLLECTIONS.TRANSACTIONS)
        .doc(id)
        .get();
      if (doc.exists) {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date.toDate ? data.date.toDate() : new Date(data.date),
          createdAt:
            data.createdAt && data.createdAt.toDate
              ? data.createdAt.toDate()
              : new Date(),
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting transaction:", error);
      return null;
    }
  }

  // Update transaction
  async updateTransaction(id, transaction) {
    this.checkAuth();
    try {
      const transactionObj = {
        type: transaction.type,
        amount: parseFloat(transaction.amount),
        category: transaction.category,
        paymentMethod: transaction.paymentMethod,
        description: transaction.description || "",
        date:
          typeof transaction.date === "string"
            ? new Date(transaction.date)
            : transaction.date,
        // Do not update createdAt
      };

      await this.db
        .collection(window.DB_COLLECTIONS.USERS)
        .doc(this.userId)
        .collection(window.DB_COLLECTIONS.TRANSACTIONS)
        .doc(id)
        .update(transactionObj);
    } catch (error) {
      throw error;
    }
  }

  // Delete transaction
  async deleteTransaction(id) {
    this.checkAuth();
    try {
      await this.db
        .collection(window.DB_COLLECTIONS.USERS)
        .doc(this.userId)
        .collection(window.DB_COLLECTIONS.TRANSACTIONS)
        .doc(id)
        .delete();
    } catch (error) {
      throw error;
    }
  }

  // Update category names in all transactions (Batch update)
  async updateCategoryInTransactions(oldName, newName, type) {
    this.checkAuth();
    try {
      const snapshot = await this.db
        .collection(window.DB_COLLECTIONS.USERS)
        .doc(this.userId)
        .collection(window.DB_COLLECTIONS.TRANSACTIONS)
        .where("type", "==", type)
        .where("category", "==", oldName)
        .get();

      const batch = this.db.batch();
      let count = 0;

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { category: newName });
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }
      return count;
    } catch (error) {
      throw error;
    }
  }

  // Update payment method names in all transactions (Batch update)
  async updatePaymentMethodInTransactions(oldName, newName, type) {
    this.checkAuth();
    try {
      const snapshot = await this.db
        .collection(window.DB_COLLECTIONS.USERS)
        .doc(this.userId)
        .collection(window.DB_COLLECTIONS.TRANSACTIONS)
        .where("type", "==", type)
        .where("paymentMethod", "==", oldName)
        .get();

      const batch = this.db.batch();
      let count = 0;

      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { paymentMethod: newName });
        count++;
      });

      if (count > 0) {
        await batch.commit();
      }
      return count;
    } catch (error) {
      throw error;
    }
  }

  // Export all data (Uses getAllTransactions which is already Firestore ready)
  async exportData() {
    const [transactions, settings] = await Promise.all([
      this.getAllTransactions(),
      this.getSettings(),
    ]);

    return {
      transactions: transactions.map((t) => ({
        ...t,
        date: t.date.toISOString(),
        createdAt: t.createdAt.toISOString(),
      })),
      settings: settings,
    };
  }

  // Import data
  // NOTE: This performs a lot of writes if importing many items.
  // Firestore has write limits (bottlenecks usually around 500 writes/sec).
  // For large imports, consider batching (max 500 ops per batch).
  async importData(data, mode = "merge") {
    this.checkAuth();

    // Simple signature generator for deduplication
    const createSignature = (t) => {
      const dateStr =
        typeof t.date === "string"
          ? t.date
          : t.date.toISOString
          ? t.date.toISOString()
          : new Date(t.date).toISOString();
      return `${dateStr}|${t.amount}|${t.category}|${t.type}|${t.description}`;
    };

    try {
      const batchLimit = 400; // Safe limit below 500
      let batches = [];
      let currentBatch = this.db.batch();
      let operationCount = 0;

      if (mode === "replace") {
        // Delete all documents first
        // Warning: Deleting collections via client is not recommended for huge collections,
        // but for personal finance app it should be fine.
        const snapshot = await this.db
          .collection(window.DB_COLLECTIONS.USERS)
          .doc(this.userId)
          .collection(window.DB_COLLECTIONS.TRANSACTIONS)
          .get();
        snapshot.docs.forEach((doc) => {
          currentBatch.delete(doc.ref);
          operationCount++;
          if (operationCount >= batchLimit) {
            batches.push(currentBatch);
            currentBatch = this.db.batch();
            operationCount = 0;
          }
        });
      }

      let existingSignatures = new Set();
      if (mode === "merge") {
        const currentTransactions = await this.getAllTransactions();
        currentTransactions.forEach((t) =>
          existingSignatures.add(createSignature(t))
        );
      }

      // Add operations for new transactions
      if (data.transactions && Array.isArray(data.transactions)) {
        for (const t of data.transactions) {
          if (mode === "merge") {
            const sig = createSignature(t);
            if (existingSignatures.has(sig)) continue;
          }

          const docRef = this.db
            .collection(window.DB_COLLECTIONS.USERS)
            .doc(this.userId)
            .collection(window.DB_COLLECTIONS.TRANSACTIONS)
            .doc(); // Auto-ID
          const transactionObj = {
            type: t.type,
            amount: parseFloat(t.amount),
            category: t.category,
            paymentMethod: t.paymentMethod,
            description: t.description || "",
            date: typeof t.date === "string" ? new Date(t.date) : t.date,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
          };

          currentBatch.set(docRef, transactionObj);
          operationCount++;

          if (operationCount >= batchLimit) {
            batches.push(currentBatch);
            currentBatch = this.db.batch();
            operationCount = 0;
          }
        }
      }

      // Import settings
      if (data.settings) {
        const settingsRef = this.db
          .collection(window.DB_COLLECTIONS.USERS)
          .doc(this.userId)
          .collection(window.DB_COLLECTIONS.SETTINGS)
          .doc("default");
        currentBatch.set(settingsRef, data.settings);
        operationCount++;
        if (operationCount >= batchLimit) {
          batches.push(currentBatch);
          currentBatch = this.db.batch();
          operationCount = 0;
        }
      }

      // Push the last batch
      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      // Commit all batches
      console.log(`Committing ${batches.length} batches...`);
      for (const batch of batches) {
        await batch.commit();
      }

      return Promise.resolve();
    } catch (error) {
      console.error("Import error:", error);
      throw error;
    }
  }
}

// Create global instance
const storage = new StorageManager();
window.storage = storage; // Explicitly make it global
console.log(
  "StorageManager: Global instance created and assigned to window.storage"
);
