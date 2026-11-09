# Habel Kidz

Media pembelajaran interaktif web untuk SD dan SMP.

**Tahap A:** scaffold proyek Vite, koneksi Supabase, login khusus guru, daftar kelas publik, ringkasan dashboard, database schema, RLS, Storage, dan RPC penilaian kuis yang berjalan di sisi database.

## Quick start

```bash
npm install
cp .env.example .env.local
# isi VITE_SUPABASE_URL dan VITE_SUPABASE_PUBLISHABLE_KEY
npm run dev
```

Lihat [docs/SETUP.md](docs/SETUP.md) untuk setup Supabase, pembuatan akun admin, dan deployment GitHub + Netlify.

## Struktur

- `src/` — frontend Vite dan koneksi Supabase
- `supabase/migrations/` — schema, RLS, storage policies, RPC submit_quiz
- `supabase/seed.sql` — data kelas SD/SMP
- `reference/habel-kidz-original.html` — base code asli, disimpan sebagai referensi

## Keamanan

Frontend hanya boleh menggunakan Supabase Publishable key. Secret/service role key tidak boleh dimasukkan ke browser, `.env` yang dikomit, atau repository. Keamanan data menggunakan PostgreSQL RLS. Kunci jawaban dipisahkan ke `question_keys` dan tidak dapat dibaca role `anon`.
