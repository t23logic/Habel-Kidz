# Status pengerjaan Tahap A

## Sudah disiapkan dalam starter project

- Struktur aplikasi Vite.
- Tampilan awal Habel Kidz dengan palet dan nuansa visual dari base code.
- Mode siswa dan login khusus guru.
- Validasi role melalui `teacher_profiles` setelah autentikasi Supabase.
- Daftar kelas SD 1–6 dan SMP 7–9 dibaca dari database.
- Dashboard guru membaca ringkasan jumlah kelas, materi, soal, dan percobaan kuis.
- Database schema relasional untuk profil guru, kelas, mata pelajaran, materi, soal, opsi, kunci, percobaan, dan jawaban.
- RLS untuk konten publik yang sudah dipublikasikan dan operasi guru.
- Kunci jawaban dipisahkan dari pertanyaan/opsi dan tidak diberikan ke pengunjung anonim.
- Bucket Storage untuk gambar dengan pembatasan upload kepada akun guru.
- RPC `submit_quiz` untuk menghitung nilai di database.
- Seed data demo 9 kelas dan materi/soal contoh yang mengikuti pola base code awal.
- Konfigurasi build Netlify dan instruksi GitHub.
- Base code asli disimpan utuh di `reference/`.

## Belum dilakukan

- Schema belum dijalankan ke project Supabase nyata karena akses project belum tersambung.
- Belum ada akun admin nyata yang dibuat.
- Belum ada repository GitHub yang dibuat atau di-push.
- Belum ada site Netlify yang dideploy.
- Form CRUD materi/soal dan UI kuis dari base code belum dipindahkan ke backend baru. Itu bagian Tahap B/C.

## Validasi teknis yang tersedia

- Pemeriksaan sintaks JavaScript dengan `node --check`: lulus.
- `npm install` tidak berhasil diselesaikan pada lingkungan kerja ini (timeout jaringan), sehingga `vite build` belum dapat dijalankan di sini.
- SQL migration perlu dieksekusi pada project Supabase milikmu untuk validasi akhir terhadap versi PostgreSQL dan konfigurasi Data API project tersebut.
