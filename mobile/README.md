# NEXA15 Mobile Scanner (Aplikasi Khusus Pemindai Gerbang)

Aplikasi seluler Android native berbasis **Flutter & Google ML Kit** yang dirancang khusus untuk memindai kartu pelajar siswa (QR Code & RFID) di gerbang sekolah SMA Negeri 15 Ambon.

---

### 🚀 Mengapa Menggunakan Aplikasi Ini? (Solusi Masalah ANR / Lag)
Sebelumnya, APK dibuat dengan membungkus seluruh aplikasi web admin (React, Recharts, jsPDF, XLSX) ke dalam WebView Android. Hal tersebut menyebabkan:
1. **CPU Throttling**: Library Javascript `html5-qrcode` memproses video di thread utama CPU, membuat HP cepat panas.
2. **ANR (Application Not Responding)**: Memori HP membengkak karena memuat seluruh grafik dashboard dan data ribuan siswa.

**Aplikasi Flutter ini menyelesaikan seluruh masalah tersebut:**
- **Google ML Kit Hardware Acceleration**: Menggunakan pipeline native Android CameraX (60 FPS, decoding sub-10 milidetik, 0% beban CPU JS).
- **Arsitektur Pemisahan Peran**: Aplikasi seluler HANYA berfungsi sebagai scanner gerbang & menu Lupa Kartu.
- **REST Endpoint Terpusat (`/api/scan`)**: Data kartu hanya dikirim berupa string kecil ke server backend NEXA15, server mencocokkan ke Neon DB dan mengembalikan hasil presensi dalam 1 roundtrip.

---

### 📱 Fitur Utama
1. **High-Speed Camera Scanner**:
   - Pemindai QR & Barcode berkecepatan tinggi dengan auto-focus dan visual targeting box neon.
   - Tombol lampu senter (torch) untuk pemindaian saat kondisi gelap/pagi hari.
   - Tombol putar kamera (depan/belakang).
2. **Audio & Haptic Feedback**:
   - Respon bunyi klik/chime instan dan getaran saat kartu terbaca.
3. **Hasil Presensi Real-Time**:
   - **Hijau**: Masuk Tepat Waktu (Nama, NISN, Kelas, Waktu).
   - **Kuning**: Masuk Terlambat (beserta durasi menit keterlambatan).
   - **Biru**: Pulang Tepat Waktu.
   - **Orange/Merah**: Duplikasi (sudah absen hari ini) atau kartu tidak dikenal.
4. **Fitur "Lupa Kartu"**:
   - Pencarian instan siswa berdasarkan Nama atau NISN.
   - Absensi darurat langsung dari layar HP tanpa membawa kartu fisik.
5. **Konfigurasi Alamat Server**:
   - Atur alamat IP / Domain backend (misal: `http://192.168.1.100:3000` atau URL publik).
   - Tombol "Uji Koneksi Server" untuk memverifikasi kesiapan backend & Neon DB.

---

### 🛠️ Cara Menjalankan & Build APK

#### Opsi 1: Otomatis via GitHub Actions (Rekomendasi - Tanpa Install Apapun di PC)
1. Push proyek ini ke repository GitHub Anda (`git push origin main`).
2. Masuk ke tab **Actions** di GitHub, pilih workflow **"Build NEXA15 Mobile Scanner APK"**.
3. Klik **Run workflow**.
4. Dalam 2-3 menit, unduh file `app-release.apk` dari Artifacts dan langsung instal di HP Android!

#### Opsi 2: Menggunakan Flutter CLI Lokal di PC
Jika di komputer Anda sudah terpasang Flutter SDK:
```bash
cd mobile

# Unduh dependensi
flutter pub get

# Jalankan langsung di HP yang tersambung kabel USB
flutter run

# Build APK Release siap instal
flutter build apk --release
```
File APK akan berada di: `mobile/build/app/outputs/flutter-apk/app-release.apk`.

#### Opsi 3: Buka Menggunakan Android Studio
1. Buka Android Studio.
2. Pilih **Open**, arahkan ke folder `mobile`.
3. Hubungkan HP Android atau emulator, lalu klik tombol **Run** (Play hijau).
