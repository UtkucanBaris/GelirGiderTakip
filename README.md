# 💰 Kişisel Finans Yöneticisi (Personal Finance Manager)

Modern, kullanıcı dostu ve bulut tabanlı bir gelir-gider takip uygulaması. Harcamalarınızı takip edin, detaylı raporlar alın ve bütçenizi yönetin.

![Proje Önizlemesi](https://via.placeholder.com/800x400?text=Gelir+Gider+Takip+Uygulamasi)
_(Buraya daha sonra uygulamanın ekran görüntüsünü ekleyebilirsiniz)_

## ✨ Özellikler

- **☁️ Bulut Tabanlı Kayıt:** Firebase entegrasyonu sayesinde verileriniz bulutta saklanır, kaybolmaz.
- **🔐 Güvenli Giriş:** E-posta/Şifre veya Google ile giriş yapma imkanı.
- **📊 Detaylı Raporlar:**
  - Aylık Gelir/Gider Karşılaştırması
  - Kategori Bazlı Harcama Analizi
  - Zaman İçindeki Trendler
- **🌙 Karanlık/Aydınlık Mod:** Göz yormayan tema seçenekleri (Tercihlerinizi hatırlar).
- **📁 İçe/Dışa Aktarma:** Verilerinizi JSON veya Excel olarak yedekleyin, başka cihazdan yükleyin.
- **📱 Mobil Uyumlu:** Telefon, tablet ve bilgisayarda sorunsuz çalışır.
- **🔍 Gelişmiş Filtreleme:** Tarih, kategori, ödeme yöntemi ve açıklamaya göre işlemlerinizi süzün.

## 🛠️ Teknolojiler

Bu proje, karmaşık framework'ler kullanılmadan, saf ve performanslı teknolojilerle geliştirilmiştir:

- **Frontend:** HTML5, CSS3 (Modern Flexbox/Grid), Vanilla JavaScript (ES6+)
- **Backend / Database:** Google Firebase (Authentication & Firestore)
- **Grafikler:** Chart.js
- **İkonlar:** FontAwesome 6

## 🚀 Kurulum

Bu projeyi kendi bilgisayarınızda çalıştırmak için:

1.  **Repoyu Klonlayın:**

    ```bash
    git clone https://github.com/KULLANICI_ADINIZ/gelir-gider-takip.git
    cd gelir-gider-takip
    ```

2.  **Firebase Ayarlarını Yapın:**
    Bu proje çalışmak için kendi Firebase projenize ihtiyaç duyar. Detaylı kurulum için [FIREBASE_SETUP.md](FIREBASE_SETUP.md) dosyasını okuyun.

3.  **Çalıştırın:**
    Herhangi bir kuruluma (npm install vb.) gerek yoktur. `index.html` dosyasını tarayıcınızda açmanız yeterlidir.
    - _Not: En iyi deneyim için VS Code "Live Server" eklentisini kullanmanız önerilir._

## 📂 Proje Yapısı

```
📂 gelir-gider-takip
├── 📂 css
│   ├── styles.css      # Ana stil dosyası
│   └── login.css       # Giriş ekranı stilleri
├── 📂 js
│   ├── app.js          # Ana uygulama mantığı
│   ├── auth.js         # Kimlik doğrulama işlemleri
│   ├── storage.js      # Veritabanı ve veri işlemleri
│   ├── reports.js      # Grafik ve raporlama mantığı
│   └── utils.js        # Yardımcı fonksiyonlar (Tarih, format vb.)
├── index.html          # Ana sayfa
├── FIREBASE_SETUP.md   # Veritabanı kurulum rehberi
└── README.md           # Proje dokümantasyonu
```

## 🤝 Katkıda Bulunma

1.  Bu repoyu Forklayın.
2.  Yeni bir özellik dalı (branch) oluşturun (`git checkout -b ozellik/YeniOzellik`).
3.  Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik eklendi'`).
4.  Dalınızı Pushlayın (`git push origin ozellik/YeniOzellik`).
5.  Bir Pull Request oluşturun.

## 📄 Lisans

Bu proje MIT Lisansı ile lisanslanmıştır. Detaylar için `LICENSE` dosyasına bakın.
