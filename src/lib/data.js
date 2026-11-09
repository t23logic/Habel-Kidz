import { supabase } from './supabase.js';

export async function getPublicGrades() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi. Isi file .env.local terlebih dahulu.');
  const { data, error } = await supabase
    .from('grades')
    .select('id, name, level, grade_number, sort_order')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function getPublishedSubjects(gradeId) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');

  const { data, error } = await supabase
    .from('subjects')
    .select('id, name, description, sort_order')
    .eq('grade_id', gradeId)
    .eq('is_published', true)
    .order('sort_order');

  if (error) throw error;
  return data ?? [];
}

export async function getPublishedMaterials(gradeId) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase
    .from('materials')
    .select('id, title, content, image_path, created_at')
    .eq('grade_id', gradeId)
    .eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTeacherProfile(userId) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase
    .from('teacher_profiles')
    .select('user_id, display_name, role')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTeacherSummary() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const [grades, materials, questions, attempts] = await Promise.all([
    supabase.from('grades').select('id', { count: 'exact', head: true }),
    supabase.from('materials').select('id', { count: 'exact', head: true }),
    supabase.from('questions').select('id', { count: 'exact', head: true }),
    supabase.from('quiz_attempts').select('id', { count: 'exact', head: true }),
  ]);
  for (const result of [grades, materials, questions, attempts]) {
    if (result.error) throw result.error;
  }
  return {
    grades: grades.count ?? 0,
    materials: materials.count ?? 0,
    questions: questions.count ?? 0,
    attempts: attempts.count ?? 0,
  };
}


export async function getPublishedQuestions(materialId) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
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
    options: byQuestion.get(question.id) ?? [],
  }));
}

export async function submitQuiz(materialId, studentName, answers) {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase.rpc('submit_quiz', {
    p_material_id: materialId,
    p_student_name: studentName || null,
    p_answers: answers,
  });
  if (error) throw error;
  return data;
}

export async function uploadLearningImage(file, folder = 'materials') {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
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
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('habel-kidz-media').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}
