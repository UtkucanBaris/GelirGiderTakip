// Firebase Configuration and Auth Logic

// Placeholder Config - USER MUST REPLACE THIS
const firebaseConfig = {
  apiKey: "AIzaSyDO9Dy6ANZizHtA1mxxFjFdx1gUvG0xHCI",
  authDomain: "gelirgiderhesap-dc716.firebaseapp.com",
  projectId: "gelirgiderhesap-dc716",
  storageBucket: "gelirgiderhesap-dc716.firebasestorage.app",
  messagingSenderId: "1052990070198",
  appId: "1:1052990070198:web:2e4a67fa815bb30ad9f517",
  measurementId: "G-D5RBCTKDQK",
};

// Initialize Firebase
if (firebaseConfig.apiKey !== "FIREBASE_API_KEY") {
  firebase.initializeApp(firebaseConfig);
  console.log("Firebase initialized");
}

class AuthManager {
  constructor() {
    this.user = null;
    this.db = null;
    this.loginModal = document.getElementById("loginModal");
    this.loginForm = document.getElementById("loginForm");
    this.registerForm = document.getElementById("registerForm");
    this.userProfile = document.getElementById("userProfile");
    this.userEmailSpan = document.getElementById("userEmail");

    // Listeners
    this.setupListeners();

    if (firebaseConfig.apiKey !== "FIREBASE_API_KEY") {
      this.db = firebase.firestore();
      this.monitorAuthState();
    } else {
      console.warn("Firebase config missing. Using local storage only.");
      // For now, if no firebase, just hide login modal to allow local usage or show warning
      // showToast('Firebase ayarları yapılmadığı için bulut özellikleri devre dışı.', 'error');
      // this.loginModal.style.display = 'none';
    }
  }

  setupListeners() {
    // Toggle Forms
    document.getElementById("showRegister").addEventListener("click", (e) => {
      e.preventDefault();
      this.loginForm.style.display = "none";
      this.registerForm.style.display = "flex";
    });

    document.getElementById("showLogin").addEventListener("click", (e) => {
      e.preventDefault();
      this.registerForm.style.display = "none";
      this.loginForm.style.display = "flex";
    });

    // Login Submit
    this.loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      try {
        await firebase.auth().signInWithEmailAndPassword(email, password);
        showToast("Giriş başarılı", "success");
        this.loginModal.style.display = "none";
      } catch (error) {
        showToast("Giriş hatası: " + error.message, "error");
      }
    });

    // Register Submit
    this.registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("registerEmail").value;
      const password = document.getElementById("registerPassword").value;
      const confirm = document.getElementById("registerPasswordConfirm").value;

      if (password !== confirm) {
        showToast("Şifreler eşleşmiyor", "error");
        return;
      }

      try {
        await firebase.auth().createUserWithEmailAndPassword(email, password);
        showToast("Kayıt başarılı", "success");
        this.loginModal.style.display = "none";
      } catch (error) {
        showToast("Kayıt hatası: " + error.message, "error");
      }
    });

    // Google Login
    document
      .getElementById("googleLoginBtn")
      .addEventListener("click", async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
          await firebase.auth().signInWithPopup(provider);
          this.loginModal.style.display = "none";
        } catch (error) {
          showToast("Google giriş hatası: " + error.message, "error");
        }
      });

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      try {
        await firebase.auth().signOut();
        showToast("Çıkış yapıldı", "success");
        window.location.reload(); // Reload to clear data from view
      } catch (error) {
        console.error("Logout error", error);
      }
    });
  }

  monitorAuthState() {
    firebase.auth().onAuthStateChanged((user) => {
      this.user = user;
      if (user) {
        // User is signed in
        console.log("User signed in:", user.email);

        // Force hide modal using multiple properties
        this.loginModal.classList.remove("show");
        this.loginModal.style.display = "none";
        this.loginModal.style.visibility = "hidden";
        this.loginModal.style.opacity = "0";
        this.loginModal.style.zIndex = "-1";
        this.loginModal.style.pointerEvents = "none";

        // Ensure body is clickable
        document.body.style.overflow = "auto";
        document.body.style.pointerEvents = "auto";

        this.userProfile.style.display = "flex";
        this.userEmailSpan.textContent = user.email;

        // Initialize Storage with User ID
        // Initialize Storage with User ID
        if (window.storage) {
          window.storage.setUserId(user.uid);

          // Save enhanced user profile info
          const userRef = firebase
            .firestore()
            .collection(window.DB_COLLECTIONS.USERS)
            .doc(user.uid);

          userRef
            .set(
              {
                email: user.email,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                metadata: {
                  creationTime: user.metadata.creationTime,
                  lastSignInTime: user.metadata.lastSignInTime,
                },
                deviceInfo: {
                  userAgent: navigator.userAgent,
                  platform: navigator.platform,
                },
              },
              { merge: true }
            )
            .catch((err) => console.error("Profil güncellenemedi:", err));

          // Re-init app data with safety checks
          // Re-init app data with robust checking mechanism
          const waitForInitApp = (attempts = 0) => {
            if (typeof window.initApp === "function") {
              // Found it! Execute.
              window.initApp().catch((err) => {
                console.error("App init failed:", err);
                // Optional: alert("Uygulama başlatılamadı: " + err.message);
              });
            } else {
              // Not found yet. Retry up to 50 times (5 seconds)
              if (attempts < 50) {
                console.log(`Waiting for app.js... Attempt ${attempts + 1}`);
                setTimeout(() => waitForInitApp(attempts + 1), 100);
              } else {
                console.error("initApp function missing after 5 seconds!");
                alert("Uygulama yüklenemedi. Lütfen sayfayı yenileyin.");
              }
            }
          };

          waitForInitApp();
        } else {
          console.error("Critical Error - window.storage is not defined!");
          alert("Veritabanı bağlantısı kurulamadı. Sayfayı yenileyin.");
        }
      } else {
        // User is signed out
        console.log("User signed out");
        // Reset modal styles for visibility
        this.loginModal.style.display = "flex";
        this.loginModal.style.visibility = "visible";
        this.loginModal.style.opacity = "1";
        this.loginModal.style.zIndex = "2000";
        this.loginModal.style.pointerEvents = "auto";

        this.userProfile.style.display = "none";
      }
    });
  }

  setupEventListeners() {
    // Login/Register Form Imports
    const loginForm = document.getElementById("loginForm");
    const googleLoginBtn = document.getElementById("googleLoginBtn");
    const showRegisterLink = document.getElementById("showRegister");
    const showLoginLink = document.getElementById("showLogin");
    const logoutBtn = document.getElementById("logoutBtn");

    // Auth Listeners
    if (loginForm)
      loginForm.addEventListener("submit", (e) => this.handleLogin(e));
    if (googleLoginBtn)
      googleLoginBtn.addEventListener("click", () => this.handleGoogleLogin());

    if (showRegisterLink) {
      showRegisterLink.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("loginFormContainer").style.display = "none";
        document.getElementById("registerFormContainer").style.display =
          "block";
      });
    }

    if (showLoginLink) {
      showLoginLink.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("registerFormContainer").style.display = "none";
        document.getElementById("loginFormContainer").style.display = "block";
      });
    }

    if (logoutBtn) logoutBtn.addEventListener("click", () => this.logout());

    // Register Form Listener
    const registerForm = document.getElementById("registerForm");
    if (registerForm)
      registerForm.addEventListener("submit", (e) => this.handleRegister(e));

    // Change Password Logic
    const changePassBtn = document.getElementById("changePasswordBtn");
    const changePassModal = document.getElementById("changePasswordModal");
    const cancelPassBtn = document.getElementById("cancelPasswordChange");
    const changePassForm = document.getElementById("changePasswordForm");

    if (changePassBtn && changePassModal) {
      changePassBtn.addEventListener("click", () => {
        changePassModal.classList.add("show");
        changePassModal.style.display = "flex";
        const newPass = document.getElementById("newPassword");
        const confirmPass = document.getElementById("confirmNewPassword");
        if (newPass) newPass.value = "";
        if (confirmPass) confirmPass.value = "";
      });
    }

    const closePassModal = () => {
      if (changePassModal) {
        changePassModal.classList.remove("show");
        changePassModal.style.display = "none";
      }
    };

    if (cancelPassBtn) cancelPassBtn.addEventListener("click", closePassModal);

    if (changePassForm) {
      changePassForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const newPassInput = document.getElementById("newPassword");
        const confirmPassInput = document.getElementById("confirmNewPassword");

        if (!newPassInput || !confirmPassInput) return;

        const newPass = newPassInput.value;
        const confirmPass = confirmPassInput.value;
        const user = firebase.auth().currentUser;

        if (newPass !== confirmPass) {
          alert("Şifreler eşleşmiyor!");
          return;
        }

        if (newPass.length < 6) {
          alert("Şifre en az 6 karakter olmalıdır.");
          return;
        }

        if (!user) {
          alert("Oturum açık değil.");
          return;
        }

        try {
          await user.updatePassword(newPass);
          alert("Şifreniz başarıyla güncellendi!");
          closePassModal();
        } catch (error) {
          console.error("Şifre güncelleme hatası:", error);
          if (error.code === "auth/requires-recent-login") {
            alert(
              "Güvenlik nedeniyle yeniden giriş yapmanız gerekiyor. Lütfen çıkış yapıp tekrar girin."
            );
          } else {
            alert("Hata: " + error.message);
          }
        }
      });
    }

    // Close modal on outside click
    if (changePassModal) {
      changePassModal.addEventListener("click", (e) => {
        if (e.target === changePassModal) {
          closePassModal();
        }
      });
    }
  }

  getUser() {
    return this.user;
  }
}

// Create global instance
const authManager = new AuthManager();
