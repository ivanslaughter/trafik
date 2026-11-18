# Panduan Deployment ke Hostinger (Subdomain: https://trafik.velocity.web.id)

Aplikasi **Trafik** sudah selesai di-build dan siap diunggah ke subdomain **`https://trafik.velocity.web.id`** di akun Hostinger Anda!

---

## 🚀 Langkah Deploy Cepat ke `trafik.velocity.web.id`

### 1. Buka File Manager di Hostinger hPanel
1. Login ke **Hostinger hPanel** (`hpanel.hostinger.com`).
2. Masuk ke **Websites** -> pilih `velocity.web.id` -> klik **Dashboard**.
3. Di panel sebelah kiri, pilih **Files** -> **File Manager** (atau klik tombol *File Manager*).

### 2. Temukan Folder Dokumen Root Subdomain
Saat Anda membuat subdomain `trafik`, Hostinger membuat foldernya secara otomatis. Biasanya terletak di:
* `public_html/trafik/` 
  *(atau jika Anda memilih nama custom: `public_html/trafik.velocity.web.id/`)*.
* Buka folder tersebut di File Manager. Pastikan Anda berada di dalam folder tersebut.

### 3. Unggah File dari Folder `/dist`
Unggah seluruh isi folder `/dist`:
- **`index.html`** (file HTML utama)
- **`custom.css`** (file CSS kustom untuk edit tampilan langsung tanpa compile ulang)
- **`.htaccess`** *(Penting: pastikan file ini terunggah. Jika tidak terlihat, aktifkan "Show Hidden Files" di File Manager Hostinger. File ini mencegah error 404 saat pengguna me-refresh halaman)*
- **Folder `assets/`** (berisi file JavaScript dan CSS yang sudah dioptimasi)

> **Catatan:** Pastikan file `index.html` berada tepat di dalam folder root subdomain (misal: `public_html/trafik/index.html`), bukan berada di dalam subfolder `dist/`.

### 4. Pastikan SSL (HTTPS) Aktif
1. Di hPanel Hostinger, buka menu **Security** -> **SSL**.
2. Pastikan SSL aktif (*Active*) untuk `trafik.velocity.web.id`. Jika belum, klik **Install SSL** (gratis selamanya dari Hostinger/Let's Encrypt).

### 5. Selesai! Uji Coba di Browser
Buka browser dan akses:
👉 **`https://trafik.velocity.web.id`**

---

## ⚙️ Integrasi dengan WordPress velocity.web.id
Aplikasi **Trafik** di `https://trafik.velocity.web.id` dapat langsung berkomunikasi dengan instalasi WordPress utama Anda di `https://velocity.web.id`:
1. Buka aplikasi di `https://trafik.velocity.web.id`.
2. Klik tombol profil di pojok kanan atas -> pilih **"Login / Integrasi Akun WordPress"** (atau buka tab **User**).
3. Anda dapat:
   - Menguji koneksi REST API WordPress: `https://velocity.web.id/wp-json/`.
   - Mengaktifkan login langsung member/admin menggunakan akun WordPress Anda (`wp_users`).
   - Menyimpan poin trafik langsung ke database MySQL WordPress (`wp_usermeta` key: `tn_traffic_points`).

### Langkah-langkah:
1. **Buat Folder di File Manager**:
   - Masuk ke **File Manager** Hostinger.
   - Buka folder `public_html/` (tempat file WordPress Anda berada).
   - Buat folder baru dengan nama `trafik` (sehingga path-nya menjadi `public_html/trafik/`).

2. **Upload Hasil Build**:
   - Upload seluruh isi folder `/dist` (`index.html`, folder `assets/`, dan file `.htaccess`) ke dalam `public_html/trafik/`.
   - Konfigurasi `base: './'` yang sudah diterapkan di `vite.config.ts` memastikan seluruh aset CSS dan JavaScript otomatis terpanggil dengan benar.

3. **Cek Aturan Rewrite WordPress**:
   - File default `.htaccess` milik WordPress sudah memiliki aturan `RewriteCond %{REQUEST_FILENAME} !-d` dan `!-f`. Artinya, karena folder `trafik/` ada secara fisik di server, Apache/LiteSpeed akan otomatis membuka aplikasi Anda dan tidak akan memicu halaman 404 WordPress.
   - Kunjungi `https://velocity.web.id/trafik/` di browser.

---

## Opsi 3: Embed di Halaman WordPress (Page Template / Elementor)
Jika Anda ingin mempertahankan header dan footer tema WordPress `velocity.web.id`:
1. Buat halaman baru di WordPress: **Pages** -> **Add New** (misal judul: "Tukar Trafik").
2. Deploy aplikasi di subdomain (Opsi 1) terlebih dahulu.
3. Tambahkan blok **Custom HTML** di WordPress dengan iframe responsif:
   ```html
   <iframe 
     src="https://trafik.velocity.web.id" 
     style="width:100%; height:900px; border:none; border-radius:12px;" 
     allow="clipboard-write"
   ></iframe>
   ```

---

## Fitur Manajemen Pengguna (User Management)
Aplikasi ini sudah dilengkapi dengan sistem **Manajemen Pengguna Lengkap (Admin Console & RBAC)**:
- **Hak Akses Berjenjang (Roles)**:
  - `Member / Peselancar Biasa`: Menambah website, berselancar mengumpulkan poin, membeli paket.
  - `Administrator`: Mengakses tab **Manajemen User**, menambah pengguna baru, mengubah saldo poin, menaikkan paket ke Pro VIP, serta **membekukan akun (Anti-Cheat Ban)** yang terindikasi bot.
- **Akun Bawaan (Default Demo Accounts)**:
  - `admin@velocity.web.id` (Administrator Sistem)
  - `budi.santoso@digitalnusantara.id` (Member Gratis)
  - `siti.rahma@bandungdigital.id` (Member Pro VIP)
  - `botfarmer99@tempmail.org` (Akun Ditangguhkan / Terkena Sanksi Anti-Cheat)
- **Account Switcher**: Anda dapat beralih peran antar pengguna kapan saja dengan mengklik avatar pengguna di pojok kanan atas.

---

## Integrasi Database & Autentikasi Pengguna WordPress (velocity.web.id)

### 1. Database yang Digunakan
- **Tahap Frontend / Client**: Menggunakan penyimpanan reaktif dan `localStorage` browser yang aman dengan isolasi multi-tab.
- **Tahap Produksi dengan WordPress di Hostinger**:
  Karena website WordPress Anda di `velocity.web.id` sudah memiliki database **MySQL / MariaDB** bawaan di Hostinger, Anda **TIDAK PERLU** menyewa database cloud terpisah yang berbayar.
  - **Tabel `wp_users`**: Menyimpan username, email, password terenkripsi, status aktif, dan hak akses.
  - **Tabel `wp_usermeta`**: Menyimpan poin trafik pengguna (`meta_key: tn_traffic_points`), slot website, dan status VIP.
  - **Tabel Kustom (Opsional)**: Anda dapat membuat tabel `wp_traffic_campaigns` untuk menyimpan URL dan riwayat audit.

### 2. Cara Kerja Autentikasi Pengguna Menggunakan WordPress
Sistem TrafikNusantara mendukung autentikasi langsung ke WordPress `https://velocity.web.id` melalui 2 metode:

#### Metode A: REST API + JWT Token (Paling Populer & Aman)
1. Di WordPress Admin (`velocity.web.id/wp-admin`), pasang plugin gratis: **"JWT Authentication for WP REST API"**.
2. Tambahkan baris ini di file `wp-config.php` WordPress Anda:
   ```php
   define('JWT_AUTH_SECRET_KEY', 'buat-kunci-rahasia-acak-disini-123456');
   define('JWT_AUTH_CORS_ENABLE', true);
   ```
3. Pengguna login di TrafikNusantara menggunakan email dan password WordPress mereka. Server WordPress merespons dengan token JWT yang memverifikasi peran pengguna (`administrator` atau `subscriber`).

#### Metode B: WordPress Application Passwords (Bawaan WordPress 5.6+)
- WordPress memiliki fitur *Application Passwords* bawaan di menu **Users -> Profile -> Application Passwords** tanpa perlu instal plugin tambahan.

#### Kode Tambahan di `functions.php` Tema WordPress (Opsional untuk CORS & Sync Poin):
Tambahkan skrip singkat berikut di file `functions.php` tema aktif Anda jika ingin membuka akses CORS ke subdomain/subfolder:
```php
add_action('init', function() {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE");
    header("Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce");
});
```


