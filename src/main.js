
import './style.css';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import {
  getPublicGrades,
  getPublishedSubjects,
  getPublishedMaterials,
  getTeacherProfile,
  getTeacherSummary
} from './lib/data.js';

const root = document.querySelector('#app');

const state = {
  mode: 'student',
  user: null,
  teacher: null,
  grade: null,
  busy: false,
  teacherPage: 'dashboard'
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

function toast(message, kind = 'info') {
  const node = document.querySelector('#toast');
  if (!node) return;

  node.textContent = message;
  node.dataset.kind = kind;
  node.classList.add('show');

  window.clearTimeout(toast.timer);

  toast.timer = window.setTimeout(() => {
    node.classList.remove('show');
  }, 3600);
}

function appShell(content) {
  root.innerHTML = `
    <div class="cloud cloud-one">
      <i class="fa-solid fa-cloud"></i>
    </div>

    <div class="cloud cloud-two">
      <i class="fa-solid fa-cloud"></i>
    </div>

    <header class="topbar">
      <button class="brand" data-action="home" aria-label="Beranda">
        <span class="brand-mark">
          <i class="fa-solid fa-star"></i>
        </span>
        <span>
          <strong>Habel Kidz</strong>
          <small>Belajar Seru SD & SMP</small>
        </span>
      </button>

      <nav class="nav-actions">
        ${
          state.user && state.teacher
            ? `
              <span class="signed-in">
                <i class="fa-solid fa-circle-user"></i>
                ${escapeHtml(state.teacher.display_name || state.user.email)}
              </span>
              <button class="btn btn-light" data-action="logout">
                Keluar
              </button>
            `
            : ''
        }

        <button
          class="btn ${state.mode === 'teacher' ? 'btn-amber' : 'btn-light'}"
          data-action="toggle-mode"
        >
          <i class="fa-solid ${
            state.mode === 'teacher'
              ? 'fa-chalkboard-user'
              : 'fa-graduation-cap'
          }"></i>

          ${state.mode === 'teacher' ? 'Mode Guru' : 'Mode Siswa'}
        </button>
      </nav>
    </header>

    <main class="main-content">
      ${content}
    </main>

    <footer>
      🎈 Habel Kidz © 2026 · Belajar Ceria, Kreatif, dan Penuh Warna 🌈
    </footer>

    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  `;

  bindShellActions();
}

function bindShellActions() {
  root.querySelector('[data-action="home"]')
    ?.addEventListener('click', () => {
      state.mode = 'student';
      state.grade = null;
      render();
    });

  root.querySelector('[data-action="toggle-mode"]')
    ?.addEventListener('click', async () => {
      if (state.mode === 'teacher') {
        state.mode = 'student';
        state.grade = null;
        await render();
        return;
      }

      state.mode = 'teacher';
      state.teacherPage = 'dashboard';
      await render();
    });

  root.querySelector('[data-action="logout"]')
    ?.addEventListener('click', logout);
}

function configNotice() {
  return `
    <div class="notice notice-warn">
      <i class="fa-solid fa-plug-circle-exclamation"></i>

      <div>
        <strong>Supabase belum dihubungkan</strong>

        <p>
          Salin <code>.env.example</code> menjadi
          <code>.env.local</code>, lalu isi Project URL dan
          Publishable Key dari dashboard Supabase.
          Jangan gunakan Secret Key di browser.
        </p>
      </div>
    </div>
  `;
}

async function render() {
  if (state.mode === 'teacher') {
    return renderTeacher();
  }

  return renderStudent();
}

// ========================================
// STUDENT AREA
// ========================================

async function renderStudent() {
  appShell(`
    <section class="hero">
      <span class="eyebrow">
        <i class="fa-solid fa-face-smile"></i>
        Selamat datang, teman-teman!
      </span>

      <h1>
        Belajar jadi lebih <span>seru!</span> 🎈
      </h1>

      <p>
        Jelajahi materi dan tantang dirimu lewat kuis interaktif
        untuk SD dan SMP.
      </p>
    </section>

    ${
      !isSupabaseConfigured
        ? configNotice()
        : `
          <div class="loading-card">
            <i class="fa-solid fa-spinner fa-spin"></i>
            Memuat kelas...
          </div>
        `
    }

    <section id="grade-area" class="grade-area"></section>
  `);

  if (!isSupabaseConfigured) return;

  try {
    const grades = await getPublicGrades();

    const area = root.querySelector('#grade-area');

    const sd = grades.filter((g) => g.level === 'SD');
    const smp = grades.filter((g) => g.level === 'SMP');

    area.innerHTML = `
      ${gradeGroup('Sekolah Dasar', 'SD Kelas 1–6', sd)}
      ${gradeGroup('Sekolah Menengah Pertama', 'SMP Kelas 7–9', smp)}
    `;

    area.querySelectorAll('[data-grade]').forEach((button) => {
      button.addEventListener('click', () => {
        openGrade(button.dataset.grade, button.dataset.name);
      });
    });

  } catch (error) {
    root.querySelector('#grade-area').innerHTML = `
      <div class="notice notice-error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <strong>Gagal memuat kelas</strong>
          <p>${escapeHtml(error.message)}</p>
        </div>
      </div>
    `;
  }
}

function gradeGroup(title, subtitle, grades) {
  return `
    <section class="grade-group">
      <div class="group-heading">
        <div>
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>

        <span class="group-count">
          ${grades.length} kelas
        </span>
      </div>

      <div class="grade-grid">
        ${
          grades.map((grade) => `
            <button
              class="grade-card"
              data-grade="${escapeHtml(grade.id)}"
              data-name="${escapeHtml(grade.name)}"
            >
              <span class="grade-number">
                ${escapeHtml(grade.grade_number)}
              </span>

              <strong>${escapeHtml(grade.name)}</strong>

              <small>
                Lihat materi
                <i class="fa-solid fa-arrow-right"></i>
              </small>
            </button>
          `).join('')
          || '<p class="empty-state">Belum ada kelas aktif.</p>'
        }
      </div>
    </section>
  `;
}

// ========================================
// STUDENT: SUBJECT SELECTION
// ========================================

async function openGrade(gradeId, gradeName) {
  state.grade = {
    id: gradeId,
    name: gradeName
  };

  appShell(`
    <section class="page-heading">
      <button class="btn btn-light" id="back-grades">
        <i class="fa-solid fa-arrow-left"></i>
        Semua kelas
      </button>

      <span class="eyebrow">
        ${escapeHtml(gradeName)}
      </span>

      <h1>Pilih Mata Pelajaran 📚</h1>

      <p>
        Yuk, pilih pelajaran yang ingin kamu pelajari!
      </p>
    </section>

    <div id="subjects" class="grade-grid">
      <div class="loading-card">
        <i class="fa-solid fa-spinner fa-spin"></i>
        Memuat mata pelajaran...
      </div>
    </div>
  `);

  root.querySelector('#back-grades')
    .addEventListener('click', () => {
      state.grade = null;
      renderStudent();
    });

  try {
    const subjects = await getPublishedSubjects(gradeId);

    const list = root.querySelector('#subjects');

    list.innerHTML = `
      ${
        subjects.map((subject) => `
          <button
            class="grade-card subject-card"
            data-subject="${escapeHtml(subject.id)}"
            data-name="${escapeHtml(subject.name)}"
          >
            <span class="grade-number">
              <i class="fa-solid fa-book-open"></i>
            </span>

            <strong>${escapeHtml(subject.name)}</strong>

            <small>
              ${escapeHtml(subject.description || 'Ayo mulai belajar!')}
              <i class="fa-solid fa-arrow-right"></i>
            </small>
          </button>
        `).join('')
        || `
          <div class="empty-state">
            Belum ada mata pelajaran yang dipublikasikan untuk kelas ini.
          </div>
        `
      }
    `;

    list.querySelectorAll('[data-subject]').forEach((button) => {
      button.addEventListener('click', () => {
        openSubject(
          button.dataset.subject,
          button.dataset.name
        );
      });
    });

  } catch (error) {
    root.querySelector('#subjects').innerHTML = `
      <div class="notice notice-error">
        ${escapeHtml(error.message)}
      </div>
    `;
  }
}

// ========================================
// STUDENT: MATERIAL SELECTION
// ========================================

async function openSubject(subjectId, subjectName) {
  const gradeId = state.grade.id;
  const gradeName = state.grade.name;

  appShell(`
    <section class="page-heading">
      <button class="btn btn-light" id="back-subjects">
        <i class="fa-solid fa-arrow-left"></i>
        Mata Pelajaran
      </button>

      <span class="eyebrow">
        ${escapeHtml(gradeName)} · ${escapeHtml(subjectName)}
      </span>

      <h1>Materi Pembelajaran ✨</h1>

      <p>
        Pilih materi yang ingin kamu pelajari.
      </p>
    </section>

    <div id="materials" class="materials-grid">
      <div class="loading-card">
        <i class="fa-solid fa-spinner fa-spin"></i>
        Memuat materi...
      </div>
    </div>
  `);

  root.querySelector('#back-subjects')
    .addEventListener('click', () => {
      openGrade(gradeId, gradeName);
    });

  try {
    const materials = await getPublishedMaterials(gradeId);

    const subjectMaterials = materials.filter(
      (item) => item.subject_id === subjectId
    );

    const list = root.querySelector('#materials');

    list.innerHTML = `
      ${
        subjectMaterials.map((item) => `
          <article class="material-card">
            <div class="material-icon">
              <i class="fa-solid fa-book-open-reader"></i>
            </div>

            <h3>${escapeHtml(item.title)}</h3>

            <p>
              ${escapeHtml(
                (item.content || '').slice(0, 160)
                || 'Belum ada ringkasan materi.'
              )}
            </p>
          </article>
        `).join('')
        || `
          <div class="empty-state">
            Belum ada materi untuk mata pelajaran ini.
          </div>
        `
      }
    `;

  } catch (error) {
    root.querySelector('#materials').innerHTML = `
      <div class="notice notice-error">
        ${escapeHtml(error.message)}
      </div>
    `;
  }
}

// ========================================
// TEACHER AREA
// ========================================

function getTeacherMenus() {
  return [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'fa-house'
    },
    {
      id: 'subjects',
      label: 'Mata Pelajaran',
      icon: 'fa-book-open'
    },
    {
      id: 'materials',
      label: 'Materi',
      icon: 'fa-book'
    },
    {
      id: 'questions',
      label: 'Bank Soal',
      icon: 'fa-clipboard-list'
    },
    {
      id: 'results',
      label: 'Hasil Siswa',
      icon: 'fa-chart-column'
    }
  ];
}

function renderTeacherLogin() {
  appShell(`
    <section class="auth-wrap">
      <form id="login-form" class="auth-card">
        <div class="auth-icon">
          <i class="fa-solid fa-chalkboard-user"></i>
        </div>

        <span class="eyebrow">
          Akses khusus pengajar
        </span>

        <h1>Login Guru</h1>

        <p>
          Masuk menggunakan akun guru yang dibuat oleh administrator.
        </p>

        <label>
          Email
          <input
            name="email"
            type="email"
            autocomplete="username"
            required
            placeholder="nama@sekolah.sch.id"
          >
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            autocomplete="current-password"
            required
            placeholder="Masukkan password"
          >
        </label>

        <button class="btn btn-primary btn-block" type="submit">
          <i class="fa-solid fa-right-to-bracket"></i>
          Masuk ke Dashboard
        </button>

        <button
          class="btn btn-light btn-block"
          type="button"
          data-action="toggle-mode"
        >
          Kembali ke Mode Siswa
        </button>

        <p class="form-help">
          Pendaftaran publik dinonaktifkan. Akun guru harus dibuat
          melalui Supabase Auth oleh pemilik proyek.
        </p>
      </form>
    </section>
  `);

  root.querySelector('#login-form')
    .addEventListener('submit', login);
}

function renderTeacherDashboard() {
  return `
    <section class="teacher-heading">
      <span class="eyebrow">
        Panel pengajar
      </span>

      <h1>Dashboard Guru 👩‍🏫</h1>

      <p>
        Halo, ${escapeHtml(
          state.teacher.display_name || state.user.email
        )}.
        Selamat datang di ruang pengelolaan Habel-Kidz.
      </p>
    </section>

    <div class="stats-grid" id="teacher-stats">
      <div class="loading-card">
        <i class="fa-solid fa-spinner fa-spin"></i>
        Memuat ringkasan...
      </div>
    </div>

    <section class="teacher-section">
      <h2>Selamat bekerja!</h2>

      <p style="color:#64748b;font-size:13px;line-height:1.7">
        Kelola mata pelajaran, materi pembelajaran, bank soal,
        dan pantau aktivitas belajar siswa melalui menu di sebelah kiri.
      </p>
    </section>
  `;
}

function renderTeacherPlaceholder(page) {
  const descriptions = {
    subjects: {
      title: 'Mata Pelajaran',
      description: 'Kelola mata pelajaran untuk setiap kelas.',
      icon: 'fa-book-open'
    },
    materials: {
      title: 'Materi Pembelajaran',
      description: 'Buat dan atur materi pembelajaran siswa.',
      icon: 'fa-book'
    },
    questions: {
      title: 'Bank Soal',
      description: 'Susun soal untuk latihan dan kuis interaktif.',
      icon: 'fa-clipboard-list'
    },
    results: {
      title: 'Hasil Siswa',
      description: 'Pantau nilai dan riwayat pengerjaan siswa.',
      icon: 'fa-chart-column'
    }
  };

  const selected = descriptions[page];

  if (!selected) {
    return renderTeacherDashboard();
  }

  return `
    <section class="teacher-heading">
      <span class="eyebrow">
        Pengelolaan Habel-Kidz
      </span>

      <h1>${selected.title}</h1>

      <p>${selected.description}</p>
    </section>

    <div class="empty-state">
      <div style="font-size:35px;color:#818cf8;margin-bottom:12px">
        <i class="fa-solid ${selected.icon}"></i>
      </div>

      <h3>Modul sedang disiapkan</h3>

      <p>
        Fitur ${selected.title} akan kita bangun pada tahap berikutnya.
      </p>
    </div>
  `;
}

function renderTeacherSidebar(menus) {
  return `
    <aside class="teacher-sidebar">
      <div class="teacher-sidebar-title">
        Menu Utama
      </div>

      <nav class="teacher-nav">
        ${menus.map((item) => `
          <button
            type="button"
            data-teacher-page="${item.id}"
            class="${state.teacherPage === item.id ? 'active' : ''}"
            ${state.teacherPage === item.id ? 'aria-current="page"' : ''}
          >
            <i class="fa-solid ${item.icon}"></i>
            ${item.label}
          </button>
        `).join('')}
      </nav>
    </aside>
  `;
}

async function renderTeacher() {
  if (!isSupabaseConfigured) {
    appShell(`
      <section class="auth-wrap">
        <div class="auth-card">
          <div class="auth-icon">
            <i class="fa-solid fa-lock"></i>
          </div>

          <h1>Ruang Guru</h1>

          <p>
            Login admin tersedia setelah koneksi Supabase dikonfigurasi.
          </p>

          ${configNotice()}

          <button
            class="btn btn-light btn-block"
            data-action="toggle-mode"
          >
            Kembali ke Mode Siswa
          </button>
        </div>
      </section>
    `);

    return;
  }

  if (!state.user || !state.teacher) {
    renderTeacherLogin();
    return;
  }

  const menus = getTeacherMenus();

  const validPage = menus.some(
    (item) => item.id === state.teacherPage
  );

  if (!validPage) {
    state.teacherPage = 'dashboard';
  }

  const workspace = state.teacherPage === 'dashboard'
    ? renderTeacherDashboard()
    : renderTeacherPlaceholder(state.teacherPage);

  appShell(`
    <div class="teacher-layout">
      ${renderTeacherSidebar(menus)}

      <section class="teacher-workspace">
        ${workspace}
      </section>
    </div>
  `);

  root.querySelectorAll('[data-teacher-page]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        state.teacherPage = button.dataset.teacherPage;
        renderTeacher();
      });
    });

  if (state.teacherPage === 'dashboard') {
    try {
      const summary = await getTeacherSummary();

      const stats = root.querySelector('#teacher-stats');

      if (stats) {
        stats.innerHTML =
          statCard('Kelas', summary.grades, 'fa-school') +
          statCard('Materi', summary.materials, 'fa-book-open') +
          statCard('Soal', summary.questions, 'fa-circle-question') +
          statCard(
            'Percobaan kuis',
            summary.attempts,
            'fa-chart-line'
          );
      }

    } catch (error) {
      const stats = root.querySelector('#teacher-stats');

      if (stats) {
        stats.innerHTML = `
          <div class="notice notice-error">
            ${escapeHtml(error.message)}
          </div>
        `;
      }
    }
  }
}

function statCard(label, value, icon) {
  return `
    <article class="stat-card">
      <span>
        <i class="fa-solid ${icon}"></i>
      </span>

      <div>
        <strong>${value}</strong>
        <small>${label}</small>
      </div>
    </article>
  `;
}

// ========================================
// AUTHENTICATION
// ========================================

async function login(event) {
  event.preventDefault();

  if (state.busy) return;

  state.busy = true;

  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');

  submit.disabled = true;

  submit.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    Memeriksa...
  `;

  try {
    const formData = new FormData(form);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.get('email'),
      password: formData.get('password')
    });

    if (error) throw error;

    const teacher = await getTeacherProfile(data.user.id);

    if (!teacher || !['admin', 'teacher'].includes(teacher.role)) {
      await supabase.auth.signOut();

      throw new Error(
        'Akun berhasil terautentikasi, tetapi belum terdaftar sebagai guru/admin. Hubungi pemilik aplikasi.'
      );
    }

    state.user = data.user;
    state.teacher = teacher;
    state.mode = 'teacher';
    state.teacherPage = 'dashboard';

    await renderTeacher();

    toast('Login berhasil. Selamat bekerja!', 'success');

  } catch (error) {
    toast(error.message || 'Login gagal.', 'error');

    submit.disabled = false;

    submit.innerHTML = `
      <i class="fa-solid fa-right-to-bracket"></i>
      Masuk ke Dashboard
    `;

  } finally {
    state.busy = false;
  }
}

async function logout() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

  } catch (error) {
    toast(`Gagal keluar: ${error.message}`, 'error');
    return;
  }

  state.user = null;
  state.teacher = null;
  state.mode = 'student';
  state.grade = null;
  state.teacherPage = 'dashboard';

  await renderStudent();

  toast('Kamu sudah keluar.', 'success');
}

async function restoreSession() {
  if (!supabase) return;

  const {
    data: { session },
    error
  } = await supabase.auth.getSession();

  if (error || !session?.user) return;

  const teacher = await getTeacherProfile(session.user.id)
    .catch(() => null);

  if (teacher && ['admin', 'teacher'].includes(teacher.role)) {
    state.user = session.user;
    state.teacher = teacher;
  } else {
    await supabase.auth.signOut();
  }
}

// ========================================
// APPLICATION START
// ========================================

async function start() {
  if (supabase) {
    supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        state.user = null;
        state.teacher = null;
      }
    });

    await restoreSession();
  }

  await render();
}

start().catch((error) => {
  appShell(`
    <div class="notice notice-error">
      ${escapeHtml(
        error.message || 'Terjadi kesalahan saat memulai aplikasi.'
      )}
    </div>
  `);
});
