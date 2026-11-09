
import { supabase } from './supabase.js';

// ========================================
// GENERAL
// ========================================

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.');
  }
}

// ========================================
// GRADES
// ========================================

// Kelas yang dapat dilihat siswa.
export async function getPublicGrades() {
  ensureSupabase();

  const { data, error } = await supabase
    .from('grades')
    .select('id, name, level, grade_number, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return data ?? [];
}

// Kelas untuk pengelolaan guru.
export async function getTeacherGrades() {
  ensureSupabase();

  const { data, error } = await supabase
    .from('grades')
    .select('id, name, level, grade_number, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  if (error) throw error;
  return data ?? [];
}

// ========================================
// SUBJECTS
// ========================================

// Mata pelajaran yang dipublikasikan.
export async function getPublishedSubjects(gradeId) {
  ensureSupabase();

  const { data, error } = await supabase
    .from('subjects')
    .select('id, grade_id, name, description, sort_order')
    .eq('grade_id', gradeId)
    .eq('is_published', true)
    .order('sort_order');

  if (error) throw error;
  return data ?? [];
}

// Semua mata pelajaran untuk guru.
export async function getTeacherSubjects(gradeId = null) {
  ensureSupabase();

  let query = supabase
    .from('subjects')
    .select(`
      id,
      grade_id,
      name,
      description,
      sort_order,
      is_published,
      created_at
    `)
    .order('sort_order')
    .order('name');

  if (gradeId) {
    query = query.eq('grade_id', gradeId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

// Tambah atau edit mata pelajaran.
export async function saveSubject(payload, id = null) {
  ensureSupabase();

  const values = {
    grade_id: payload.grade_id,
    name: String(payload.name ?? '').trim(),
    description: String(payload.description ?? '').trim(),
    sort_order: Number(payload.sort_order ?? 0),
    is_published: Boolean(payload.is_published)
  };

  if (!values.grade_id || !values.name) {
    throw new Error('Kelas dan nama mata pelajaran wajib diisi.');
  }

  let query;

  if (id) {
    query = supabase
      .from('subjects')
      .update(values)
      .eq('id', id);
  } else {
    query = supabase
      .from('subjects')
      .insert(values);
  }

  const { data, error } = await query
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Hapus mata pelajaran.
export async function deleteSubject(id) {
  ensureSupabase();

  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ========================================
// MATERIALS
// ========================================

// Materi yang dipublikasikan untuk siswa.
export async function getPublishedMaterials(gradeId) {
  ensureSupabase();

  const { data, error } = await supabase
    .from('materials')
    .select(`
      id,
      grade_id,
      subject_id,
      title,
      content,
      image_path,
      created_at
    `)
    .eq('grade_id', gradeId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

// Semua materi untuk guru.
export async function getTeacherMaterials(filters = {}) {
  ensureSupabase();

  let query = supabase
    .from('materials')
    .select(`
      id,
      grade_id,
      subject_id,
      title,
      content,
      image_path,
      is_published,
      created_at,
      updated_at,
      subjects(name),
      grades(name)
    `)
    .order('created_at', { ascending: false });

  if (filters.gradeId) {
    query = query.eq('grade_id', filters.gradeId);
  }

  if (filters.subjectId) {
    query = query.eq('subject_id', filters.subjectId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

// Tambah atau edit materi.
export async function saveMaterial(payload, id = null) {
  ensureSupabase();

  const values = {
    grade_id: payload.grade_id,
    subject_id: payload.subject_id || null,
    title: String(payload.title ?? '').trim(),
    content: String(payload.content ?? '').trim(),
    image_path: payload.image_path || null,
    is_published: Boolean(payload.is_published)
  };

  if (!values.grade_id || !values.title) {
    throw new Error('Kelas dan judul materi wajib diisi.');
  }

  let query;

  if (id) {
    query = supabase
      .from('materials')
      .update(values)
      .eq('id', id);
  } else {
    query = supabase
      .from('materials')
      .insert(values);
  }

  const { data, error } = await query
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Hapus materi.
export async function deleteMaterial(id) {
  ensureSupabase();

  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ========================================
// QUESTIONS
// ========================================

// Semua soal untuk pengelolaan guru.
// Kunci jawaban hanya diambil melalui akses guru.
export async function getTeacherQuestions(materialId = null) {
  ensureSupabase();

  let query = supabase
    .from('questions')
    .select(`
      id,
      material_id,
      type,
      prompt,
      image_path,
      sort_order,
      is_published,
      created_at
    `)
    .order('sort_order');

  if (materialId) {
    query = query.eq('material_id', materialId);
  }

  const { data: questions, error } = await query;

  if (error) throw error;
  if (!questions?.length) return [];

  const ids = questions.map((item) => item.id);

  const [optionsResult, keysResult] = await Promise.all([
    supabase
      .from('question_options')
      .select(`
        id,
        question_id,
        label,
        option_text,
        image_path,
        sort_order
      `)
      .in('question_id', ids)
      .order('sort_order'),

    supabase
      .from('question_keys')
      .select(`
        question_id,
        correct_option_id,
        accepted_answer
      `)
      .in('question_id', ids)
  ]);

  if (optionsResult.error) throw optionsResult.error;
  if (keysResult.error) throw keysResult.error;

  const optionsByQuestion = new Map();
  const keysByQuestion = new Map();

  for (const option of optionsResult.data ?? []) {
    const group = optionsByQuestion.get(option.question_id) ?? [];
    group.push(option);
    optionsByQuestion.set(option.question_id, group);
  }

  for (const key of keysResult.data ?? []) {
    keysByQuestion.set(key.question_id, key);
  }

  return questions.map((question) => ({
    ...question,
    options: optionsByQuestion.get(question.id) ?? [],
    answer_key: keysByQuestion.get(question.id) ?? null
  }));
}

// Tambah atau edit soal.
//
// Payload pilihan ganda:
// {
//   material_id,
//   type: 'mc',
//   prompt,
//   image_path,
//   options: [
//     { label: 'A', option_text: '...' },
//     { label: 'B', option_text: '...' },
//     { label: 'C', option_text: '...' },
//     { label: 'D', option_text: '...' }
//   ],
//   correctOptionLabel: 'A',
//   is_published
// }
//
// Payload isian singkat:
// {
//   material_id,
//   type: 'short',
//   prompt,
//   accepted_answer,
//   is_published
// }

export async function saveQuestion(payload, id = null) {
  ensureSupabase();

  const type = payload.type;
  const prompt = String(payload.prompt ?? '').trim();

  if (!payload.material_id || !prompt) {
    throw new Error('Materi dan pertanyaan wajib diisi.');
  }

  if (!['mc', 'short'].includes(type)) {
    throw new Error('Tipe soal tidak valid.');
  }

  const values = {
    material_id: payload.material_id,
    type,
    prompt,
    image_path: payload.image_path || null,
    is_published: false
  };

  if (id) {
    const { error } = await supabase
      .from('questions')
      .update(values)
      .eq('id', id);

    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from('questions')
      .insert(values)
      .select('id')
      .single();

    if (error) throw error;
    id = data.id;
  }

  try {
    // Hapus kunci lama sebelum memperbarui pilihan.
    const { error: oldKeyError } = await supabase
      .from('question_keys')
      .delete()
      .eq('question_id', id);

    if (oldKeyError) throw oldKeyError;

    if (type === 'mc') {
      const labels = ['A', 'B', 'C', 'D'];
      const options = payload.options ?? [];

      const normalizedOptions = labels.map((label, index) => {
        const option = options.find((item) => item.label === label)
          ?? options[index];

        return {
          question_id: id,
          label,
          option_text: String(option?.option_text ?? '').trim(),
          image_path: option?.image_path || null,
          sort_order: index
        };
      });

      if (normalizedOptions.some((item) => !item.option_text)) {
        throw new Error('Semua pilihan jawaban A sampai D wajib diisi.');
      }

      const correctLabel = String(
        payload.correctOptionLabel
        ?? payload.correct_option_label
        ?? ''
      ).toUpperCase();

      if (!labels.includes(correctLabel)) {
        throw new Error('Pilih satu jawaban yang benar.');
      }

      const { data: savedOptions, error: optionsError } = await supabase
        .from('question_options')
        .upsert(normalizedOptions, {
          onConflict: 'question_id,label'
        })
        .select('id, label');

      if (optionsError) throw optionsError;

      const correctOption = savedOptions.find(
        (option) => option.label === correctLabel
      );

      if (!correctOption) {
        throw new Error('Pilihan jawaban benar tidak ditemukan.');
      }

      const { error: keyError } = await supabase
        .from('question_keys')
        .insert({
          question_id: id,
          correct_option_id: correctOption.id,
          accepted_answer: null
        });

      if (keyError) throw keyError;

    } else {
      const acceptedAnswer = String(
        payload.accepted_answer ?? ''
      ).trim();

      if (!acceptedAnswer) {
        throw new Error('Kunci jawaban isian singkat wajib diisi.');
      }

      // Soal isian tidak menggunakan pilihan A-D.
      const { error: deleteOptionsError } = await supabase
        .from('question_options')
        .delete()
        .eq('question_id', id);

      if (deleteOptionsError) throw deleteOptionsError;

      const { error: keyError } = await supabase
        .from('question_keys')
        .insert({
          question_id: id,
          correct_option_id: null,
          accepted_answer: acceptedAnswer
        });

      if (keyError) throw keyError;
    }

    // Publikasikan hanya setelah kunci jawaban berhasil disimpan.
    const { data, error: publishError } = await supabase
      .from('questions')
      .update({
        is_published: Boolean(payload.is_published)
      })
      .eq('id', id)
      .select()
      .single();

    if (publishError) throw publishError;

    return data;

  } catch (error) {
    // Soal tetap tidak dipublikasikan jika proses penyimpanan gagal.
    await supabase
      .from('questions')
      .update({ is_published: false })
      .eq('id', id);

    throw error;
  }
}

// Ubah status publikasi soal.
export async function updateQuestionPublication(id, isPublished) {
  ensureSupabase();

  const { data, error } = await supabase
    .from('questions')
    .update({ is_published: Boolean(isPublished) })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Hapus soal.
export async function deleteQuestion(id) {
  ensureSupabase();

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

// ========================================
// TEACHER PROFILE & DASHBOARD
// ========================================

export async function getTeacherProfile(userId) {
  ensureSupabase();

  const { data, error } = await supabase
    .from('teacher_profiles')
    .select('user_id, display_name, role')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getTeacherSummary() {
  ensureSupabase();

  const [grades, materials, questions, attempts] = await Promise.all([
    supabase
      .from('grades')
      .select('id', { count: 'exact', head: true }),

    supabase
      .from('materials')
      .select('id', { count: 'exact', head: true }),

    supabase
      .from('questions')
      .select('id', { count: 'exact', head: true }),

    supabase
      .from('quiz_attempts')
      .select('id', { count: 'exact', head: true })
  ]);

  for (const result of [grades, materials, questions, attempts]) {
    if (result.error) throw result.error;
  }

  return {
    grades: grades.count ?? 0,
    materials: materials.count ?? 0,
    questions: questions.count ?? 0,
    attempts: attempts.count ?? 0
  };
}

// ========================================
// STUDENT QUIZ
// ========================================

export async function getPublishedQuestions(materialId) {
  ensureSupabase();

  const { data: questions, error } = await supabase
    .from('questions')
    .select(`
      id,
      type,
      prompt,
      image_path,
      sort_order
    `)
    .eq('material_id', materialId)
    .eq('is_published', true)
    .order('sort_order');

  if (error) throw error;
  if (!questions?.length) return [];

  const ids = questions.map((question) => question.id);

  const { data: options, error: optionsError } = await supabase
    .from('question_options')
    .select(`
      id,
      question_id,
      label,
      option_text,
      image_path,
      sort_order
    `)
    .in('question_id', ids)
    .order('sort_order');

  if (optionsError) throw optionsError;

  const byQuestion = new Map();

  for (const option of options ?? []) {
    const group = byQuestion.get(option.question_id) ?? [];
    group.push(option);
    byQuestion.set(option.question_id, group);
  }

  return questions.map((question) => ({
    ...question,
    options: byQuestion.get(question.id) ?? []
  }));
}

export async function submitQuiz(materialId, studentName, answers) {
  ensureSupabase();

  const { data, error } = await supabase.rpc('submit_quiz', {
    p_material_id: materialId,
    p_student_name: studentName || null,
    p_answers: answers
  });

  if (error) throw error;
  return data;
}

// ========================================
// IMAGE UPLOAD
// ========================================

export async function uploadLearningImage(file, folder = 'materials') {
  ensureSupabase();

  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    throw new Error('Pilih file gambar yang valid.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran gambar maksimal 5 MB.');
  }

  const safeName = file.name
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-');

  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from('habel-kidz-media')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from('habel-kidz-media')
    .getPublicUrl(path);

  return {
    path,
    publicUrl: data.publicUrl
  };
}
