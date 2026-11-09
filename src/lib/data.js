
import { supabase } from './supabase.js';

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi.');
  }
}

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

export async function getTeacherGrades() {
  ensureSupabase();

  const { data, error } = await supabase
    .from('grades')
    .select('id, name, level, grade_number, sort_order, is_active')
    .order('sort_order');

  if (error) throw error;
  return data ?? [];
}

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

export async function getTeacherSubjects(gradeId = null) {
  ensureSupabase();

  let query = supabase
    .from('subjects')
    .select('id, grade_id, name, description, sort_order, is_published')
    .order('sort_order');

  if (gradeId) query = query.eq('grade_id', gradeId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function saveSubject(payload, id = null) {
  ensureSupabase();

  const query = id
    ? supabase.from('subjects').update(payload).eq('id', id)
    : supabase.from('subjects').insert(payload);

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function deleteSubject(id) {
  ensureSupabase();

  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getPublishedMaterials(gradeId) {
  ensureSupabase();

  const { data, error } = await supabase
    .from('materials')
    .select('id, grade_id, subject_id, title, content, image_path, created_at')
    .eq('grade_id', gradeId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

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
      subjects(name),
      grades(name)
    `)
    .order('created_at', { ascending: false });

  if (filters.gradeId) query = query.eq('grade_id', filters.gradeId);
  if (filters.subjectId) query = query.eq('subject_id', filters.subjectId);

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function saveMaterial(payload, id = null) {
  ensureSupabase();

  const query = id
    ? supabase.from('materials').update(payload).eq('id', id)
    : supabase.from('materials').insert(payload);

  const { data, error } = await query.select().single();

  if (error) throw error;
  return data;
}

export async function deleteMaterial(id) {
  ensureSupabase();

  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function getTeacherQuestions(materialId = null) {
  ensureSupabase();

  let query = supabase
    .from('questions')
    .select(`
      id,
      material_id,
      type,
      prompt,
      sort_order,
      is_published,
      created_at,
      question_options (
        id,
        label,
        option_text,
        sort_order
      )
    `)
    .order('sort_order');

  if (materialId) query = query.eq('material_id', materialId);

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

export async function saveQuestion(payload) {
  ensureSupabase();

  const {
    materialId,
    type,
    prompt,
    options = [],
    correctOptionIndex = null,
    acceptedAnswer = null,
    isPublished = false
  } = payload;

  if (!materialId || !prompt?.trim()) {
    throw new Error('Materi dan pertanyaan wajib diisi.');
  }

  if (!['mc', 'short'].includes(type)) {
    throw new Error('Jenis soal tidak valid.');
  }

  if (type === 'mc') {
    if (
      options.length !== 4 ||
      options.some((option) => !option.trim()) ||
      !Number.isInteger(correctOptionIndex) ||
      correctOptionIndex < 0 ||
      correctOptionIndex > 3
    ) {
      throw new Error('Lengkapi empat pilihan jawaban dan tentukan kunci jawaban.');
    }
  }

  if (type === 'short' && !acceptedAnswer?.trim()) {
    throw new Error('Kunci jawaban isian singkat wajib diisi.');
  }

  // 1. Simpan soal sebagai draft terlebih dahulu.
  const { data: question, error: questionError } = await supabase
    .from('questions')
    .insert({
      material_id: materialId,
      type,
      prompt: prompt.trim(),
      is_published: false
    })
    .select()
    .single();

  if (questionError) throw questionError;

  try {
    let keyPayload;

    if (type === 'mc') {
      const optionRows = options.map((option, index) => ({
        question_id: question.id,
        label: ['A', 'B', 'C', 'D'][index],
        option_text: option.trim(),
        sort_order: index
      }));

      // 2. Simpan pilihan jawaban.
      const { data: savedOptions, error: optionError } = await supabase
        .from('question_options')
        .insert(optionRows)
        .select('id, label');

      if (optionError) throw optionError;

      const correctOption = savedOptions.find(
        (option) => option.label === ['A', 'B', 'C', 'D'][correctOptionIndex]
      );

      if (!correctOption) {
        throw new Error('Kunci jawaban tidak berhasil ditemukan.');
      }

      keyPayload = {
        question_id: question.id,
        correct_option_id: correctOption.id,
        accepted_answer: null
      };
    } else {
      keyPayload = {
        question_id: question.id,
        correct_option_id: null,
        accepted_answer: acceptedAnswer.trim()
      };
    }

    // 3. Simpan kunci jawaban secara terpisah.
    const { error: keyError } = await supabase
      .from('question_keys')
      .insert(keyPayload);

    if (keyError) throw keyError;

    // 4. Publikasikan hanya setelah seluruh data berhasil disimpan.
    if (isPublished) {
      const { error: publishError } = await supabase
        .from('questions')
        .update({ is_published: true })
        .eq('id', question.id);

      if (publishError) throw publishError;
    }

    return question;

  } catch (error) {
    // Bersihkan soal yang gagal disimpan secara lengkap.
    await supabase
      .from('questions')
      .delete()
      .eq('id', question.id);

    throw error;
  }
}

export async function updateQuestionPublication(id, isPublished) {
  ensureSupabase();

  const { error } = await supabase
    .from('questions')
    .update({ is_published: isPublished })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteQuestion(id) {
  ensureSupabase();

  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

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
    supabase.from('grades').select('id', { count: 'exact', head: true }),
    supabase.from('materials').select('id', { count: 'exact', head: true }),
    supabase.from('questions').select('id', { count: 'exact', head: true }),
    supabase.from('quiz_attempts').select('id', { count: 'exact', head: true })
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

export async function getPublishedQuestions(materialId) {
  ensureSupabase();

  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, type, prompt, image_path, sort_order')
    .eq('material_id', materialId)
    .eq('is_published', true)
    .order('sort_order');

  if (error) throw error;
  if (!questions?.length) return [];

  const ids = questions.map((question) => question.id);

  const { data: options, error: optionsError } = await supabase
    .from('question_options')
    .select('id, question_id, label, option_text, image_path, sort_order')
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

export async function uploadLearningImage(file, folder = 'materials') {
  ensureSupabase();

  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    throw new Error('Pilih file gambar yang valid.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran gambar maksimal 5 MB.');
  }

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.-]+/g, '-');
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
