
import './style.css';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';
import {
  getPublicGrades,
  getPublishedMaterials,
  getTeacherProfile,
  getTeacherSummary,
  getTeacherGrades,
  getTeacherSubjects,
  saveSubject,
  deleteSubject,
  getTeacherMaterials,
  saveMaterial,
  deleteMaterial,
  getTeacherQuestions,
  saveQuestion,
  updateQuestionPublication,
  deleteQuestion,
  uploadLearningImage
} from './lib/data.js';

const root = document.querySelector('#app');

const state = {
  mode: 'student',
  user: null,
  teacher: null,
  grade: null,
  busy: false,
  teacherPage: 'dashboard',
  editingSubject: null,
  editingMaterial: null,
  editingQuestion: null,
  questionType: 'mc'
};

const teacherMenus = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-gauge-high' },
  { id: 'subjects', label: 'Mata Pelajaran', icon: 'fa-book' },
  { id: 'materials', label: 'Materi', icon: 'fa-book-open' },
  { id: 'questions', label: 'Bank Soal', icon: 'fa-circle-question' },
  { id: 'results', label: 'Hasil Siswa', icon: 'fa-chart-column' }
];

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
    <div class="cloud cloud-one"><i class="fa-solid fa-cloud"></i></div>
    <div class="cloud cloud-two"><i class="fa-solid fa-cloud"></i></div>

    <header class="topbar">
      <button class="brand" data-action="home" aria-label="Beranda">
        <span class="brand-mark"><i class="fa-solid fa-star"></i></span>
        <span>
          <strong>Habel Kidz</strong>
          <small>Belajar Seru SD & SMP</small>
        </span>
      </button>

      <nav class="nav-actions">
        ${state.user && state.teacher ? `
          <span class="signed-in">
            <i class="fa-solid fa-circle-user"></i>
            ${escapeHtml(state.teacher.display_name || state.user.email)}
          </span>
          <button class="btn btn-light" data-action="logout">Keluar</button>
        ` : ''}

        <button class="btn ${state.mode === 'teacher' ? 'btn-amber' : 'btn-light'}"
          data-action="toggle-mode">
          <i class="fa-solid ${state.mode === 'teacher' ? 'fa-chalkboard-user' : 'fa-graduation-cap'}"></i>
          ${state.mode === 'teacher' ? 'Mode Guru' : 'Mode Siswa'}
        </button>
      </nav>
    </header>

    <main class="main-content">${content}</main>

    <footer>
      🎈 Habel Kidz © 2026 · Belajar Ceria, Kreatif, dan Penuh Warna 🌈
    </footer>

    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  `;

  bindShellActions();
}

function bindShellActions() {
  root.querySelector('[data-action="home"]')?.addEventListener('click', () => {
    state.mode = 'student';
    state.grade = null;
    render();
  });

  root.querySelector('[data-action="toggle-mode"]')?.addEventListener('click', async () => {
    if (state.mode === 'teacher') {
      state.mode = 'student';
      state.grade = null;
      await render();
      return;
    }

    state.mode = 'teacher';
    await render();
  });

  root.querySelector('[data-action="logout"]')?.addEventListener('click', logout);
}

function configNotice() {
  return `
    <div class="notice notice-warn">
      <i class="fa-solid fa-plug-circle-exclamation"></i>
      <div>
        <strong>Supabase belum dihubungkan</strong>
        <p>
          Isi konfigurasi Supabase pada environment variables Netlify.
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

/* =========================================================
   MODE SISWA
========================================================= */

async function renderStudent() {
  appShell(`
    <section class="hero">
      <span class="eyebrow">
        <i class="fa-solid fa-face-smile"></i>
        Selamat datang, teman-teman!
      </span>
      <h1>Belajar jadi lebih <span>seru!</span> 🎈</h1>
      <p>
        Jelajahi materi dan tantang dirimu lewat kuis interaktif
        untuk SD dan SMP.
      </p>
    </section>

    ${!isSupabaseConfigured
      ? configNotice()
      : '<div class="loading-card"><i class="fa-solid fa-spinner fa-spin"></i> Memuat kelas...</div>'}

    <section id="grade-area" class="grade-area"></section>
  `);

  if (!isSupabaseConfigured) return;

  try {
    const grades = await getPublicGrades();
    const area = root.querySelector('#grade-area');

    if (!area) return;

    const sd = grades.filter((grade) => grade.level === 'SD');
    const smp = grades.filter((grade) => grade.level === 'SMP');

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
    const area = root.querySelector('#grade-area');
    if (area) {
      area.innerHTML = `
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
}

function gradeGroup(title, subtitle, grades) {
  return `
    <section class="grade-group">
      <div class="group-heading">
        <div>
          <h2>${title}</h2>
          <p>${subtitle}</p>
        </div>
        <span class="group-count">${grades.length} kelas</span>
      </div>

      <div class="grade-grid">
        ${grades.map((grade) => `
          <button class="grade-card"
            data-grade="${escapeHtml(grade.id)}"
            data-name="${escapeHtml(grade.name)}">
            <span class="grade-number">${escapeHtml(grade.grade_number)}</span>
            <strong>${escapeHtml(grade.name)}</strong>
            <small>Lihat materi <i class="fa-solid fa-arrow-right"></i></small>
          </button>
        `).join('') || '<p class="empty-state">Belum ada kelas aktif.</p>'}
      </div>
    </section>
  `;
}

async function openGrade(gradeId, gradeName) {
  state.grade = { id: gradeId, name: gradeName };

  appShell(`
    <section class="page-heading">
      <button class="btn btn-light" id="back-grades">
        <i class="fa-solid fa-arrow-left"></i> Semua kelas
      </button>
      <span class="eyebrow">${escapeHtml(gradeName)}</span>
      <h1>Materi pembelajaran</h1>
    </section>

    <div id="materials" class="materials-grid">
      <div class="loading-card">
        <i class="fa-solid fa-spinner fa-spin"></i> Memuat materi...
      </div>
    </div>
  `);

  root.querySelector('#back-grades')?.addEventListener('click', () => {
    state.grade = null;
    renderStudent();
  });

  try {
    const materials = await getPublishedMaterials(gradeId);
    const list = root.querySelector('#materials');

    if (!list) return;

    list.innerHTML = materials.map((item) => `
      <article class="material-card">
        <div class="material-icon">
          <i class="fa-solid fa-book-open-reader"></i>
        </div>
        <h3>${escapeHtml(item.title)}</h3>
        <p>
          ${escapeHtml(
            (item.content || '').slice(0, 160) ||
            'Belum ada ringkasan materi.'
          )}
        </p>
      </article>
    `).join('') || `
      <div class="empty-state">
        Belum ada materi yang dipublikasikan untuk kelas ini.
      </div>
    `;
  } catch (error) {
    const list = root.querySelector('#materials');
    if (list) {
      list.innerHTML = `
        <div class="notice notice-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }
  }
}

/* =========================================================
   DASHBOARD GURU
========================================================= */

async function renderTeacher() {
  if (!isSupabaseConfigured) {
    appShell(`
      <section class="auth-wrap">
        <div class="auth-card">
          <div class="auth-icon"><i class="fa-solid fa-lock"></i></div>
          <h1>Ruang Guru</h1>
          <p>Login admin tersedia setelah koneksi Supabase dikonfigurasi.</p>
          ${configNotice()}
          <button class="btn btn-light btn-block" data-action="toggle-mode">
            Kembali ke Mode Siswa
          </button>
        </div>
      </section>
    `);
    return;
  }

  if (!state.user || !state.teacher) {
    renderLogin();
    return;
  }

  const menuHtml = teacherMenus.map((menu) => `
    <button class="teacher-nav-item ${state.teacherPage === menu.id ? 'active' : ''}"
      data-teacher-page="${menu.id}">
      <i class="fa-solid ${menu.icon}"></i>
      <span>${menu.label}</span>
    </button>
  `).join('');

  appShell(`
    <section class="teacher-layout">
      <aside class="teacher-sidebar">
        <div class="teacher-sidebar-heading">
          <span class="eyebrow">RUANG PENGELOLA</span>
          <h2>Panel Guru</h2>
          <p>${escapeHtml(state.teacher.display_name || state.user.email)}</p>
        </div>

        <nav class="teacher-nav">
          ${menuHtml}
        </nav>

        <div class="teacher-sidebar-bottom">
          <button class="teacher-nav-item" data-action="student-view">
            <i class="fa-solid fa-graduation-cap"></i>
            <span>Lihat Mode Siswa</span>
          </button>
        </div>
      </aside>

      <section class="teacher-workspace" id="teacher-workspace">
        <div class="loading-card">
          <i class="fa-solid fa-spinner fa-spin"></i>
          Memuat halaman...
        </div>
      </section>
    </section>
  `);

  root.querySelectorAll('[data-teacher-page]').forEach((button) => {
    button.addEventListener('click', () => {
      state.teacherPage = button.dataset.teacherPage;
      renderTeacher();
    });
  });

  root.querySelector('[data-action="student-view"]')?.addEventListener('click', () => {
    state.mode = 'student';
    renderStudent();
  });

  await renderTeacherPage();
}

function renderLogin() {
  appShell(`
    <section class="auth-wrap">
      <form id="login-form" class="auth-card">
        <div class="auth-icon">
          <i class="fa-solid fa-chalkboard-user"></i>
        </div>
        <span class="eyebrow">Akses khusus pengajar</span>
        <h1>Login Guru</h1>
        <p>Masuk menggunakan akun guru yang dibuat oleh administrator.</p>

        <label>
          Email
          <input name="email" type="email" autocomplete="username"
            required placeholder="nama@sekolah.sch.id">
        </label>

        <label>
          Password
          <input name="password" type="password"
            autocomplete="current-password" required
            placeholder="Masukkan password">
        </label>

        <button class="btn btn-primary btn-block" type="submit">
          <i class="fa-solid fa-right-to-bracket"></i>
          Masuk ke Dashboard
        </button>

        <button class="btn btn-light btn-block" type="button"
          data-action="toggle-mode">
          Kembali ke Mode Siswa
        </button>

        <p class="form-help">
          Pendaftaran publik dinonaktifkan. Akun guru dibuat melalui
          Supabase Auth oleh pemilik proyek.
        </p>
      </form>
    </section>
  `);

  root.querySelector('#login-form')?.addEventListener('submit', login);
}

async function renderTeacherPage() {
  const workspace = root.querySelector('#teacher-workspace');
  if (!workspace) return;

  try {
    switch (state.teacherPage) {
      case 'subjects':
        await renderSubjects(workspace);
        break;
      case 'materials':
        await renderMaterials(workspace);
        break;
      case 'questions':
        await renderQuestions(workspace);
        break;
      case 'results':
        await renderResults(workspace);
        break;
      default:
        await renderDashboard(workspace);
    }
  } catch (error) {
    workspace.innerHTML = `
      <div class="notice notice-error">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <div>
          <strong>Halaman gagal dimuat</strong>
          <p>${escapeHtml(error.message)}</p>
        </div>
      </div>
    `;
  }
}

function pageHeading(title, description, action = '') {
  return `
    <div class="teacher-page-heading">
      <div>
        <span class="eyebrow">PENGELOLAAN HABEL KIDZ</span>
        <h1>${title}</h1>
        <p>${description}</p>
      </div>
      ${action}
    </div>
  `;
}

async function renderDashboard(workspace) {
  workspace.innerHTML = `
    ${pageHeading(
      'Dashboard Guru 👩‍🏫',
      `Halo, ${escapeHtml(state.teacher.display_name || 'Guru')}. Selamat bekerja!`
    )}
    <div class="stats-grid" id="teacher-stats">
      <div class="loading-card">Memuat ringkasan...</div>
    </div>
    <section class="next-panel">
      <h2>Mulai mengelola pembelajaran</h2>
      <p>Pilih menu di samping untuk mengelola konten pembelajaran.</p>
      <div class="next-grid">
        <div>
          <i class="fa-solid fa-book"></i>
          <strong>Mata Pelajaran</strong>
          <p>Atur mata pelajaran pada setiap kelas.</p>
        </div>
        <div>
          <i class="fa-solid fa-book-open"></i>
          <strong>Materi Pembelajaran</strong>
          <p>Susun materi dan publikasikan untuk siswa.</p>
        </div>
        <div>
          <i class="fa-solid fa-list-check"></i>
          <strong>Bank Soal</strong>
          <p>Buat latihan pilihan ganda dan isian singkat.</p>
        </div>
      </div>
    </section>
  `;

  const summary = await getTeacherSummary();
  const stats = workspace.querySelector('#teacher-stats');

  if (stats) {
    stats.innerHTML =
      statCard('Kelas', summary.grades, 'fa-school') +
      statCard('Materi', summary.materials, 'fa-book-open') +
      statCard('Soal', summary.questions, 'fa-circle-question') +
      statCard('Percobaan kuis', summary.attempts, 'fa-chart-line');
  }
}

function statCard(label, value, icon) {
  return `
    <article class="stat-card">
      <span><i class="fa-solid ${icon}"></i></span>
      <div>
        <strong>${Number(value) || 0}</strong>
        <small>${label}</small>
      </div>
    </article>
  `;
}

/* =========================================================
   MATA PELAJARAN
========================================================= */

async function renderSubjects(workspace) {
  const [grades, subjects] = await Promise.all([
    getTeacherGrades(),
    getTeacherSubjects()
  ]);

  workspace.innerHTML = `
    ${pageHeading(
      'Mata Pelajaran',
      'Kelola mata pelajaran untuk setiap kelas.',
      '<button class="btn btn-primary" id="add-subject"><i class="fa-solid fa-plus"></i> Tambah Mata Pelajaran</button>'
    )}

    <div id="subject-form-area"></div>

    <div class="teacher-table-wrap">
      <table class="teacher-table">
        <thead>
          <tr>
            <th>Mata Pelajaran</th>
            <th>Kelas</th>
            <th>Urutan</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${subjects.map((subject) => {
            const grade = grades.find((item) => item.id === subject.grade_id);
            return `
              <tr>
                <td>
                  <strong>${escapeHtml(subject.name)}</strong>
                  <small>${escapeHtml(subject.description || '')}</small>
                </td>
                <td>${escapeHtml(grade?.name || 'Kelas tidak ditemukan')}</td>
                <td>${Number(subject.sort_order) || 0}</td>
                <td>${statusBadge(subject.is_published)}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-light btn-small"
                      data-edit-subject="${subject.id}">Edit</button>
                    <button class="btn btn-danger btn-small"
                      data-delete-subject="${subject.id}">Hapus</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('') || `
            <tr><td colspan="5" class="empty-state">
              Belum ada mata pelajaran. Tambahkan melalui tombol di atas.
            </td></tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  workspace.querySelector('#add-subject')?.addEventListener('click', () => {
    state.editingSubject = null;
    renderSubjectForm(workspace, grades);
  });

  workspace.querySelectorAll('[data-edit-subject]').forEach((button) => {
    button.addEventListener('click', () => {
      const subject = subjects.find((item) => item.id === button.dataset.editSubject);
      state.editingSubject = subject;
      renderSubjectForm(workspace, grades, subject);
    });
  });

  workspace.querySelectorAll('[data-delete-subject]').forEach((button) => {
    button.addEventListener('click', async () => {
      const subject = subjects.find((item) => item.id === button.dataset.deleteSubject);
      if (!subject || !confirm(`Hapus mata pelajaran "${subject.name}"?`)) return;

      try {
        await deleteSubject(subject.id);
        toast('Mata pelajaran berhasil dihapus.', 'success');
        renderTeacher();
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  });
}

function renderSubjectForm(workspace, grades, subject = null) {
  const area = workspace.querySelector('#subject-form-area');
  if (!area) return;

  area.innerHTML = `
    <form id="subject-form" class="teacher-form">
      <h2>${subject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}</h2>

      <label>
        Kelas
        <select name="grade_id" required>
          <option value="">Pilih kelas</option>
          ${grades.map((grade) => `
            <option value="${escapeHtml(grade.id)}"
              ${subject?.grade_id === grade.id ? 'selected' : ''}>
              ${escapeHtml(grade.name)}
            </option>
          `).join('')}
        </select>
      </label>

      <label>
        Nama Mata Pelajaran
        <input name="name" required maxlength="100"
          value="${escapeHtml(subject?.name || '')}"
          placeholder="Contoh: Matematika">
      </label>

      <label>
        Deskripsi
        <textarea name="description" rows="3"
          placeholder="Deskripsi singkat mata pelajaran">${escapeHtml(subject?.description || '')}</textarea>
      </label>

      <label>
        Urutan tampil
        <input name="sort_order" type="number" min="0"
          value="${Number(subject?.sort_order) || 0}">
      </label>

      <label class="teacher-checkbox">
        <input name="is_published" type="checkbox"
          ${subject?.is_published ? 'checked' : ''}>
        Publikasikan mata pelajaran
      </label>

      <div class="form-actions">
        <button class="btn btn-primary" type="submit">Simpan</button>
        <button class="btn btn-light" type="button" id="cancel-subject">Batal</button>
      </div>
    </form>
  `;

  area.querySelector('#cancel-subject')?.addEventListener('click', () => {
    area.innerHTML = '';
    state.editingSubject = null;
  });

  area.querySelector('#subject-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;

    try {
      const data = new FormData(form);

      await saveSubject({
        grade_id: data.get('grade_id'),
        name: String(data.get('name') || '').trim(),
        description: String(data.get('description') || '').trim(),
        sort_order: Number(data.get('sort_order')) || 0,
        is_published: form.elements.is_published.checked
      }, subject?.id || null);

      toast('Mata pelajaran berhasil disimpan.', 'success');
      state.editingSubject = null;
      await renderTeacher();
    } catch (error) {
      toast(error.message, 'error');
      button.disabled = false;
    }
  });

  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =========================================================
   MATERI
========================================================= */

async function renderMaterials(workspace) {
  const [grades, subjects, materials] = await Promise.all([
    getTeacherGrades(),
    getTeacherSubjects(),
    getTeacherMaterials()
  ]);

  workspace.innerHTML = `
    ${pageHeading(
      'Materi Pembelajaran',
      'Buat dan kelola materi yang akan dipelajari siswa.',
      '<button class="btn btn-primary" id="add-material"><i class="fa-solid fa-plus"></i> Tambah Materi</button>'
    )}

    <div id="material-form-area"></div>

    <div class="teacher-table-wrap">
      <table class="teacher-table">
        <thead>
          <tr>
            <th>Judul Materi</th>
            <th>Kelas</th>
            <th>Mata Pelajaran</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${materials.map((material) => {
            const grade = grades.find((item) => item.id === material.grade_id);
            const subject = subjects.find((item) => item.id === material.subject_id);

            return `
              <tr>
                <td><strong>${escapeHtml(material.title)}</strong></td>
                <td>${escapeHtml(grade?.name || '-')}</td>
                <td>${escapeHtml(subject?.name || 'Tanpa mata pelajaran')}</td>
                <td>${statusBadge(material.is_published)}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-light btn-small"
                      data-edit-material="${material.id}">Edit</button>
                    <button class="btn btn-danger btn-small"
                      data-delete-material="${material.id}">Hapus</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('') || `
            <tr><td colspan="5" class="empty-state">
              Belum ada materi pembelajaran.
            </td></tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  workspace.querySelector('#add-material')?.addEventListener('click', () => {
    state.editingMaterial = null;
    renderMaterialForm(workspace, grades, subjects);
  });

  workspace.querySelectorAll('[data-edit-material]').forEach((button) => {
    button.addEventListener('click', () => {
      const material = materials.find((item) => item.id === button.dataset.editMaterial);
      if (material) {
        state.editingMaterial = material;
        renderMaterialForm(workspace, grades, subjects, material);
      }
    });
  });

  workspace.querySelectorAll('[data-delete-material]').forEach((button) => {
    button.addEventListener('click', async () => {
      const material = materials.find((item) => item.id === button.dataset.deleteMaterial);
      if (!material || !confirm(`Hapus materi "${material.title}"?`)) return;

      try {
        await deleteMaterial(material.id);
        toast('Materi berhasil dihapus.', 'success');
        renderTeacher();
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  });
}

function renderMaterialForm(workspace, grades, subjects, material = null) {
  const area = workspace.querySelector('#material-form-area');
  if (!area) return;

  area.innerHTML = `
    <form id="material-form" class="teacher-form">
      <h2>${material ? 'Edit Materi' : 'Tambah Materi'}</h2>

      <label>
        Kelas
        <select name="grade_id" id="material-grade" required>
          <option value="">Pilih kelas</option>
          ${grades.map((grade) => `
            <option value="${escapeHtml(grade.id)}"
              ${material?.grade_id === grade.id ? 'selected' : ''}>
              ${escapeHtml(grade.name)}
            </option>
          `).join('')}
        </select>
      </label>

      <label>
        Mata Pelajaran
        <select name="subject_id" id="material-subject">
          <option value="">Tanpa mata pelajaran</option>
          ${subjects.map((subject) => `
            <option value="${escapeHtml(subject.id)}"
              data-grade="${escapeHtml(subject.grade_id)}"
              ${material?.subject_id === subject.id ? 'selected' : ''}>
              ${escapeHtml(subject.name)}
            </option>
          `).join('')}
        </select>
      </label>

      <label>
        Judul Materi
        <input name="title" required maxlength="180"
          value="${escapeHtml(material?.title || '')}"
          placeholder="Contoh: Mengenal Bilangan">
      </label>

      <label>
        Isi Materi
        <textarea name="content" rows="8"
          placeholder="Tuliskan isi materi pembelajaran...">${escapeHtml(material?.content || '')}</textarea>
      </label>

      <label>
        Gambar Materi (opsional)
        <input name="image" type="file" accept="image/*">
      </label>

      ${material?.image_path ? `
        <p class="form-help">
          Gambar saat ini sudah tersimpan. Pilih gambar baru jika ingin menggantinya.
        </p>
      ` : ''}

      <label class="teacher-checkbox">
        <input name="is_published" type="checkbox"
          ${material?.is_published ? 'checked' : ''}>
        Publikasikan materi untuk siswa
      </label>

      <div class="form-actions">
        <button class="btn btn-primary" type="submit">Simpan Materi</button>
        <button class="btn btn-light" type="button" id="cancel-material">Batal</button>
      </div>
    </form>
  `;

  const gradeSelect = area.querySelector('#material-grade');
  const subjectSelect = area.querySelector('#material-subject');

  function filterSubjects() {
    const selectedGrade = gradeSelect.value;

    [...subjectSelect.options].forEach((option) => {
      if (!option.value) return;
      option.hidden = option.dataset.grade !== selectedGrade;
    });

    const selectedOption = subjectSelect.selectedOptions[0];
    if (selectedOption?.value && selectedOption.dataset.grade !== selectedGrade) {
      subjectSelect.value = '';
    }
  }

  gradeSelect.addEventListener('change', filterSubjects);
  filterSubjects();

  area.querySelector('#cancel-material')?.addEventListener('click', () => {
    area.innerHTML = '';
    state.editingMaterial = null;
  });

  area.querySelector('#material-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

    try {
      const data = new FormData(form);
      let imagePath = material?.image_path || null;
      const imageFile = form.elements.image.files[0];

      if (imageFile) {
        imagePath = await uploadLearningImage(imageFile, 'materials');
      }

      await saveMaterial({
        grade_id: data.get('grade_id'),
        subject_id: data.get('subject_id') || null,
        title: String(data.get('title') || '').trim(),
        content: String(data.get('content') || ''),
        image_path: imagePath,
        is_published: form.elements.is_published.checked
      }, material?.id || null);

      toast('Materi berhasil disimpan.', 'success');
      state.editingMaterial = null;
      await renderTeacher();
    } catch (error) {
      toast(error.message, 'error');
      button.disabled = false;
      button.textContent = 'Simpan Materi';
    }
  });

  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =========================================================
   BANK SOAL
========================================================= */

async function renderQuestions(workspace) {
  const [materials, questions] = await Promise.all([
    getTeacherMaterials(),
    getTeacherQuestions()
  ]);

  workspace.innerHTML = `
    ${pageHeading(
      'Bank Soal',
      'Buat soal pilihan ganda atau isian singkat untuk materi.',
      '<button class="btn btn-primary" id="add-question"><i class="fa-solid fa-plus"></i> Tambah Soal</button>'
    )}

    <div id="question-form-area"></div>

    <div class="teacher-table-wrap">
      <table class="teacher-table">
        <thead>
          <tr>
            <th>Pertanyaan</th>
            <th>Materi</th>
            <th>Tipe</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${questions.map((question) => {
            const material = materials.find((item) => item.id === question.material_id);

            return `
              <tr>
                <td>
                  <strong>${escapeHtml(question.prompt)}</strong>
                </td>
                <td>${escapeHtml(material?.title || '-')}</td>
                <td>${question.type === 'mc' ? 'Pilihan ganda' : 'Isian singkat'}</td>
                <td>${statusBadge(question.is_published)}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-light btn-small"
                      data-edit-question="${question.id}">Edit</button>
                    <button class="btn btn-light btn-small"
                      data-toggle-question="${question.id}"
                      data-published="${question.is_published}">
                      ${question.is_published ? 'Tarik' : 'Publikasikan'}
                    </button>
                    <button class="btn btn-danger btn-small"
                      data-delete-question="${question.id}">Hapus</button>
                  </div>
                </td>
              </tr>
            `;
          }).join('') || `
            <tr><td colspan="5" class="empty-state">
              Belum ada soal. Tambahkan soal melalui tombol di atas.
            </td></tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  workspace.querySelector('#add-question')?.addEventListener('click', () => {
    state.editingQuestion = null;
    state.questionType = 'mc';
    renderQuestionForm(workspace, materials);
  });

  workspace.querySelectorAll('[data-edit-question]').forEach((button) => {
    button.addEventListener('click', () => {
      const question = questions.find((item) => item.id === button.dataset.editQuestion);
      if (!question) return;

      state.editingQuestion = question;
      state.questionType = question.type;
      renderQuestionForm(workspace, materials, question);
    });
  });

  workspace.querySelectorAll('[data-toggle-question]').forEach((button) => {
    button.addEventListener('click', async () => {
      const question = questions.find((item) => item.id === button.dataset.toggleQuestion);
      if (!question) return;

      const nextStatus = button.dataset.published !== 'true';

      try {
        await updateQuestionPublication(question.id, nextStatus);
        toast(
          nextStatus ? 'Soal berhasil dipublikasikan.' : 'Publikasi soal ditarik.',
          'success'
        );
        renderTeacher();
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  });

  workspace.querySelectorAll('[data-delete-question]').forEach((button) => {
    button.addEventListener('click', async () => {
      const question = questions.find((item) => item.id === button.dataset.deleteQuestion);
      if (!question || !confirm('Hapus soal ini?')) return;

      try {
        await deleteQuestion(question.id);
        toast('Soal berhasil dihapus.', 'success');
        renderTeacher();
      } catch (error) {
        toast(error.message, 'error');
      }
    });
  });
}

function renderQuestionForm(workspace, materials, question = null) {
  const area = workspace.querySelector('#question-form-area');
  if (!area) return;

  const options = ['A', 'B', 'C', 'D'];

  area.innerHTML = `
    <form id="question-form" class="teacher-form">
      <h2>${question ? 'Edit Soal' : 'Tambah Soal'}</h2>

      <label>
        Materi
        <select name="material_id" required>
          <option value="">Pilih materi</option>
          ${materials.map((material) => `
            <option value="${escapeHtml(material.id)}"
              ${question?.material_id === material.id ? 'selected' : ''}>
              ${escapeHtml(material.title)}
            </option>
          `).join('')}
        </select>
      </label>

      <label>
        Tipe Soal
        <select name="type" id="question-type">
          <option value="mc" ${state.questionType === 'mc' ? 'selected' : ''}>
            Pilihan Ganda
          </option>
          <option value="short" ${state.questionType === 'short' ? 'selected' : ''}>
            Isian Singkat
          </option>
        </select>
      </label>

      <label>
        Pertanyaan
        <textarea name="prompt" rows="4" required
          placeholder="Tuliskan pertanyaan...">${escapeHtml(question?.prompt || '')}</textarea>
      </label>

      <label>
        Gambar Pertanyaan (opsional)
        <input name="image" type="file" accept="image/*">
      </label>

      ${question?.image_path ? `
        <p class="form-help">
          Gambar saat ini sudah tersimpan. Pilih gambar baru jika ingin menggantinya.
        </p>
      ` : ''}

      <div id="question-answer-area"></div>

      <label class="teacher-checkbox">
        <input name="is_published" type="checkbox"
          ${question?.is_published ? 'checked' : ''}>
        Publikasikan soal
      </label>

      <div class="form-actions">
        <button class="btn btn-primary" type="submit">Simpan Soal</button>
        <button class="btn btn-light" type="button" id="cancel-question">Batal</button>
      </div>
    </form>
  `;

  const typeSelect = area.querySelector('#question-type');
  const answerArea = area.querySelector('#question-answer-area');

  function renderAnswerFields() {
    if (typeSelect.value === 'mc') {
      answerArea.innerHTML = `
        <h3>Pilihan Jawaban</h3>
        <p class="form-help">Isi pilihan A sampai D, kemudian tentukan jawaban yang benar.</p>

        ${options.map((label) => {
          const existing = question?.options?.find((option) => option.label === label);

          return `
            <label>
              Pilihan ${label}
              <input name="option_${label}" required
                value="${escapeHtml(existing?.option_text || '')}"
                placeholder="Isi pilihan ${label}">
            </label>
          `;
        }).join('')}

        <label>
          Kunci Jawaban
          <select name="correct_option_label" required>
            <option value="">Pilih jawaban benar</option>
            ${options.map((label) => `
              <option value="${label}"
                ${(question?.answer_key?.correct_option_label === label ||
                  question?.correct_option_label === label) ? 'selected' : ''}>
                ${label}
              </option>
            `).join('')}
          </select>
        </label>
      `;
    } else {
      answerArea.innerHTML = `
        <h3>Jawaban Benar</h3>
        <label>
          Jawaban yang diterima
          <input name="accepted_answer" required
            value="${escapeHtml(question?.answer_key?.accepted_answer || '')}"
            placeholder="Contoh: Jakarta">
        </label>
        <p class="form-help">
          Jawaban siswa akan diperiksa berdasarkan jawaban yang kamu masukkan.
        </p>
      `;
    }
  }

  typeSelect.addEventListener('change', renderAnswerFields);
  renderAnswerFields();

  area.querySelector('#cancel-question')?.addEventListener('click', () => {
    area.innerHTML = '';
    state.editingQuestion = null;
  });

  area.querySelector('#question-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan...';

    try {
      const data = new FormData(form);
      let imagePath = question?.image_path || null;
      const imageFile = form.elements.image.files[0];

      if (imageFile) {
        imagePath = await uploadLearningImage(imageFile, 'questions');
      }

      const type = data.get('type');

      const payload = {
        material_id: data.get('material_id'),
        type,
        prompt: String(data.get('prompt') || '').trim(),
        image_path: imagePath,
        is_published: form.elements.is_published.checked
      };

      if (type === 'mc') {
        payload.options = options.map((label, index) => ({
          label,
          option_text: String(data.get(`option_${label}`) || '').trim(),
          sort_order: index
        }));

        payload.correctOptionLabel = data.get('correct_option_label');
      } else {
        payload.accepted_answer = String(data.get('accepted_answer') || '').trim();
      }

      await saveQuestion(payload, question?.id || null);

      toast('Soal berhasil disimpan.', 'success');
      state.editingQuestion = null;
      await renderTeacher();
    } catch (error) {
      toast(error.message, 'error');
      button.disabled = false;
      button.textContent = 'Simpan Soal';
    }
  });

  area.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =========================================================
   HASIL SISWA
========================================================= */

async function renderResults(workspace) {
  const summary = await getTeacherSummary();

  workspace.innerHTML = `
    ${pageHeading(
      'Hasil Siswa',
      'Ringkasan aktivitas pengerjaan kuis siswa.'
    )}

    <div class="stats-grid">
      ${statCard('Percobaan kuis', summary.attempts, 'fa-chart-line')}
      ${statCard('Materi tersedia', summary.materials, 'fa-book-open')}
      ${statCard('Total soal', summary.questions, 'fa-circle-question')}
    </div>

    <div class="notice notice-info">
      <i class="fa-solid fa-circle-info"></i>
      <div>
        <strong>Ringkasan aktivitas</strong>
        <p>
          Data percobaan kuis sudah tersedia di database.
          Tabel detail nilai, nama siswa, dan riwayat jawaban
          akan dibuat pada tahap rekap hasil berikutnya.
        </p>
      </div>
    </div>
  `;
}

/* =========================================================
   UTILITAS
========================================================= */

function statusBadge(published) {
  return published
    ? '<span class="status-badge published">Dipublikasikan</span>'
    : '<span class="status-badge draft">Draft</span>';
}

/* =========================================================
   LOGIN, LOGOUT, SESSION
========================================================= */

async function login(event) {
  event.preventDefault();
  if (state.busy) return;

  state.busy = true;

  const form = event.currentTarget;
  const submit = form.querySelector('button[type="submit"]');

  submit.disabled = true;
  submit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Memeriksa...';

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
        'Akun berhasil terautentikasi, tetapi belum terdaftar sebagai guru/admin.'
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
    submit.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Masuk ke Dashboard';
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

  const teacher = await getTeacherProfile(session.user.id).catch(() => null);

  if (teacher && ['admin', 'teacher'].includes(teacher.role)) {
    state.user = session.user;
    state.teacher = teacher;
  } else {
    await supabase.auth.signOut();
  }
}

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
      ${escapeHtml(error.message || 'Terjadi kesalahan saat memulai aplikasi.')}
    </div>
  `);
});
