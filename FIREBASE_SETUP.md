# Firebase Kurulum Rehberi

Bu proje, verileri saklamak ve kullanıcı girişi sağlamak için **Google Firebase** kullanır. Projenin çalışması için kendi Firebase projenizi oluşturup yapılandırmanız gerekir.

Bu işlem tamamen **ÜCRETSİZDİR**.

## Adım 1: Firebase Projesi Oluşturma

1.  [Firebase Console](https://console.firebase.google.com/) adresine gidin.
2.  Google hesabınızla giriş yapın.
3.  **"Proje Ekle" (Add Project)** butonuna tıklayın.
4.  Projeye bir isim verin (örn: `gelir-gider-takip`).
5.  Google Analytics adımını "Devre Dışı" bırakabilirsiniz (isteğe bağlı).
6.  Projeniz oluşturulduktan sonra **"Devam"** butonuna basın.

## Adım 2: Web Uygulaması Ekleme

1.  Proje ana sayfasında, üstte yer alan **Web** simgesine (`</>`) tıklayın.
2.  Uygulamanıza bir takma ad verin (örn: `Web App`).
3.  **"Uygulamayı kaydet"** butonuna basın.
4.  Size verilen SDK kodlarını şimdilik kopyalamanıza gerek yok, konsola devam edin.

## Adım 3: Authentication (Kimlik Doğrulama) Ayarları

1.  Sol menüden **Build** > **Authentication** seçeneğine tıklayın.
2.  **"Get Started"** butonuna basın.
3.  **Sign-in method** sekmesinde:
    - **Email/Password:** Etkinleştirin (Enable).
    - **Google:** Etkinleştirin (Opsiyonel). Google ile giriş için proje isminizi doğrulamanız gerekebilir.

## Adım 4: Firestore Database Kurulumu

1.  Sol menüden **Build** > **Firestore Database** seçeneğine tıklayın.
2.  **"Create Database"** butonuna basın.
3.  Konum olarak size yakın bir yer seçin (örn: `eur3` - Europe West).
4.  Güvenlik kuralları adımında **"Start in test mode"** seçebilirsiniz (Geliştirme aşamasında kolaylık sağlar) veya aşağıdaki güvenli kuralları uygulayın.

### Güvenlik Kuralları (Önerilen)

**Rules** sekmesine gidin ve şu kodu yapıştırıp **Publish** edin:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Her kullanıcı sadece kendi verisine erişebilir
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Adım 5: Yapılandırma Bilgilerini Koda Ekleme

1.  Sol üstteki **Ayarlar** (Dişli çark) simgesine tıklayın > **Proje Ayarları (Project Settings)**.
2.  Aşağı kaydırın, **"Your apps"** bölümünde `Config` seçeneğini işaretleyin.
3.  Oradaki `firebaseConfig` objesini kopyalayın.
4.  Proje klasörünüzde `js/auth.js` dosyasını açın.
5.  En üstteki `firebaseConfig` değişkenini kendi bilgilerinizle değiştirin:

```javascript
// js/auth.js dosyasının en üstü

const firebaseConfig = {
  apiKey: "SİZİN_API_KEY",
  authDomain: "SİZİN_PROJECT_ID.firebaseapp.com",
  projectId: "SİZİN_PROJECT_ID",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
};
```

🎉 **Tebrikler!** Artık uygulamanız kendi veritabanınıza bağlı olarak çalışmaya hazır.
