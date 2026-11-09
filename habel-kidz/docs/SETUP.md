# Habel Kidz — Setup Tahap A

Starter project ini menyiapkan fondasi Vite + Supabase + Netlify untuk mengembangkan base code Habel Kidz.

## 1. Kebutuhan

- Node.js 20.19+ atau 22.12+
- Akun Supabase
- Akun GitHub
- Akun Netlify

## 2. Jalankan proyek lokal

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka URL yang dicetak Vite (biasanya `http://localhost:5173`). Tanpa konfigurasi Supabase, aplikasi menampilkan notifikasi bahwa backend belum terhubung.

## 3. Buat proyek Supabase

1. Buat project baru di Supabase.
2. Buka **SQL Editor**.
3. Jalankan seluruh isi `supabase/migrations/0001_initial_schema.sql`.
4. Jalankan seluruh isi `supabase/seed.sql`.
5. Buka **Project Settings → API** atau **Connect**.
6. Salin Project URL dan **Publishable key** ke `.env.local`.

Contoh `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://PROJECT-REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Jangan gunakan `sb_secret_...`, `service_role`, password database, atau token rahasia pada frontend. File `.env.local` sudah dikecualikan oleh `.gitignore`.

## 4. Buat akun admin pertama

1. Buka **Authentication → Users** pada Supabase.
2. Buat user dengan email dan password admin. Jangan mengaktifkan pendaftaran publik untuk aplikasi ini.
3. Salin UUID user yang baru dibuat.
4. Buka **SQL Editor** lalu jalankan query ini dengan UUID dan nama admin sebenarnya:

```sql
insert into public.teacher_profiles (user_id, display_name, role)
values ('GANTI-DENGAN-UUID-AUTH-USER', 'Administrator Habel Kidz', 'admin');
```

5. Refresh aplikasi dan login melalui tombol **Mode Guru**.

User yang berhasil login tetapi tidak mempunyai baris `teacher_profiles` dengan role `admin` atau `teacher` akan ditolak dari dashboard.

## 5. Deploy ke GitHub dan Netlify

1. Buat repository GitHub baru (misalnya `habel-kidz`).
2. Dari folder proyek jalankan:

```bash
git init
git add .
git commit -m "Initial Habel Kidz scaffold"
git branch -M main
git remote add origin https://github.com/USERNAME/habel-kidz.git
git push -u origin main
```

3. Di Netlify pilih **Add new project → Import an existing project** dan pilih repository tersebut.
4. Build command: `npm run build`.
5. Publish directory: `dist`.
6. Tambahkan environment variables di pengaturan Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
7. Deploy. `netlify.toml` di repository sudah berisi build/publish settings dan fallback untuk SPA.

Setiap push ke branch yang dihubungkan akan memicu deployment baru.

## 6. Pemeriksaan awal

- [ ] Kelas SD 1–6 dan SMP 7–9 muncul dari database.
- [ ] Pengunjung tanpa login dapat melihat hanya materi yang dipublikasikan.
- [ ] Pengunjung tidak dapat melihat `question_keys`.
- [ ] Akun biasa tanpa profil guru tidak bisa masuk dashboard guru.
- [ ] Akun guru dapat membaca ringkasan dashboard.
- [ ] Hanya guru/admin dapat upload, update, dan delete file pada bucket.
- [ ] RPC `submit_quiz` menilai jawaban di database, bukan mempercayai skor dari browser.
- [ ] Respons RPC hanya mengembalikan nilai dan status benar/salah, bukan kunci jawaban.

## Catatan Tahap A

Dashboard guru pada scaffold ini membuktikan alur login, verifikasi profil, dan koneksi baca data. Form CRUD materi/soal dan UI pengerjaan kuis belum dipindahkan dari base code. Itu dikerjakan pada Tahap B/C setelah schema serta auth diuji pada project Supabase milikmu. Karena siswa belum memakai akun, nama siswa pada percobaan kuis bersifat input mandiri dan bukan identitas terverifikasi. RPC menyimpan nilai di database, tetapi tidak mengembalikan kunci jawaban kepada browser.
